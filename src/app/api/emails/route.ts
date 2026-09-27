import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { MockEmail } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get("pageToken") || undefined;
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.RUN_IN_MOCK_EMAIL === "true") {
    try {
      const countOnly = searchParams.get("countOnly") === "true";
      if (countOnly) {
        const total = await prisma.mockEmail.count();
        return NextResponse.json({ total });
      }

      const skip = pageToken ? parseInt(pageToken, 10) : 0;
      const take = 15;

      const mockEmails = await prisma.mockEmail.findMany({
        skip,
        take,
        orderBy: { id: "asc" },
      });

      const nextSkip = mockEmails.length === take ? skip + take : undefined;

      const formattedMockEmails = mockEmails.map((email: MockEmail) => ({
        id: email.id,
        threadId: email.id,
        subject: email.subject,
        from: email.from,
        to: email.to || "",
        date: email.date || "",
        snippet: email.snippet || "",
        body: email.body,
      }));

      // Query DB for existing classifications for mock emails
      const emailIds = formattedMockEmails.map(m => m.id);
      const existingClassifications = await prisma.classification.findMany({
        where: { email_id: { in: emailIds } },
      });

      const classificationsMap = new Map();
      existingClassifications.forEach(c => {
        classificationsMap.set(c.email_id, {
          category: { value: c.category, probability: 1.0 },
          urgency: { value: `${c.urgency}/5`, probability: 1.0 },
          isUrgentReply: { value: c.needs_reply, probability: 1.0 },
          cost: c.cost || 0,
          _cached: true,
        });
      });

      // Attach classifications to mock emails
      const emailsWithClassifications = formattedMockEmails.map(m => {
        const classification = classificationsMap.get(m.id);
        return classification ? { ...m, classification } : m;
      });

      return NextResponse.json({
        emails: emailsWithClassifications,
        nextPageToken: nextSkip ? nextSkip.toString() : undefined,
      });
    } catch (error: any) {
      console.error("Error fetching mock emails:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: (session as any).accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const countOnly = searchParams.get("countOnly") === "true";
    if (countOnly) {
      const labelsRes = await gmail.users.labels.get({
        userId: "me",
        id: "INBOX",
      });
      return NextResponse.json({ total: labelsRes.data.messagesTotal || 0 });
    }

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 15,
      q: "in:inbox",
      pageToken: pageToken,
    });

    const messages = listRes.data.messages || [];
    
    // Fetch details for each message
    // We will do this in batches of 15 to avoid hitting rate limits too quickly
    const fullMessages: any[] = [];
    const batchSize = 15;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults: any[] = [];
      // Fetch in smaller chunks of 3 with a slight delay to avoid quota limits
      for (let j = 0; j < batch.length; j += 3) {
        const subBatch = batch.slice(j, j + 3);
        const subBatchPromises = subBatch.map((msg) =>
          gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "full",
          })
        );
        const subResults = await Promise.all(subBatchPromises);
        batchResults.push(...subResults);
        
        // Wait 500ms between chunks
        if (j + 3 < batch.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      
      batchResults.forEach((res) => {
        const data = res.data;
        const headers = data.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

        // Extract body
        let body = "";
        if (data.payload?.parts) {
          const textPart = data.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart && textPart.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          } else {
            const htmlPart = data.payload.parts.find((p: any) => p.mimeType === "text/html");
            if (htmlPart && htmlPart.body?.data) {
              body = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
            }
          }
        } else if (data.payload?.body?.data) {
          body = Buffer.from(data.payload.body.data, "base64").toString("utf-8");
        }
        
        fullMessages.push({
          id: data.id,
          threadId: data.threadId,
          subject: getHeader("subject"),
          from: getHeader("from"),
          to: getHeader("to"),
          date: getHeader("date"),
          snippet: data.snippet,
          body: body,
        });
      });
    }

    // Query DB for existing classifications for these emails
    const emailIds = fullMessages.map(m => m.id);
    const existingClassifications = await prisma.classification.findMany({
      where: { email_id: { in: emailIds } },
    });

    const classificationsMap = new Map();
    existingClassifications.forEach(c => {
      classificationsMap.set(c.email_id, {
        category: { value: c.category, probability: 1.0 },
        urgency: { value: `${c.urgency}/5`, probability: 1.0 },
        isUrgentReply: { value: c.needs_reply, probability: 1.0 },
        cost: c.cost || 0,
        _cached: true,
      });
    });

    // Attach classifications to fullMessages
    const emailsWithClassifications = fullMessages.map(m => {
      const classification = classificationsMap.get(m.id);
      return classification ? { ...m, classification } : m;
    });

    return NextResponse.json({ 
      emails: emailsWithClassifications,
      nextPageToken: listRes.data.nextPageToken 
    });
  } catch (error: any) {
    console.error("Error fetching emails:", error);
    const statusCode = error.code || 500;
    return NextResponse.json({ error: error.message }, { status: statusCode });
  }
}

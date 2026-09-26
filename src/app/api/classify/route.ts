import { NextResponse } from "next/server";
import { classifyEmail } from "@/lib/services/email-classifier";

export async function POST(req: Request) {
  try {
    const { email, runId } = await req.json();

    if (!email || !email.body || !email.id) {
      return NextResponse.json({ error: "Missing email data or id" }, { status: 400 });
    }

    const classificationResult = await classifyEmail(email, runId);
    
    return NextResponse.json(classificationResult);
  } catch (error: any) {
    console.error("Classification error:", error);
    const status = error.message.includes("HTTP") ? 502 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

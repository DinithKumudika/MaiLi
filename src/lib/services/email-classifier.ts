import { convert } from "html-to-text";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { upsertEmailRecord, getExistingClassification, saveClassificationRecord } from "@/lib/services/db-service";

export interface EmailPayload {
  id: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  body?: string | Record<string, any>;
}

export interface ClassificationResult {
  category: { value: string; probability: number };
  isUrgentReply: { value: boolean; probability: number };
  urgency: { value: string; probability: number };
  cost: number;
  _cached?: boolean;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL_ID = "jev-latest";

export async function classifyEmail(email: EmailPayload, runId?: string): Promise<ClassificationResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OpenRouter API Key");
  }

  const subject = email.subject || "";
  const from = email.from || "";
  const bodyText = typeof email.body === "string" ? email.body : JSON.stringify(email.body || {});

  // 1. Calculate content hash
  const hashInput = `${subject}${from}${bodyText}`;
  const content_hash = crypto.createHash("sha256").update(hashInput).digest("hex");

  // 2. Upsert Email record
  await upsertEmailRecord(email.id, subject, from, content_hash);

  // 3. Check for existing classification
  const existingClass = await getExistingClassification(email.id, MODEL_ID);

  if (existingClass) {
    return {
      category: { value: existingClass.category, probability: 1.0 },
      isUrgentReply: { value: existingClass.needs_reply, probability: 1.0 },
      urgency: { value: `${existingClass.urgency}/5`, probability: 1.0 },
      cost: existingClass.cost || 0,
      _cached: true,
    };
  }

  // 4. Preprocess body for the model
  const plainTextBody = convert(bodyText, {
    wordwrap: 130,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  });

  const state = `
From: ${from}
To: ${email.to || ""}
Subject: ${subject}
Date: ${email.date || ""}

${plainTextBody.substring(0, 5000)}
  `.trim();

  // 5. Model Inference
  const startTime = Date.now();
  const response = await fetch("https://openrouter.ai/api/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "~typesafe/jev-latest",
      state: state,
      questions: {
        category: {
          type: "choice",
          instructions: "Classify the email based on its content into one of the following categories.",
          criteria: {
            "spam/phishing": "Malicious spam, phishing attempts, or unwanted promotional junk.",
            social: "Social media notifications, friend requests, or networking updates.",
            newsletter: "Informational newsletters, blog digests, or regular subscription updates.",
            offers: "Promotional offers, marketing campaigns, and store discounts.",
            "billing/invoices": "Billing statements, invoices, payment confirmations.",
            "work/professional": "Internal team communication, project updates, professional outreach.",
            "personal": "Direct personal emails from friends, family, or personal acquaintances.",
            "calendar/events": "Calendar invites, meeting updates, event reminders.",
            "e-commerce": "E-commerce receipts, order confirmations, shipping updates.",
            alerts: "System alerts, security warnings, quota limits, account changes.",
            other: "Any other emails that do not fit into the defined categories.",
          },
        },
        isUrgentReply: {
          type: "noul",
          instructions: "Does this email require an action or a reply from the user within the next 24 hours?",
        },
        urgency: {
          type: "score",
          instructions: "Score the priority of this email. Use Lowest for junk/newsletters, and Critical for urgent action required today.",
          criteria: ["Lowest", "Low", "Medium", "High", "Critical"],
        },
      },
    }),
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API Error:", errorText);
    throw new Error(`Failed to classify email: HTTP ${response.status}`);
  }

  const data = await response.json();

  let classificationData = data;
  if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
    try {
      classificationData = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      classificationData = data.choices[0].message.content;
    }
  }

  const answers = classificationData.answers || {};

  const categoryValue = answers.category?.choice || "other";
  const needsReply = answers.isUrgentReply?.noul > 0.5;
  const urgencyScoreRaw = answers.urgency?.score != null ? Math.round(answers.urgency?.score) + 1 : 1;
  const cost = data.usage?.cost || 0;
  const inputTok = data.usage?.prompt_tokens || 0;
  const outputTok = data.usage?.completion_tokens || 0;

  const speed = (outputTok > 0 ? outputTok : inputTok) / (latencyMs / 1000);

  // 6. Save Classification Record
  await saveClassificationRecord({
    emailId: email.id,
    modelId: MODEL_ID,
    category: categoryValue,
    urgency: urgencyScoreRaw,
    needsReply: needsReply,
    cost: cost,
    inputTok: inputTok,
    outputTok: outputTok,
    speed: parseFloat(speed.toFixed(2)),
  });

  // 7. File-System Logging (as requested for audit)
  try {
    const logsDir = path.join(process.cwd(), "logs");
    await fs.mkdir(logsDir, { recursive: true });
    const logId = runId || new Date().toISOString().replace(/[:.]/g, "-");
    const logFileName = `classify_run_${logId}.log`;
    const logLine = `[${new Date().toISOString()}] Subject: "${subject || "(No Subject)"}" | Category: ${categoryValue} | Urgency: ${urgencyScoreRaw}/5 | UrgentReply: ${needsReply ? "Yes" : "No"}\n`;
    await fs.appendFile(path.join(logsDir, logFileName), logLine, "utf-8");
  } catch (logError) {
    console.error("Failed to write log file:", logError);
  }

  return {
    category: { value: categoryValue, probability: answers.category?.confidence || 1.0 },
    isUrgentReply: { value: needsReply, probability: answers.isUrgentReply?.noul || 1.0 },
    urgency: { value: `${urgencyScoreRaw}/5`, probability: answers.urgency?.confidence || 1.0 },
    cost: cost,
  };
}

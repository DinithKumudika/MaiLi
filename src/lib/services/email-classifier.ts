import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { upsertEmailRecord, getExistingClassification, saveClassificationRecord } from "@/lib/services/db-service";
import { getModelAdapter } from "./adapters";

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

const MODEL_ID = "jev-latest";

export async function classifyEmail(email: EmailPayload, runId?: string, force?: boolean): Promise<ClassificationResult> {
  const subject = email.subject || "";
  const from = email.from || "";
  const bodyText = typeof email.body === "string" ? email.body : JSON.stringify(email.body || {});

  // 1. Calculate content hash
  const hashInput = `${subject}${from}${bodyText}`;
  const content_hash = crypto.createHash("sha256").update(hashInput).digest("hex");

  // 2. Upsert Email record
  await upsertEmailRecord(email.id, subject, from, content_hash);

  // 3. Check for existing classification if not forcing
  if (!force) {
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
  }

  // 4 & 5. Model Inference via Adapter
  const adapter = getModelAdapter();
  const adapterResult = await adapter.classify(email);
  const speed = (adapterResult.outputTok > 0 ? adapterResult.outputTok : adapterResult.inputTok) / (adapterResult.latencyMs / 1000);

  // 6. Save Classification Record
  await saveClassificationRecord({
    emailId: email.id,
    modelId: MODEL_ID,
    category: adapterResult.categoryValue,
    urgency: adapterResult.urgencyScoreRaw,
    needsReply: adapterResult.needsReply,
    cost: adapterResult.cost,
    inputTok: adapterResult.inputTok,
    outputTok: adapterResult.outputTok,
    speed: parseFloat(speed.toFixed(2)),
  });

  // 7. File-System Logging (as requested for audit)
  try {
    const logsDir = path.join(process.cwd(), "logs");
    await fs.mkdir(logsDir, { recursive: true });
    const logId = runId || new Date().toISOString().replace(/[:.]/g, "-");
    const logFileName = `classify_run_${logId}.log`;
    const logLine = `[${new Date().toISOString()}] Subject: "${subject || "(No Subject)"}" | Category: ${adapterResult.categoryValue} | Urgency: ${adapterResult.urgencyScoreRaw}/5 | UrgentReply: ${adapterResult.needsReply ? "Yes" : "No"}\n`;
    await fs.appendFile(path.join(logsDir, logFileName), logLine, "utf-8");
  } catch (logError) {
    console.error("Failed to write log file:", logError);
  }

  return {
    category: { value: adapterResult.categoryValue, probability: adapterResult.probabilityCategory },
    isUrgentReply: { value: adapterResult.needsReply, probability: adapterResult.probabilityUrgentReply },
    urgency: { value: `${adapterResult.urgencyScoreRaw}/5`, probability: adapterResult.probabilityUrgency },
    cost: adapterResult.cost,
  };
}

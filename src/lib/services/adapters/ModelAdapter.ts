import { EmailPayload } from "../email-classifier";

export interface AdapterClassification {
  categoryValue: string;
  needsReply: boolean;
  urgencyScoreRaw: number;
  cost: number;
  inputTok: number;
  outputTok: number;
  latencyMs: number;
  probabilityCategory: number;
  probabilityUrgentReply: number;
  probabilityUrgency: number;
}

export interface ModelAdapter {
  classify(email: EmailPayload): Promise<AdapterClassification>;
}

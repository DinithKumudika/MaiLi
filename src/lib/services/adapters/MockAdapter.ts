import { ModelAdapter, AdapterClassification } from "./ModelAdapter";
import { EmailPayload } from "../email-classifier";

export class MockAdapter implements ModelAdapter {
  async classify(email: EmailPayload): Promise<AdapterClassification> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    const categories = ["work/professional", "newsletter", "offers", "personal", "alerts"];
    const categoryValue = categories[Math.floor(Math.random() * categories.length)];
    
    return {
      categoryValue,
      needsReply: Math.random() > 0.7,
      urgencyScoreRaw: Math.floor(Math.random() * 5) + 1,
      cost: 0,
      inputTok: 100,
      outputTok: 10,
      latencyMs: 500,
      probabilityCategory: 0.95,
      probabilityUrgentReply: 0.9,
      probabilityUrgency: 0.85,
    };
  }
}

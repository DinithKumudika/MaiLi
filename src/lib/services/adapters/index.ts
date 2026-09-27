import { ModelAdapter } from "./ModelAdapter";
import { OpenRouterAdapter } from "./OpenRouterAdapter";
import { MockAdapter } from "./MockAdapter";

export function getModelAdapter(): ModelAdapter {
  if (process.env.RUN_IN_MOCK === "true") {
    return new MockAdapter();
  }
  
  const provider = process.env.MODEL_PROVIDER || "openrouter";
  
  if (provider === "openrouter") {
    return new OpenRouterAdapter();
  }
  
  // Default fallback
  return new OpenRouterAdapter();
}

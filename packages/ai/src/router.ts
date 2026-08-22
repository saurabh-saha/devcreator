import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter is OpenAI-compatible — point base URL at their gateway
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  headers: {
    "HTTP-Referer": process.env.WEB_URL ?? "http://localhost:3000",
    "X-Title": "DevCreator",
  },
});

// ─── Task taxonomy ─────────────────────────────────────────────────────────
export type ModelTask =
  | "chat"      // Creator Brain chat — context-aware, multi-turn
  | "ideas"     // Idea generation — creative, structured output
  | "content"   // Long-form content creation — quality over speed
  | "analysis"  // Deep insight/analytics reasoning
  | "vision"    // Image understanding (thumbnails, screenshots, carousels)
  | "fast"      // Batch classification, topic extraction, metadata tagging
  | "classify"; // Single-shot categorisation (sentiment, format detection)

export type ModelProvider = "gemini" | "groq" | "openrouter";

interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  label: string;
}

// ─── Central routing table ─────────────────────────────────────────────────
// Edit here to swap models without touching agent code.
// Gemini → primary (all important work)
// Groq   → fast/cheap (classification, extraction, batches)
// OpenRouter → experimental fallback only
const MODEL_ROUTING: Record<ModelTask, ModelConfig> = {
  chat: {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    label: "Gemini Flash (Creator Brain Chat)",
  },
  ideas: {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    label: "Gemini Flash (Idea Generation)",
  },
  content: {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    label: "Gemini Flash (Content Creation)",
  },
  analysis: {
    provider: "gemini",
    modelId: "gemini-2.5-pro-preview-06-05",
    label: "Gemini 2.5 Pro (Deep Analysis)",
  },
  vision: {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    label: "Gemini Flash (Vision)",
  },
  fast: {
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
    label: "Groq Llama 3.3 70B (Fast Tasks)",
  },
  classify: {
    provider: "groq",
    modelId: "llama-3.1-8b-instant",
    label: "Groq Llama 3.1 8B (Classification)",
  },
};

// ─── Model factory ─────────────────────────────────────────────────────────
export function getModel(task: ModelTask) {
  const { provider, modelId } = MODEL_ROUTING[task];

  switch (provider) {
    case "gemini":
      return google(modelId);
    case "groq":
      return groq(modelId);
    case "openrouter":
      return openrouter(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Use this when you want to experiment with a specific OpenRouter free model
// without wiring it into the routing table permanently.
export function getOpenRouterModel(modelId: string) {
  return openrouter(modelId);
}

export function getModelConfig(task: ModelTask): ModelConfig {
  return MODEL_ROUTING[task];
}

export { MODEL_ROUTING };

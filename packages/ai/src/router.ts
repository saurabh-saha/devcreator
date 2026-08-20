import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// Task → model mapping. Swap models here without touching agent code.
export type ModelTask =
  | "chat"          // Creator Brain chat — needs context, nuance
  | "ideas"         // Idea generation — creative, fast
  | "content"       // Long-form content creation — quality matters
  | "analysis"      // Analytics interpretation — reasoning heavy
  | "embedding"     // Vector embeddings for knowledge base
  | "vision"        // Image understanding (carousel analysis, etc.)
  | "fast";         // Cheap, fast tasks (classification, tagging)

export type ModelProvider = "anthropic" | "google" | "openai";

interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  label: string;
}

// Central routing table — edit this to swap models per task
const MODEL_ROUTING: Record<ModelTask, ModelConfig> = {
  chat: {
    provider: "anthropic",
    modelId: "claude-sonnet-5",
    label: "Claude Sonnet 5 (Creator Chat)",
  },
  ideas: {
    provider: "google",
    modelId: "gemini-2.0-flash",
    label: "Gemini Flash (Idea Generation)",
  },
  content: {
    provider: "anthropic",
    modelId: "claude-sonnet-5",
    label: "Claude Sonnet 5 (Content Creation)",
  },
  analysis: {
    provider: "anthropic",
    modelId: "claude-opus-5",
    label: "Claude Opus 5 (Deep Analysis)",
  },
  embedding: {
    provider: "openai",
    modelId: "text-embedding-3-small",
    label: "OpenAI Embeddings",
  },
  vision: {
    provider: "google",
    modelId: "gemini-2.0-flash",
    label: "Gemini Flash (Vision)",
  },
  fast: {
    provider: "google",
    modelId: "gemini-2.0-flash",
    label: "Gemini Flash (Fast)",
  },
};

export function getModel(task: ModelTask) {
  const config = MODEL_ROUTING[task];

  switch (config.provider) {
    case "anthropic":
      return anthropic(config.modelId);
    case "google":
      return google(config.modelId);
    case "openai":
      return openai(config.modelId);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export function getModelConfig(task: ModelTask): ModelConfig {
  return MODEL_ROUTING[task];
}

export { MODEL_ROUTING };

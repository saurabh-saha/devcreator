import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";

// In-process quota tracker — resets on server restart (fine for daily free-tier limits)
const globalForQuota = globalThis as unknown as { _quotaExhausted?: Record<string, number> };
if (!globalForQuota._quotaExhausted) globalForQuota._quotaExhausted = {};
const QUOTA_TTL_MS = 60 * 60 * 1000; // 1 hour

export function isExhausted(id: string) {
  const ts = globalForQuota._quotaExhausted![id];
  if (!ts) return false;
  if (Date.now() - ts > QUOTA_TTL_MS) { delete globalForQuota._quotaExhausted![id]; return false; }
  return true;
}

export function markExhausted(id: string) {
  globalForQuota._quotaExhausted![id] = Date.now();
}

export function isQuotaError(err: any) {
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("quota") || msg.includes("rate") || msg.includes("too large") ||
    err?.status === 429 || err?.status === 503 || err?.statusCode === 429;
}

type Candidate = { id: string; model: LanguageModelV1; maxTokens: number };

function buildCandidates(): Candidate[] {
  const groq = process.env.GROQ_API_KEY ? createGroq({ apiKey: process.env.GROQ_API_KEY }) : null;
  const openrouter = process.env.OPENROUTER_API_KEY
    ? createOpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })
    : null;

  return [
    { id: "gemini-2.5-flash", model: google("gemini-2.5-flash"), maxTokens: 8000 },
    ...(groq ? [{ id: "groq-qwen", model: groq("qwen/qwen3.6-27b") as LanguageModelV1, maxTokens: 3000 }] : []),
    ...(openrouter ? [{ id: "openrouter-llama", model: openrouter("meta-llama/llama-3.3-70b-instruct:free") as LanguageModelV1, maxTokens: 4000 }] : []),
  ];
}

// Returns the first non-exhausted candidate, or null if all are exhausted.
export function pickModel(capabilities?: { structuredOutput?: boolean }): Candidate | null {
  const all = buildCandidates();
  // Groq doesn't support structured output (generateObject with schema)
  const candidates = capabilities?.structuredOutput
    ? all.filter(c => !c.id.startsWith("groq"))
    : all;
  return candidates.find(c => !isExhausted(c.id)) ?? null;
}

export const QUOTA_EXHAUSTED_RESPONSE = Response.json(
  { error: "AI generation failed. Please retry." },
  { status: 429 }
);

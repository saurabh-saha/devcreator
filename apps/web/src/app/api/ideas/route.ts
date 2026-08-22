import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";
import { createHash } from "crypto";
import postgres from "postgres";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Table ────────────────────────────────────────────────────────────────────
const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── DDL (run once per process) ───────────────────────────────────────────────
const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql; _ideasMigrated?: boolean };
if (!globalForDb._pgClient) {
  globalForDb._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
}
const sql = globalForDb._pgClient;

async function ensureTable() {
  if (globalForDb._ideasMigrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS ideas_cache (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL,
      filter_hash TEXT NOT NULL,
      data        JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, filter_hash)
    )
  `;
  globalForDb._ideasMigrated = true;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const IdeaSchema = z.object({
  ideas: z.array(z.object({
    title: z.string(),
    hook: z.string().describe("The actual opening line of the content, in quotes"),
    score: z.number().int().min(1).max(100).describe("Predicted performance score 1-100 vs creator's average. Must be a whole integer."),
    impact: z.enum(["High", "Medium", "Low"]),
    rationale: z.string().describe("Why this will perform well, based on creator's history"),
    formats: z.array(z.string()).describe("Recommended platforms/formats e.g. LinkedIn, YouTube Short, Carousel"),
    audience: z.string().describe("Primary target segment"),
  })),
});

const SYSTEM = `You are an expert content strategist for Saurabh Saha, a developer-creator.

Saurabh's expertise: AI agents, backend engineering, Kafka/streaming, system architecture, engineering leadership.
Audience: Software engineers (67%), engineering managers (18%), technical founders (9%).

What performs well for Saurabh:
- Contrarian takes grounded in production experience
- Visual analogies (Kafka Consumer Groups with email inbox = 4.2× average)
- First-line hooks that are specific, concrete, and relatable
- Practical over theoretical — shows working code or real decisions
- Personal experience over generic advice

Generate ideas that are specific, grounded in his expertise, and likely to outperform his average.`;

export async function POST(req: Request) {
  const session = await auth();
  const { audience, topic, goal, platform, count } = await req.json();

  const filterHash = createHash("sha1")
    .update(JSON.stringify({ audience, topic, goal, platform, count }))
    .digest("hex")
    .slice(0, 16);

  // Try cache if user is logged in
  if (session?.user?.email) {
    await ensureTable();
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (user) {
      const cached = await sql`
        SELECT data, generated_at FROM ideas_cache
        WHERE user_id = ${user.id} AND filter_hash = ${filterHash}
      `;
      if (cached.length > 0) {
        const age = Date.now() - new Date(cached[0].generated_at).getTime();
        if (age < CACHE_TTL_MS) {
          return Response.json({ ...cached[0].data, cached: true, generatedAt: cached[0].generated_at });
        }
      }
    }
  }

  // Generate fresh
  const prompt = `Generate ${count ?? 10} content ideas for Saurabh.
Audience: ${audience ?? "AI Engineers"}
Topic focus: ${topic ?? "Agentic AI"}
Goal: ${goal ?? "Build authority"}
Platform: ${platform ?? "All platforms"}

Make the hooks punchy, specific, and original. Score based on predicted performance vs his historical average.`;

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    mode: "json",
    system: SYSTEM + "\n\nIMPORTANT: Output ONLY valid JSON. No markdown, no backticks, no code fences. All string values must use standard double quotes only.",
    prompt,
    schema: IdeaSchema,
    maxTokens: 8000,
  });

  // Store in cache
  if (session?.user?.email) {
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (user) {
      await sql`
        INSERT INTO ideas_cache (user_id, filter_hash, data, generated_at)
        VALUES (${user.id}, ${filterHash}, ${JSON.stringify(object)}, NOW())
        ON CONFLICT (user_id, filter_hash) DO UPDATE
          SET data = EXCLUDED.data, generated_at = NOW()
      `;
    }
  }

  return Response.json({ ...object, cached: false, generatedAt: new Date().toISOString() });
}

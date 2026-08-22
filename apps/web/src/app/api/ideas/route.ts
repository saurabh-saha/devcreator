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

const MAX_IDEAS = 3;

// ─── Schema ───────────────────────────────────────────────────────────────────
const IdeaSchema = z.object({
  ideas: z.array(z.object({
    title: z.string(),
    hook: z.string(),
    score: z.number().int().min(1).max(100),
    impact: z.enum(["High", "Medium", "Low"]),
    rationale: z.string(),
    formats: z.array(z.string()),
    audience: z.string(),
  })),
});

const SYSTEM = `You are a content strategist for a developer-creator. Generate content ideas that are specific, opinionated, and grounded in real technical experience. Hooks must be concrete and punchy.`;

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
  const n = Math.min(count ?? MAX_IDEAS, MAX_IDEAS);
  const prompt = `Generate ${n} ideas. Audience: ${audience}. Topic: ${topic}. Goal: ${goal}. Platform: ${platform}. Hooks must be punchy and specific.`;

  const MODELS = [
    { model: google("gemini-2.5-flash"), maxTokens: 3000 },
  ];

  function quotaError(err: any) {
    const msg = (err?.message ?? "").toLowerCase();
    return msg.includes("quota") || msg.includes("rate") || err?.status === 429 || err?.statusCode === 429;
  }

  function resetMessage() {
    const nowPT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const midnight = new Date(nowPT);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const diffMs = midnight.getTime() - nowPT.getTime();
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `AI quota exhausted. Resets in ${hrs}h ${mins}m.`;
  }

  let object: z.infer<typeof IdeaSchema> | null = null;
  for (const { model, maxTokens } of MODELS) {
    try {
      const result = await generateObject({ model, system: SYSTEM, prompt, schema: IdeaSchema, maxTokens });
      object = result.object;
      break;
    } catch (err: any) {
      const msg = (err?.message ?? "").toLowerCase();
      if (quotaError(err) || msg.includes("decommissioned")) continue;
      throw err;
    }
  }
  if (!object) return Response.json({ error: resetMessage() }, { status: 429 });

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

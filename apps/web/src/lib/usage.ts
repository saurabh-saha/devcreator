// Daily AI usage limits, stored in Postgres (works across Vercel instances).
// - signed-in users: AI_DAILY_LIMIT_USER per day (default 50)
// - guests: AI_DAILY_LIMIT_GUEST per IP per day (default 5)
// - whole app: AI_DAILY_LIMIT_GLOBAL per day (default 2000)
import postgres from "postgres";

const LIMITS = {
  user: Number(process.env.AI_DAILY_LIMIT_USER) || 50,
  guest: Number(process.env.AI_DAILY_LIMIT_GUEST) || 5,
  global: Number(process.env.AI_DAILY_LIMIT_GLOBAL) || 2000,
};

const g = globalThis as unknown as { _pgClient?: postgres.Sql; _usageReady?: boolean };
if (!g._pgClient) g._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
const sql = g._pgClient;

async function ensureTable() {
  if (g._usageReady) return;
  try {
    await sql`
    CREATE TABLE IF NOT EXISTS ai_usage (
      key   TEXT NOT NULL,
      day   DATE NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (key, day)
    )
  `;
  } catch (err: any) {
    // Two requests creating the table at once: the other one won, which is fine.
    if (err?.code !== "23505" && err?.code !== "42P07") throw err;
  }
  g._usageReady = true;
}

// Atomically add one and return the new count for today (UTC).
async function bump(key: string): Promise<number> {
  const [row] = await sql`
    INSERT INTO ai_usage (key, day, count) VALUES (${key}, CURRENT_DATE, 1)
    ON CONFLICT (key, day) DO UPDATE SET count = ai_usage.count + 1
    RETURNING count
  `;
  return Number(row.count);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

export type UsageResult = { ok: true } | { ok: false; status: 429; error: string };

/**
 * Count one AI generation. Call it right before calling the model
 * (not for cache hits). Fails open if the database is unreachable.
 */
export async function consumeAi(req: Request, userEmail?: string | null): Promise<UsageResult> {
  try {
    await ensureTable();
    const who = userEmail ? `user:${userEmail.toLowerCase()}` : `ip:${clientIp(req)}`;
    const limit = userEmail ? LIMITS.user : LIMITS.guest;
    if ((await bump(who)) > limit) {
      return {
        ok: false, status: 429,
        error: userEmail
          ? `You've used today's ${limit} AI generations. They reset at midnight UTC.`
          : `You've used today's ${limit} free generations. Sign in with Google to keep going.`,
      };
    }
    if ((await bump("global")) > LIMITS.global) {
      return { ok: false, status: 429, error: "DevCreator is busy today. Please try again tomorrow." };
    }
  } catch (err) {
    console.error("[usage] limit check failed, allowing request:", err);
  }
  return { ok: true };
}

export function usageErrorResponse(r: Extract<UsageResult, { ok: false }>) {
  return Response.json({ error: r.error }, { status: r.status });
}

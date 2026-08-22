import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import postgres from "postgres";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  ideaTitle: text("idea_title").notNull(),
  format: text("format").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("drafts_user_idx").on(t.userId)]);

const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql; _draftsV3Migrated?: boolean };
if (!globalForDb._pgClient) globalForDb._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
const sql = globalForDb._pgClient;

async function ensureTable() {
  if (globalForDb._draftsV3Migrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      idea_title TEXT NOT NULL,
      format TEXT NOT NULL,
      content TEXT NOT NULL,
      idea_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS idea_data JSONB`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS drafts_user_idea_format
    ON drafts (user_id, idea_title, format)
  `;
  globalForDb._draftsV3Migrated = true;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ drafts: [] });
  // Join with saved_ideas to backfill idea_data for old drafts
  const rows = await sql`
    SELECT d.id, d.idea_title AS "ideaTitle", d.format, d.content, d.created_at AS "createdAt",
           COALESCE(d.idea_data, to_jsonb(si.*) - 'id' - 'user_id' - 'saved_at') AS "ideaData"
    FROM drafts d
    LEFT JOIN saved_ideas si ON si.user_id = d.user_id AND si.title = d.idea_title
    WHERE d.user_id = ${user.id}
    ORDER BY d.created_at DESC
  `;
  return NextResponse.json({ drafts: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { ideaTitle, format, content, idea } = await req.json();
  const ideaData = idea ? JSON.stringify(idea) : null;
  await sql`
    INSERT INTO drafts (user_id, idea_title, format, content, idea_data, created_at)
    VALUES (${user.id}, ${ideaTitle}, ${format}, ${content}, ${ideaData}::jsonb, NOW())
    ON CONFLICT (user_id, idea_title, format)
    DO UPDATE SET content = EXCLUDED.content, idea_data = COALESCE(EXCLUDED.idea_data, drafts.idea_data), created_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}

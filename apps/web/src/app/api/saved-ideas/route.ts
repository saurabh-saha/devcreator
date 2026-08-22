import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const savedIdeas = pgTable("saved_ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  hook: text("hook").notNull().default(""),
  score: integer("score").notNull().default(0),
  impact: text("impact").notNull().default("Medium"),
  rationale: text("rationale").notNull().default(""),
  formats: text("formats").array().notNull().default([]),
  audience: text("audience").notNull().default(""),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
}, (t) => [index("si_user_idx").on(t.userId)]);

const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql; _savedIdeasMigrated?: boolean };
if (!globalForDb._pgClient) globalForDb._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
const sql = globalForDb._pgClient;

async function ensureTable() {
  if (globalForDb._savedIdeasMigrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS saved_ideas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      hook TEXT NOT NULL DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      impact TEXT NOT NULL DEFAULT 'Medium',
      rationale TEXT NOT NULL DEFAULT '',
      formats TEXT[] NOT NULL DEFAULT '{}',
      audience TEXT NOT NULL DEFAULT '',
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  globalForDb._savedIdeasMigrated = true;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ ideas: [] });
  const ideas = await db.select().from(savedIdeas).where(eq(savedIdeas.userId, user.id));
  return NextResponse.json({ ideas });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { title, hook, score, impact, rationale, formats, audience } = await req.json();
  const [saved] = await db.insert(savedIdeas).values({
    userId: user.id, title, hook: hook ?? "", score: score ?? 0,
    impact: impact ?? "Medium", rationale: rationale ?? "",
    formats: formats ?? [], audience: audience ?? "",
  }).returning();
  return NextResponse.json({ idea: saved });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { id } = await req.json();
  await db.delete(savedIdeas).where(and(eq(savedIdeas.id, id), eq(savedIdeas.userId, user.id)));
  return NextResponse.json({ ok: true });
}

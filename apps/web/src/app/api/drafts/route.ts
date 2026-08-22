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

const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql; _draftsMigrated?: boolean };
if (!globalForDb._pgClient) globalForDb._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
const sql = globalForDb._pgClient;

async function ensureTable() {
  if (globalForDb._draftsMigrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      idea_title TEXT NOT NULL,
      format TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  globalForDb._draftsMigrated = true;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ drafts: [] });
  const all = await db.select().from(drafts).where(eq(drafts.userId, user.id));
  return NextResponse.json({ drafts: all });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { ideaTitle, format, content } = await req.json();
  const [draft] = await db.insert(drafts).values({
    userId: user.id, ideaTitle, format, content,
  }).returning();
  return NextResponse.json({ draft });
}

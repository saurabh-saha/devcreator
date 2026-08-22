import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, pgEnum, integer, index } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const platformEnum = pgEnum("platform", [
  "linkedin", "instagram", "youtube", "x", "medium", "substack", "github", "notion", "google_drive",
]);

const platformAccounts = pgTable("platform_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  platform: platformEnum("platform").notNull(),
  handle: text("handle").notNull(),
  accessToken: text("access_token").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
}, (t) => [index("pa_prof_idx").on(t.userId)]);

const creatorProfiles = pgTable("creator_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  expertise: text("expertise").array().notNull().default([]),
  topics: text("topics").array().notNull().default([]),
  tone: text("tone").notNull().default("educational"),
  targetAudience: text("target_audience"),
  contentPillars: text("content_pillars").array().notNull().default([]),
  voiceSummary: text("voice_summary"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  sourceType: text("source_type").notNull(),
  sourceRef: text("source_ref"),
  title: text("title"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("kd_prof_idx").on(t.userId)]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ profile: null, accounts: [], docs: [], name: null });

    const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, user.id));
    const accounts = await db.select({
      platform: platformAccounts.platform,
      handle: platformAccounts.handle,
      connectedAt: platformAccounts.connectedAt,
    }).from(platformAccounts).where(eq(platformAccounts.userId, user.id));
    const docs = await db.select({
      title: knowledgeDocuments.title,
      sourceType: knowledgeDocuments.sourceType,
      sourceRef: knowledgeDocuments.sourceRef,
    }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, user.id));

    return NextResponse.json({ profile: profile ?? null, accounts, docs, name: user.name });
  } catch (err) {
    console.error("[/api/profile error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

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
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  followerCount: integer("follower_count").notNull().default(0),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
}, (t) => [index("pa_substack_idx").on(t.userId, t.platform)]);


export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const handle = username.trim().replace(/^@/, "").replace(/\.substack\.com$/, "");

  // Validate by fetching RSS feed
  const rssRes = await fetch(`https://${handle}.substack.com/feed`, {
    headers: { "User-Agent": "DevCreator/1.0" },
  });
  if (!rssRes.ok) {
    return NextResponse.json({ error: "Substack not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  

  let [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    [user] = await db.insert(users).values({
      email: session.user.email,
      name: session.user.name ?? session.user.email,
    }).returning();
  }

  const [existing] = await db.select().from(platformAccounts).where(
    and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "substack"))
  );

  if (existing) {
    await db.update(platformAccounts)
      .set({ handle, connectedAt: new Date() })
      .where(and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "substack")));
  } else {
    await db.insert(platformAccounts).values({
      userId: user.id, platform: "substack", handle, accessToken: "rss",
    });
  }

  return NextResponse.json({ ok: true, handle });
}

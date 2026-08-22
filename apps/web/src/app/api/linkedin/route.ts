import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const linkedinPosts = pgTable("linkedin_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  postUrl: text("post_url").notNull(),
  snippet: text("snippet").notNull().default(""),
  impressions: integer("impressions").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  reposts: integer("reposts").notNull().default(0),
  postType: text("post_type").notNull().default("post"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
}, (t) => [index("linkedin_posts_user_idx").on(t.userId)]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ posts: [] });

    const posts = await db.select().from(linkedinPosts)
      .where(eq(linkedinPosts.userId, user.id))
      .orderBy(linkedinPosts.syncedAt);

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("[/api/linkedin GET error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST body: { posts: { url, snippet, impressions, likes, comments, reposts, postType }[] }
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const entries = body.posts ?? [];
    if (!entries.length) return NextResponse.json({ ok: true });

    // Merge: preserve max impressions/likes so a re-sync never zeros out existing data
    const existing = await db.select().from(linkedinPosts).where(eq(linkedinPosts.userId, user.id));
    const prevMap = new Map(existing.map(p => [p.postUrl || p.snippet.slice(0, 100), p]));

    await db.delete(linkedinPosts).where(eq(linkedinPosts.userId, user.id));
    await db.insert(linkedinPosts).values(
      entries.map((p: any) => {
        const key = p.url || (p.snippet ?? "").slice(0, 100);
        const prev = prevMap.get(key);
        return {
          userId: user.id,
          postUrl: p.url ?? "",
          snippet: p.snippet ?? "",
          impressions: Math.max(p.impressions ?? 0, prev?.impressions ?? 0),
          likes: Math.max(p.likes ?? 0, prev?.likes ?? 0),
          comments: Math.max(p.comments ?? 0, prev?.comments ?? 0),
          reposts: p.reposts ?? 0,
          postType: p.postType ?? "post",
        };
      })
    );

    return NextResponse.json({ ok: true, saved: entries.length });
  } catch (err) {
    console.error("[/api/linkedin POST error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

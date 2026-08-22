import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const mediumClaps = pgTable("medium_claps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  articleUrl: text("article_url").notNull(),
  clapCount: integer("clap_count").notNull().default(0),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
}, (t) => [index("medium_claps_user_idx").on(t.userId)]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ claps: [] });

    const rows = await db.select({
      articleUrl: mediumClaps.articleUrl,
      clapCount: mediumClaps.clapCount,
      syncedAt: mediumClaps.syncedAt,
    }).from(mediumClaps).where(eq(mediumClaps.userId, user.id));

    return NextResponse.json({ claps: rows });
  } catch (err) {
    console.error("[/api/claps GET error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST body: { claps: { url: string; count: number }[] }
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const entries: { url: string; count: number }[] = body.claps ?? [];
    if (!entries.length) return NextResponse.json({ ok: true });

    // Upsert each article — delete existing row then insert (simple, no ON CONFLICT needed)
    for (const { url, count } of entries) {
      await db.delete(mediumClaps).where(
        and(eq(mediumClaps.userId, user.id), eq(mediumClaps.articleUrl, url))
      );
      await db.insert(mediumClaps).values({
        userId: user.id,
        articleUrl: url,
        clapCount: count,
      });
    }

    return NextResponse.json({ ok: true, saved: entries.length });
  } catch (err) {
    console.error("[/api/claps POST error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

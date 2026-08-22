import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

// ─── Inline schema ────────────────────────────────────────────────────────────
const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
const platformEnum = pgEnum("platform", ["linkedin","instagram","youtube","x","medium","substack","github","notion","google_drive"]);
const platformAccounts = pgTable("platform_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  platform: platformEnum("platform").notNull(),
  handle: text("handle").notNull(),
  accessToken: text("access_token").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
}, (t) => [index("pa_stats_idx").on(t.userId, t.platform)]);


// ─── Medium scraper ───────────────────────────────────────────────────────────
async function fetchMediumStats(handle: string) {
  try {
    const rss = await fetch(`https://medium.com/feed/@${handle}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then(r => r.text()).catch(() => "");

    const articles: { title: string; url: string; publishedAt: string }[] = [];
    for (const m of rss.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const raw = m[1];
      const title = (raw.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? raw.match(/<title>(.*?)<\/title>/)?.[1] ?? "").trim();
      const link  = (raw.match(/<link>(.*?)<\/link>/)?.[1] ?? "").trim();
      const pubDate = (raw.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "").trim();
      if (title && link) articles.push({ title, url: link.split("?")[0], publishedAt: pubDate ? new Date(pubDate).toISOString() : "" });
      if (articles.length >= 10) break;
    }
    return articles;
  } catch { return []; }
}

// ─── Substack scraper ─────────────────────────────────────────────────────────
async function fetchSubstackStats(handle: string) {
  try {
    // Substack has a public API endpoint
    const data = await fetch(
      `https://${handle}.substack.com/api/v1/posts?limit=10&offset=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    ).then(r => r.json()).catch(() => null);

    if (!data || !Array.isArray(data)) return [];

    return data.map((p: any) => ({
      title: p.title ?? "",
      url: p.canonical_url ?? `https://${handle}.substack.com/p/${p.slug}`,
      comments: p.comment_count ?? 0,
      likes: p.reactions?.["❤"] ?? p.reactions?.["👍"] ?? 0,
      publishedAt: p.post_date ?? p.published_at ?? "",
      audience: p.audience ?? "everyone",
    })).slice(0, 10);
  } catch { return []; }
}

// ─── GitHub stats ─────────────────────────────────────────────────────────────
async function fetchGitHubStats(handle: string, token: string) {
  try {
    const repos = await fetch(
      `https://api.github.com/users/${handle}/repos?sort=updated&per_page=10&type=owner`,
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": "DevCreator" } }
    ).then(r => r.json()).catch(() => []);

    return (repos as any[]).slice(0, 10).map((r: any) => ({
      name: r.full_name,
      url: r.html_url,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      watchers: r.watchers_count ?? 0,
      language: r.language ?? "",
      updatedAt: r.updated_at ?? "",
    }));
  } catch { return []; }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ medium: [], substack: [], github: [], mediumHandle: null });

    const accounts = await db.select().from(platformAccounts).where(eq(platformAccounts.userId, user.id));
    const byPlatform = Object.fromEntries(accounts.map(a => [a.platform, a]));

    const [medium, substack, github] = await Promise.all([
      byPlatform.medium ? fetchMediumStats(byPlatform.medium.handle) : Promise.resolve([]),
      byPlatform.substack ? fetchSubstackStats(byPlatform.substack.handle) : Promise.resolve([]),
      byPlatform.github ? fetchGitHubStats(byPlatform.github.handle, byPlatform.github.accessToken) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      medium,
      substack,
      github,
      mediumHandle: byPlatform.medium?.handle ?? null,
    });
  } catch (err) {
    console.error("[/api/stats error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

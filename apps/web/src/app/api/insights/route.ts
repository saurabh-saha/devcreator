import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import postgres from "postgres";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Raw client for DDL (drizzle doesn't expose CREATE TABLE IF NOT EXISTS easily)
const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql; _insightsMigrated?: boolean };
if (!globalForDb._pgClient) {
  globalForDb._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
}
const sql = globalForDb._pgClient;

async function ensureTable() {
  if (globalForDb._insightsMigrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS insights_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE,
      data JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  globalForDb._insightsMigrated = true;
}

// ─── Schema (inline to avoid shared-schema issues) ────────────────────────────
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
}, (t) => [index("pa_ins_idx").on(t.userId)]);
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
}, (t) => [index("linkedin_ins_idx").on(t.userId)]);
const mediumClaps = pgTable("medium_claps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  articleUrl: text("article_url").notNull(),
  clapCount: integer("clap_count").notNull().default(0),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
}, (t) => [index("mc_ins_idx").on(t.userId)]);

// ─── External fetchers ────────────────────────────────────────────────────────
async function fetchMediumArticles(handle: string) {
  try {
    const rss = await fetch(`https://medium.com/feed/@${handle}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then(r => r.text()).catch(() => "");
    const articles: { title: string; url: string }[] = [];
    for (const m of rss.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const raw = m[1];
      const title = (raw.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? raw.match(/<title>(.*?)<\/title>/)?.[1] ?? "").trim();
      const link = (raw.match(/<link>(.*?)<\/link>/)?.[1] ?? "").trim();
      if (title && link) articles.push({ title, url: link.split("?")[0] });
      if (articles.length >= 20) break;
    }
    return articles;
  } catch { return []; }
}

async function fetchSubstackPosts(handle: string) {
  try {
    const data = await fetch(
      `https://${handle}.substack.com/api/v1/posts?limit=20&offset=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    ).then(r => r.json()).catch(() => null);
    if (!Array.isArray(data)) return [];
    return data.map((p: any) => ({
      title: p.title ?? "",
      comments: p.comment_count ?? 0,
      likes: p.reactions?.["❤"] ?? p.reactions?.["👍"] ?? 0,
    }));
  } catch { return []; }
}

async function fetchGitHubRepos(handle: string, token: string) {
  try {
    const repos = await fetch(
      `https://api.github.com/users/${handle}/repos?sort=stars&per_page=20&type=owner`,
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": "DevCreator" } }
    ).then(r => r.json()).catch(() => []);
    return (repos as any[]).map((r: any) => ({
      name: r.name,
      stars: r.stargazers_count ?? 0,
      language: r.language ?? "",
      description: r.description ?? "",
    }));
  } catch { return []; }
}

// ─── Zod schema for AI output ─────────────────────────────────────────────────
const InsightsSchema = z.object({
  whatsWorking: z.object({
    headline: z.string(),
    detail: z.string(),
  }),
  contentGap: z.object({
    headline: z.string(),
    detail: z.string(),
    gaps: z.array(z.string()).max(4),
  }),
  topTopics: z.array(z.object({ topic: z.string(), score: z.number().min(1).max(5) })).max(5),
  topFormats: z.array(z.object({ format: z.string(), multiplier: z.string() })).max(5),
  quickStat: z.object({
    label: z.string(),
    value: z.string(),
  }),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await ensureTable();

    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

    // Check cache (skip if forced refresh)
    if (!forceRefresh) {
      const cached = await sql`SELECT data, generated_at FROM insights_cache WHERE user_id = ${user.id}`;
      if (cached.length > 0) {
        const age = Date.now() - new Date(cached[0].generated_at).getTime();
        if (age < CACHE_TTL_MS) {
          return NextResponse.json({ ...cached[0].data, cached: true, generatedAt: cached[0].generated_at });
        }
      }
    }

    const accounts = await db.select().from(platformAccounts).where(eq(platformAccounts.userId, user.id));
    const byPlatform = Object.fromEntries(accounts.map(a => [a.platform, a]));

    // Fetch all data in parallel
    const [liPosts, medClaps, medArticles, subPosts, ghRepos] = await Promise.all([
      db.select().from(linkedinPosts).where(eq(linkedinPosts.userId, user.id)),
      db.select().from(mediumClaps).where(eq(mediumClaps.userId, user.id)),
      byPlatform.medium ? fetchMediumArticles(byPlatform.medium.handle) : Promise.resolve([]),
      byPlatform.substack ? fetchSubstackPosts(byPlatform.substack.handle) : Promise.resolve([]),
      byPlatform.github ? fetchGitHubRepos(byPlatform.github.handle, byPlatform.github.accessToken) : Promise.resolve([]),
    ]);

    // Merge Medium articles with clap counts
    const clapsByUrl = new Map(medClaps.map(c => [c.articleUrl, c.clapCount]));
    const medWithClaps = medArticles.map(a => ({ ...a, claps: clapsByUrl.get(a.url) ?? 0 }));

    // Build context for AI
    const liSummary = liPosts
      .sort((a, b) => (b.impressions + b.likes * 10) - (a.impressions + a.likes * 10))
      .slice(0, 20)
      .map(p => `[${p.postType}] impressions=${p.impressions} likes=${p.likes} comments=${p.comments} | "${p.snippet.slice(0, 120)}"`)
      .join("\n");

    const medSummary = medWithClaps
      .sort((a, b) => b.claps - a.claps)
      .map(a => `claps=${a.claps} | "${a.title}"`)
      .join("\n");

    const subSummary = subPosts
      .sort((a, b) => (b.comments + b.likes) - (a.comments + a.likes))
      .map(p => `comments=${p.comments} likes=${p.likes} | "${p.title}"`)
      .join("\n");

    const ghSummary = ghRepos
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 10)
      .map(r => `stars=${r.stars} lang=${r.language} | ${r.name}: ${r.description.slice(0, 80)}`)
      .join("\n");

    const hasData = liPosts.length > 0 || medWithClaps.length > 0 || subPosts.length > 0 || ghRepos.length > 0;
    if (!hasData) {
      return NextResponse.json({ error: "no_data" }, { status: 200 });
    }

    const prompt = `You are analyzing a developer-creator's real content performance data. Generate concrete, specific insights — no generic advice.

LINKEDIN POSTS (sorted by engagement):
${liSummary || "(none)"}

MEDIUM ARTICLES (sorted by claps):
${medSummary || "(none)"}

SUBSTACK POSTS (sorted by engagement):
${subSummary || "(none)"}

GITHUB REPOS (sorted by stars):
${ghSummary || "(none)"}

Based on this REAL data:
1. whatsWorking: What specific type/style of content is outperforming? Give a specific multiplier or stat from the data (e.g. "posts about X get 3.1× more impressions"). Be specific to THIS person's content.
2. contentGap: What topics/formats appear in their repos/expertise but barely in their posts? Name specific gaps. Detail should reference specific data evidence.
3. topTopics: Top 5 topics that have performed best (infer from content text, titles, repo names). Score 1-5.
4. topFormats: Top 5 content formats and their relative performance multipliers vs average. Examples: "Technical walkthroughs", "Personal failure stories", "Architecture diagrams", "Code-heavy posts", "Opinion/contrarian takes".
5. quickStat: One striking data point (e.g. "Your top post has 47× the impressions of your average post").

Be specific. Use real numbers from the data. Do not invent numbers — if unsure, describe patterns without made-up multipliers.`;

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: InsightsSchema,
      prompt,
    });

    const payload = { insights: object, meta: {
      liCount: liPosts.length,
      medCount: medWithClaps.length,
      subCount: subPosts.length,
      ghCount: ghRepos.length,
    }};

    // Upsert cache
    await sql`
      INSERT INTO insights_cache (user_id, data, generated_at)
      VALUES (${user.id}, ${JSON.stringify(payload)}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, generated_at = NOW()
    `;

    return NextResponse.json({ ...payload, cached: false, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[/api/insights error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

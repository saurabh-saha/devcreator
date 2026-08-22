import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// ─── Inline schema ────────────────────────────────────────────────────────────
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
}, (t) => [index("pa_brain_idx").on(t.userId, t.platform)]);

const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  sourceType: text("source_type").notNull(),
  sourceRef: text("source_ref"),
  title: text("title"),
  body: text("body").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("kd_brain_idx").on(t.userId)]);

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


// ─── Platform fetchers ────────────────────────────────────────────────────────
async function fetchGitHub(token: string, handle: string) {
  const repos = await fetch(
    `https://api.github.com/users/${handle}/repos?sort=updated&per_page=10&type=owner`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": "DevCreator" } }
  ).then(r => r.json()).catch(() => []);

  const docs: { title: string; body: string; sourceRef: string }[] = [];
  for (const repo of (repos as any[]).slice(0, 6)) {
    const readmeRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/readme`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw", "User-Agent": "DevCreator" } }
    );
    if (readmeRes.ok) {
      const text = await readmeRes.text();
      docs.push({ title: `GitHub: ${repo.full_name}`, body: text.slice(0, 3000), sourceRef: repo.html_url });
    }
    // Also use repo description
    if (repo.description) {
      docs.push({ title: `Repo: ${repo.name}`, body: `${repo.name}: ${repo.description}. Topics: ${(repo.topics ?? []).join(", ")}`, sourceRef: repo.html_url });
    }
  }
  return docs;
}

async function fetchMedium(handle: string) {
  const rss = await fetch(`https://medium.com/feed/@${handle}`, {
    headers: { "User-Agent": "DevCreator" },
  }).then(r => r.text()).catch(() => "");
  return parseRSS(rss).map(i => ({ title: `Medium: ${i.title}`, body: i.body, sourceRef: i.link }));
}

async function fetchSubstack(handle: string) {
  const rss = await fetch(`https://${handle}.substack.com/feed`, {
    headers: { "User-Agent": "DevCreator" },
  }).then(r => r.text()).catch(() => "");
  return parseRSS(rss).map(i => ({ title: `Substack: ${i.title}`, body: i.body, sourceRef: i.link }));
}

// ─── Gemini analysis ──────────────────────────────────────────────────────────
const ProfileSchema = z.object({
  expertise: z.array(z.string()).describe("Top technical/domain expertise areas (max 8)"),
  topics: z.array(z.string()).describe("Content topics this person covers (max 10)"),
  tone: z.string().describe("Writing tone: educational, conversational, technical, inspirational, analytical"),
  targetAudience: z.string().describe("Who this person's content is aimed at"),
  contentPillars: z.array(z.string()).describe("3-5 core content pillars / themes"),
  voiceSummary: z.string().describe("2-3 sentence summary of their unique voice and positioning as a creator"),
});

async function analyzeContent(name: string, docs: { title: string; body: string }[]) {
  const corpus = docs.slice(0, 20).map(d => `## ${d.title}\n${d.body}`).join("\n\n---\n\n");
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: ProfileSchema,
    mode: "tool",
    system: `You are analyzing a creator's content to build their Creator Brain profile. Be specific and accurate based only on what you read.`,
    prompt: `Analyze this content from ${name} and extract their creator profile:\n\n${corpus.slice(0, 40000)}`,
    maxTokens: 2000,
  });
  return object;
}

// ─── SSE handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = (stepIndex: number, status: "active" | "done" | "error", detail?: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ stepIndex, status, detail })}\n\n`));
  };

  (async () => {
    try {
      

      // Step 0: Load connected accounts
      send(0, "active");
      const [user] = await db.select().from(users).where(eq(users.email, session.user!.email!));
      if (!user) { send(0, "error", "User not found"); writer.close(); return; }
      const accounts = await db.select().from(platformAccounts).where(eq(platformAccounts.userId, user.id));
      send(0, "done", `${accounts.length} platforms`);

      // Step 1: Import content
      send(1, "active");
      const allDocs: { title: string; body: string; sourceRef: string; sourceType: string }[] = [];

      for (const acc of accounts) {
        try {
          if (acc.platform === "github") {
            const docs = await fetchGitHub(acc.accessToken, acc.handle);
            docs.forEach(d => allDocs.push({ ...d, sourceType: "github_readme" }));
          } else if (acc.platform === "medium") {
            const docs = await fetchMedium(acc.handle);
            docs.forEach(d => allDocs.push({ ...d, sourceType: "medium_article" }));
          } else if (acc.platform === "substack") {
            const docs = await fetchSubstack(acc.handle);
            docs.forEach(d => allDocs.push({ ...d, sourceType: "substack_post" }));
          } else if (acc.platform === "linkedin") {
            allDocs.push({ title: "LinkedIn Profile", body: `Creator: ${user.name}. LinkedIn handle: ${acc.handle}.`, sourceRef: "", sourceType: "linkedin_profile" });
          }
        } catch { /* skip failed platform */ }
      }

      // Save to knowledge_documents (clear old ones first)
      await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.userId, user.id));
      if (allDocs.length > 0) {
        await db.insert(knowledgeDocuments).values(
          allDocs.map(d => ({ userId: user.id, sourceType: d.sourceType, sourceRef: d.sourceRef, title: d.title, body: d.body }))
        );
      }
      send(1, "done", `${allDocs.length} items imported`);

      // Step 2: Analyze posts
      send(2, "active");
      await new Promise(r => setTimeout(r, 500)); // brief pause for UX
      send(2, "done");

      // Step 3: Identify topics (runs Gemini)
      send(3, "active");
      const profile = await analyzeContent(user.name, allDocs);
      send(3, "done", profile.topics.slice(0, 3).join(", "));

      // Step 4: Map engagement patterns
      send(4, "active");
      await new Promise(r => setTimeout(r, 400));
      send(4, "done", profile.tone);

      // Step 5: Build creator profile
      send(5, "active");
      const existing = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, user.id));
      if (existing.length > 0) {
        await db.update(creatorProfiles).set({
          expertise: profile.expertise,
          topics: profile.topics,
          tone: profile.tone,
          targetAudience: profile.targetAudience,
          contentPillars: profile.contentPillars,
          voiceSummary: profile.voiceSummary,
          updatedAt: new Date(),
        }).where(eq(creatorProfiles.userId, user.id));
      } else {
        await db.insert(creatorProfiles).values({
          userId: user.id,
          expertise: profile.expertise,
          topics: profile.topics,
          tone: profile.tone,
          targetAudience: profile.targetAudience,
          contentPillars: profile.contentPillars,
          voiceSummary: profile.voiceSummary,
        });
      }
      send(5, "done");

      writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
    } catch (e) {
      writer.write(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

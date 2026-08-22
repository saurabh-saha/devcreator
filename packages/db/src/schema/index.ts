import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
// vector import removed for Phase 1 — no embeddings until Phase 2

// Enums
export const platformEnum = pgEnum("platform", [
  "linkedin",
  "instagram",
  "youtube",
  "x",
  "medium",
  "substack",
  "github",
  "notion",
  "google_drive",
]);

export const contentFormatEnum = pgEnum("content_format", [
  "post",
  "carousel",
  "reel",
  "short",
  "video",
  "article",
  "newsletter",
  "script",
  "thread",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "idea",
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const insightTypeEnum = pgEnum("insight_type", [
  "performance",
  "audience",
  "content_gap",
  "trend",
  "recommendation",
]);

// Tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creatorProfiles = pgTable("creator_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  expertise: text("expertise").array().notNull().default([]),
  topics: text("topics").array().notNull().default([]),
  tone: text("tone").notNull().default("educational"),
  targetAudience: text("target_audience"),
  contentPillars: text("content_pillars").array().notNull().default([]),
  voiceSummary: text("voice_summary"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const platformAccounts = pgTable(
  "platform_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    platform: platformEnum("platform").notNull(),
    handle: text("handle").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    followerCount: integer("follower_count").notNull().default(0),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
  },
  (t) => [index("platform_accounts_user_platform_idx").on(t.userId, t.platform)]
);

export const content = pgTable(
  "content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    platform: platformEnum("platform").notNull(),
    platformId: text("platform_id"),
    format: contentFormatEnum("format").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    topics: text("topics").array().notNull().default([]),
    status: contentStatusEnum("status").notNull().default("published"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Phase 2: embedding vector(1536)
  },
  (t) => [
    index("content_user_idx").on(t.userId),
    index("content_platform_idx").on(t.platform),
  ]
);

export const contentPerformance = pgTable(
  "content_performance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => content.id),
    platform: platformEnum("platform").notNull(),
    views: integer("views").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    engagementRate: real("engagement_rate").notNull().default(0),
    followersDelta: integer("followers_delta").notNull().default(0),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [index("perf_content_idx").on(t.contentId)]
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    sourceType: text("source_type").notNull(), // "content", "github_readme", "article", "manual"
    sourceRef: text("source_ref"),
    title: text("title"),
    body: text("body").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Phase 2: embedding vector(1536)
  },
  (t) => [
    index("knowledge_user_idx").on(t.userId),
  ]
);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    hook: text("hook").notNull(),
    description: text("description").notNull(),
    targetAudience: text("target_audience").notNull(),
    recommendedFormats: text("recommended_formats").array().notNull().default([]),
    recommendedPlatforms: text("recommended_platforms").array().notNull().default([]),
    topics: text("topics").array().notNull().default([]),
    estimatedImpact: text("estimated_impact").notNull().default("medium"),
    sourceType: text("source_type").notNull().default("ai_generated"),
    sourceRef: text("source_ref"),
    savedAt: timestamp("saved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ideas_user_idx").on(t.userId)]
);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  targetAudience: text("target_audience").notNull(),
  durationWeeks: integer("duration_weeks").notNull().default(4),
  status: text("status").notNull().default("planning"),
  startDate: timestamp("start_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: insightTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("insights_user_idx").on(t.userId)]
);

export const linkedinPosts = pgTable(
  "linkedin_posts",
  {
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
  },
  (t) => [index("linkedin_posts_user_idx").on(t.userId)]
);

export const mediumClaps = pgTable(
  "medium_claps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    articleUrl: text("article_url").notNull(),
    clapCount: integer("clap_count").notNull().default(0),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
  },
  (t) => [index("medium_claps_user_idx").on(t.userId)]
);

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

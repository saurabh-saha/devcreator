// Platform types
export type Platform =
  | "linkedin"
  | "instagram"
  | "youtube"
  | "x"
  | "medium"
  | "substack"
  | "github"
  | "notion"
  | "google_drive";

export type ContentFormat =
  | "post"
  | "carousel"
  | "reel"
  | "short"
  | "video"
  | "article"
  | "newsletter"
  | "script"
  | "thread";

export type ContentStatus =
  | "idea"
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

export type CreatorTone =
  | "technical"
  | "conversational"
  | "humorous"
  | "provocative"
  | "educational";

// Core entities
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  expertise: string[];
  topics: Topic[];
  tone: CreatorTone;
  targetAudience: string;
  contentPillars: string[];
  voiceSummary: string | null;
  updatedAt: Date;
}

export interface PlatformAccount {
  id: string;
  userId: string;
  platform: Platform;
  handle: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  followerCount: number;
  connectedAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface Content {
  id: string;
  userId: string;
  platform: Platform;
  platformId: string | null;
  format: ContentFormat;
  title: string | null;
  body: string;
  topics: string[];
  status: ContentStatus;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface ContentPerformance {
  id: string;
  contentId: string;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  followersDelta: number;
  fetchedAt: Date;
}

export interface Idea {
  id: string;
  userId: string;
  title: string;
  hook: string;
  description: string;
  targetAudience: string;
  recommendedFormats: ContentFormat[];
  recommendedPlatforms: Platform[];
  topics: string[];
  estimatedImpact: "low" | "medium" | "high";
  sourceType: "ai_generated" | "gap_analysis" | "trend" | "repurpose";
  sourceRef: string | null;
  createdAt: Date;
}

export interface Campaign {
  id: string;
  userId: string;
  title: string;
  goal: string;
  targetAudience: string;
  durationWeeks: number;
  status: "planning" | "active" | "paused" | "completed";
  startDate: Date | null;
  createdAt: Date;
}

export interface Insight {
  id: string;
  userId: string;
  type:
    | "performance"
    | "audience"
    | "content_gap"
    | "trend"
    | "recommendation";
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

// AI types
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IdeaGenerationRequest {
  userId: string;
  targetAudience?: string;
  topics?: string[];
  count?: number;
  platform?: Platform;
}

export interface ContentGenerationRequest {
  userId: string;
  ideaId?: string;
  topic: string;
  format: ContentFormat;
  platform: Platform;
  tone?: CreatorTone;
  additionalContext?: string;
}

export interface RepurposeRequest {
  userId: string;
  sourceContentId: string;
  targetFormat: ContentFormat;
  targetPlatform: Platform;
}

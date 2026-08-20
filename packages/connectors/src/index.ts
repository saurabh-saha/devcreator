export * from "./linkedin/index.js";
export * from "./instagram/index.js";
export * from "./youtube/index.js";
export * from "./github/index.js";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PlatformPost {
  platformId: string;
  body: string;
  title?: string;
  publishedAt: Date;
  url?: string;
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
}

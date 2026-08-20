import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { inngest } from "../inngest/client.js";
import { db, platformAccounts } from "@devcreator/db";
import { LinkedInConnector } from "@devcreator/connectors/linkedin";
import { InstagramConnector } from "@devcreator/connectors/instagram";
import { YouTubeConnector } from "@devcreator/connectors/youtube";
import { GitHubConnector } from "@devcreator/connectors/github";

export const connectorsRoutes = new Hono();

// OAuth initiation — redirect to platform
connectorsRoutes.get("/oauth/:platform/start", async (c) => {
  const platform = c.req.param("platform");
  const userId = c.req.query("userId")!;
  const state = Buffer.from(JSON.stringify({ userId, platform })).toString("base64url");
  const redirectUri = `${process.env.API_URL}/api/connectors/oauth/${platform}/callback`;

  const urls: Record<string, string> = {
    linkedin: LinkedInConnector.getOAuthUrl(process.env.LINKEDIN_CLIENT_ID!, redirectUri, state),
    instagram: InstagramConnector.getOAuthUrl(process.env.INSTAGRAM_APP_ID!, redirectUri, state),
    youtube: YouTubeConnector.getOAuthUrl(process.env.GOOGLE_CLIENT_ID!, redirectUri, state),
    github: GitHubConnector.getOAuthUrl(process.env.GITHUB_CLIENT_ID!, redirectUri, state),
  };

  const url = urls[platform];
  if (!url) return c.json({ error: "Unknown platform" }, 400);
  return c.redirect(url);
});

// OAuth callback — exchange code and trigger ingestion
connectorsRoutes.get("/oauth/:platform/callback", async (c) => {
  const platform = c.req.param("platform");
  const code = c.req.query("code")!;
  const state = JSON.parse(Buffer.from(c.req.query("state")!, "base64url").toString());
  const { userId } = state;
  const redirectUri = `${process.env.API_URL}/api/connectors/oauth/${platform}/callback`;

  let tokens;
  let eventData: Record<string, unknown> = { userId };

  switch (platform) {
    case "linkedin": {
      tokens = await LinkedInConnector.exchangeCode(
        code, process.env.LINKEDIN_CLIENT_ID!, process.env.LINKEDIN_CLIENT_SECRET!, redirectUri
      );
      const li = new LinkedInConnector(tokens);
      const profile = await li.getProfile();
      eventData = { ...eventData, accessToken: tokens.accessToken, authorId: profile.id };
      break;
    }
    case "instagram": {
      tokens = await InstagramConnector.exchangeCode(
        code, process.env.INSTAGRAM_APP_ID!, process.env.INSTAGRAM_APP_SECRET!, redirectUri
      );
      eventData = { ...eventData, accessToken: tokens.accessToken };
      break;
    }
    case "youtube": {
      tokens = await YouTubeConnector.exchangeCode(
        code, process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, redirectUri
      );
      const yt = new YouTubeConnector(tokens);
      const channel = await yt.getChannel();
      eventData = { ...eventData, accessToken: tokens.accessToken, channelId: channel.id };
      break;
    }
    case "github": {
      tokens = await GitHubConnector.exchangeCode(
        code, process.env.GITHUB_CLIENT_ID!, process.env.GITHUB_CLIENT_SECRET!
      );
      const gh = new GitHubConnector(tokens);
      const user = await gh.getUser();
      eventData = { ...eventData, accessToken: tokens.accessToken, username: user.login };
      break;
    }
    default:
      return c.json({ error: "Unknown platform" }, 400);
  }

  await db.insert(platformAccounts).values({
    userId,
    platform: platform as "linkedin" | "instagram" | "youtube" | "github",
    handle: String(eventData.authorId ?? eventData.username ?? ""),
    accessToken: tokens!.accessToken,
    refreshToken: tokens!.refreshToken ?? null,
    expiresAt: tokens!.expiresAt ?? null,
    followerCount: 0,
  }).onConflictDoNothing();

  // Trigger background ingestion workflow
  await inngest.send({ name: `platform/${platform}.connected`, data: eventData });

  return c.redirect(`${process.env.WEB_URL}/integrations?connected=${platform}`);
});

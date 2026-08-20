import { inngest } from "./client.js";
import { db, content, contentPerformance, knowledgeDocuments } from "@devcreator/db";
import { LinkedInConnector } from "@devcreator/connectors/linkedin";
import { InstagramConnector } from "@devcreator/connectors/instagram";
import { YouTubeConnector } from "@devcreator/connectors/youtube";
import { GitHubConnector } from "@devcreator/connectors/github";

// ─── Platform ingestion ───────────────────────────────────────────────────────

export const ingestLinkedIn = inngest.createFunction(
  { id: "ingest-linkedin", name: "Ingest LinkedIn content" },
  { event: "platform/linkedin.connected" },
  async ({ event, step }) => {
    const { userId, accessToken, platformAccountId, authorId } = event.data;

    const posts = await step.run("fetch-posts", async () => {
      const connector = new LinkedInConnector({ accessToken });
      return connector.getPosts(authorId, 50);
    });

    await step.run("store-posts", async () => {
      for (const post of posts) {
        await db
          .insert(content)
          .values({
            userId,
            platform: "linkedin",
            platformId: post.platformId,
            format: "post",
            body: post.body,
            status: "published",
            publishedAt: new Date(post.publishedAt as unknown as string),
          })
          .onConflictDoNothing();
      }
    });

    await step.sendEvent("trigger-analysis", {
      name: "creator/profile.update-requested",
      data: { userId },
    });
  }
);

export const ingestYouTube = inngest.createFunction(
  { id: "ingest-youtube", name: "Ingest YouTube videos" },
  { event: "platform/youtube.connected" },
  async ({ event, step }) => {
    const { userId, accessToken, channelId } = event.data;

    const videos = await step.run("fetch-videos", async () => {
      const connector = new YouTubeConnector({ accessToken });
      return connector.getVideos(channelId, 30);
    });

    await step.run("store-videos", async () => {
      for (const video of videos) {
        await db
          .insert(content)
          .values({
            userId,
            platform: "youtube",
            platformId: video.platformId,
            format: "video",
            title: video.title,
            body: video.body,
            status: "published",
            publishedAt: new Date(video.publishedAt as unknown as string),
          })
          .onConflictDoNothing();

        if (video.metrics) {
          await db.insert(contentPerformance).values({
            contentId: video.platformId,
            platform: "youtube",
            views: video.metrics.views ?? 0,
            likes: video.metrics.likes ?? 0,
            comments: video.metrics.comments ?? 0,
            shares: 0,
            saves: 0,
            engagementRate: 0,
            followersDelta: 0,
          });
        }
      }
    });
  }
);

export const ingestGitHub = inngest.createFunction(
  { id: "ingest-github", name: "Ingest GitHub repos for knowledge base" },
  { event: "platform/github.connected" },
  async ({ event, step }) => {
    const { userId, accessToken, username } = event.data;

    const repos = await step.run("fetch-repos", async () => {
      const connector = new GitHubConnector({ accessToken });
      return connector.getPublicRepos(username);
    });

    await step.run("store-knowledge", async () => {
      for (const repo of repos) {
        if (!repo.readmeContent && !repo.description) continue;
        await db.insert(knowledgeDocuments).values({
          userId,
          sourceType: "github_readme",
          sourceRef: repo.url,
          title: repo.name,
          body: [repo.description, repo.readmeContent].filter(Boolean).join("\n\n"),
          metadata: { topics: repo.topics, language: repo.language, stars: repo.stargazersCount },
        });
      }
    });
  }
);

// ─── Scheduled analytics refresh ─────────────────────────────────────────────

export const refreshAnalytics = inngest.createFunction(
  { id: "refresh-analytics", name: "Daily analytics refresh" },
  { cron: "0 6 * * *" }, // 6 AM daily
  async ({ step }) => {
    // TODO: fetch updated metrics for all connected platform accounts
    await step.run("refresh", async () => {
      console.log("Analytics refresh job running");
    });
  }
);

// ─── Creator profile update ───────────────────────────────────────────────────

export const updateCreatorProfile = inngest.createFunction(
  { id: "update-creator-profile", name: "Rebuild creator profile from content" },
  { event: "creator/profile.update-requested" },
  async ({ event, step }) => {
    const { userId } = event.data;
    // TODO: pull all content for user, run AI analysis, update creator_profiles
    await step.run("analyze", async () => {
      console.log(`Rebuilding creator profile for user ${userId}`);
    });
  }
);

export const functions = [
  ingestLinkedIn,
  ingestYouTube,
  ingestGitHub,
  refreshAnalytics,
  updateCreatorProfile,
];

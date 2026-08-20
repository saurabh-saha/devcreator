import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, creatorProfiles, content } from "@devcreator/db";
import { writeContent, repurposeContent } from "@devcreator/ai";
import { eq } from "drizzle-orm";

export const contentRoutes = new Hono();

contentRoutes.post("/generate", zValidator("json", z.object({
  userId: z.string(),
  topic: z.string(),
  format: z.enum(["post", "carousel", "reel", "short", "video", "article", "newsletter", "script", "thread"]),
  platform: z.enum(["linkedin", "instagram", "youtube", "x", "medium", "substack", "github", "notion", "google_drive"]),
  additionalContext: z.string().optional(),
})), async (c) => {
  const { userId, topic, format, platform, additionalContext } = c.req.valid("json");

  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);

  if (!profile) return c.json({ error: "Creator profile not found" }, 404);

  const samples = await db
    .select({ body: content.body })
    .from(content)
    .where(eq(content.userId, userId))
    .limit(3);

  return streamSSE(c, async (stream) => {
    const result = await writeContent({
      topic,
      format,
      platform,
      tone: profile.tone as "technical" | "conversational" | "humorous" | "provocative" | "educational",
      voiceSummary: profile.voiceSummary ?? "",
      expertise: profile.expertise,
      additionalContext,
      existingSampleContent: samples.map((s) => s.body).join("\n\n---\n\n"),
    });

    for await (const chunk of result.textStream) {
      await stream.writeSSE({ data: chunk });
    }
    await stream.writeSSE({ data: "[DONE]" });
  });
});

contentRoutes.post("/repurpose", zValidator("json", z.object({
  userId: z.string(),
  sourceContentId: z.string(),
  targetFormat: z.enum(["post", "carousel", "reel", "short", "video", "article", "newsletter", "script", "thread"]),
  targetPlatform: z.enum(["linkedin", "instagram", "youtube", "x", "medium", "substack", "github", "notion", "google_drive"]),
})), async (c) => {
  const { userId, sourceContentId, targetFormat, targetPlatform } = c.req.valid("json");

  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId)).limit(1);
  const [source] = await db.select().from(content).where(eq(content.id, sourceContentId)).limit(1);

  if (!profile || !source) return c.json({ error: "Not found" }, 404);

  return streamSSE(c, async (stream) => {
    const result = await repurposeContent({
      sourceContent: source.body,
      sourcePlatform: source.platform,
      targetFormat,
      targetPlatform,
      tone: profile.tone as "technical" | "conversational" | "humorous" | "provocative" | "educational",
      voiceSummary: profile.voiceSummary ?? "",
    });

    for await (const chunk of result.textStream) {
      await stream.writeSSE({ data: chunk });
    }
    await stream.writeSSE({ data: "[DONE]" });
  });
});

contentRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const userContent = await db
    .select()
    .from(content)
    .where(eq(content.userId, userId))
    .orderBy(content.publishedAt)
    .limit(50);
  return c.json({ content: userContent });
});

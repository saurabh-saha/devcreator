import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, creatorProfiles, content } from "@devcreator/db";
import { chatWithCreatorBrain } from "@devcreator/ai";
import { eq } from "drizzle-orm";

export const chatRoutes = new Hono();

const ChatSchema = z.object({
  userId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

chatRoutes.post("/", zValidator("json", ChatSchema), async (c) => {
  const { userId, messages } = c.req.valid("json");

  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);

  if (!profile) return c.json({ error: "Creator profile not found" }, 404);

  const recentContent = await db
    .select()
    .from(content)
    .where(eq(content.userId, userId))
    .limit(10);

  return streamSSE(c, async (stream) => {
    const result = await chatWithCreatorBrain(messages, {
      profile: {
        ...profile,
        topics: profile.topics.map((t) => ({ id: t, name: t, slug: t, parentId: null })),
        tone: profile.tone as "technical" | "conversational" | "humorous" | "provocative" | "educational",
      },
      recentContent: recentContent.map((c) => ({
        title: c.title ?? "",
        body: c.body,
        platform: c.platform,
      })),
      topInsights: [],
    });

    for await (const chunk of result.textStream) {
      await stream.writeSSE({ data: chunk });
    }
    await stream.writeSSE({ data: "[DONE]" });
  });
});

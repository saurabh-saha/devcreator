import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, creatorProfiles, ideas, content } from "@devcreator/db";
import { generateIdeas } from "@devcreator/ai";
import { eq } from "drizzle-orm";

export const ideasRoutes = new Hono();

ideasRoutes.post("/generate", zValidator("json", z.object({
  userId: z.string(),
  targetAudience: z.string().optional(),
  count: z.number().min(1).max(20).default(10),
})), async (c) => {
  const { userId, targetAudience, count } = c.req.valid("json");

  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);

  if (!profile) return c.json({ error: "Creator profile not found" }, 404);

  const existingTopics = await db
    .select({ topics: content.topics })
    .from(content)
    .where(eq(content.userId, userId));

  const allTopics = [...new Set(existingTopics.flatMap((r) => r.topics))];

  const generatedIdeas = await generateIdeas({
    profile: {
      ...profile,
      topics: profile.topics.map((t) => ({ id: t, name: t, slug: t, parentId: null })),
      tone: profile.tone as "technical" | "conversational" | "humorous" | "provocative" | "educational",
    },
    existingTopics: allTopics,
    targetAudience,
    count,
  });

  return c.json({ ideas: generatedIdeas });
});

ideasRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const userIdeas = await db
    .select()
    .from(ideas)
    .where(eq(ideas.userId, userId))
    .orderBy(ideas.createdAt)
    .limit(50);
  return c.json({ ideas: userIdeas });
});

ideasRoutes.post("/:id/save", async (c) => {
  const id = c.req.param("id");
  await db.update(ideas).set({ savedAt: new Date() }).where(eq(ideas.id, id));
  return c.json({ ok: true });
});

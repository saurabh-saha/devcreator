import { Hono } from "hono";
import { db, insights } from "@devcreator/db";
import { eq, desc } from "drizzle-orm";

export const insightsRoutes = new Hono();

insightsRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const userInsights = await db
    .select()
    .from(insights)
    .where(eq(insights.userId, userId))
    .orderBy(desc(insights.createdAt))
    .limit(20);
  return c.json({ insights: userInsights });
});

import { Hono } from "hono";
import { db, content, contentPerformance } from "@devcreator/db";
import { eq, desc, avg, sql } from "drizzle-orm";

export const analyticsRoutes = new Hono();

analyticsRoutes.get("/:userId/overview", async (c) => {
  const userId = c.req.param("userId");

  const totalContent = await db
    .select({ count: sql<number>`count(*)` })
    .from(content)
    .where(eq(content.userId, userId));

  const topContent = await db
    .select({
      id: content.id,
      title: content.title,
      body: content.body,
      platform: content.platform,
      format: content.format,
      publishedAt: content.publishedAt,
      views: contentPerformance.views,
      likes: contentPerformance.likes,
      engagementRate: contentPerformance.engagementRate,
    })
    .from(content)
    .leftJoin(contentPerformance, eq(content.id, contentPerformance.contentId))
    .where(eq(content.userId, userId))
    .orderBy(desc(contentPerformance.engagementRate))
    .limit(10);

  const avgEngagement = await db
    .select({ avg: avg(contentPerformance.engagementRate) })
    .from(contentPerformance)
    .leftJoin(content, eq(contentPerformance.contentId, content.id))
    .where(eq(content.userId, userId));

  return c.json({
    totalContent: totalContent[0]?.count ?? 0,
    avgEngagementRate: avgEngagement[0]?.avg ?? 0,
    topContent,
  });
});

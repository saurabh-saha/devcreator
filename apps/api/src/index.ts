import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "inngest/hono";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions.js";
import { chatRoutes } from "./routes/chat.js";
import { contentRoutes } from "./routes/content.js";
import { ideasRoutes } from "./routes/ideas.js";
import { connectorsRoutes } from "./routes/connectors.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { insightsRoutes } from "./routes/insights.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// Inngest webhook endpoint — durable background workflows
app.on(
  ["GET", "PUT", "POST"],
  "/api/inngest",
  serve({ client: inngest, functions })
);

// API routes
app.route("/api/chat", chatRoutes);
app.route("/api/content", contentRoutes);
app.route("/api/ideas", ideasRoutes);
app.route("/api/connectors", connectorsRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/insights", insightsRoutes);

app.get("/health", (c) => c.json({ ok: true }));

export default {
  port: parseInt(process.env.PORT ?? "4000"),
  fetch: app.fetch,
};

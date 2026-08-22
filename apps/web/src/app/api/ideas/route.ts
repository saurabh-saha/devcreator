import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const IdeaSchema = z.object({
  ideas: z.array(z.object({
    title: z.string(),
    hook: z.string().describe("The actual opening line of the content, in quotes"),
    score: z.number().int().min(1).max(100).describe("Predicted performance score 1-100 vs creator's average. Must be a whole integer."),
    impact: z.enum(["High", "Medium", "Low"]),
    rationale: z.string().describe("Why this will perform well, based on creator's history"),
    formats: z.array(z.string()).describe("Recommended platforms/formats e.g. LinkedIn, YouTube Short, Carousel"),
    audience: z.string().describe("Primary target segment"),
  })),
});

const SYSTEM = `You are an expert content strategist for Saurabh Saha, a developer-creator.

Saurabh's expertise: AI agents, backend engineering, Kafka/streaming, system architecture, engineering leadership.
Audience: Software engineers (67%), engineering managers (18%), technical founders (9%).

What performs well for Saurabh:
- Contrarian takes grounded in production experience
- Visual analogies (Kafka Consumer Groups with email inbox = 4.2× average)
- First-line hooks that are specific, concrete, and relatable
- Practical over theoretical — shows working code or real decisions
- Personal experience over generic advice

Generate ideas that are specific, grounded in his expertise, and likely to outperform his average.`;

export async function POST(req: Request) {
  const { audience, topic, goal, platform, count } = await req.json();

  const prompt = `Generate ${count ?? 10} content ideas for Saurabh.
Audience: ${audience ?? "AI Engineers"}
Topic focus: ${topic ?? "Agentic AI"}
Goal: ${goal ?? "Build authority"}
Platform: ${platform ?? "All platforms"}

Make the hooks punchy, specific, and original. Score based on predicted performance vs his historical average.`;

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    mode: "json",
    system: SYSTEM + "\n\nIMPORTANT: Output ONLY valid JSON. No markdown, no backticks, no code fences. All string values must use standard double quotes only.",
    prompt,
    schema: IdeaSchema,
    maxTokens: 8000,
  });

  return Response.json(object);
}

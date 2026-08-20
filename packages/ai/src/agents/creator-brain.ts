import { streamText, generateText } from "ai";
import { getModel } from "../router.js";
import type { ChatMessage, CreatorProfile } from "@devcreator/types";

interface CreatorBrainContext {
  profile: CreatorProfile;
  recentContent: Array<{ title: string; body: string; platform: string; performance?: unknown }>;
  topInsights: string[];
}

export function buildSystemPrompt(ctx: CreatorBrainContext): string {
  return `You are the Creator Brain for ${ctx.profile.targetAudience ? `a creator targeting ${ctx.profile.targetAudience}` : "a technical creator"}.

You have deep knowledge of this creator's:
- Expertise areas: ${ctx.profile.expertise.join(", ")}
- Content pillars: ${ctx.profile.contentPillars.join(", ")}
- Voice and tone: ${ctx.profile.tone}
- Topics: ${ctx.profile.topics.map((t) => t.name).join(", ")}

Voice summary:
${ctx.profile.voiceSummary ?? "Not yet analyzed."}

Recent content performance insights:
${ctx.topInsights.join("\n")}

You help the creator:
1. Understand what content is performing and why
2. Discover content gaps and opportunities
3. Generate ideas tailored to their expertise and audience
4. Create content in their voice
5. Repurpose existing content across platforms
6. Understand their audience

Always answer using the creator's actual data. Be specific, not generic.
When suggesting ideas, tie them to the creator's known expertise.
When analyzing performance, explain the "why" not just the numbers.`;
}

export async function chatWithCreatorBrain(
  messages: ChatMessage[],
  ctx: CreatorBrainContext
) {
  const systemPrompt = buildSystemPrompt(ctx);

  return streamText({
    model: getModel("chat"),
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });
}

export async function generateInsights(ctx: CreatorBrainContext): Promise<string[]> {
  const { text } = await generateText({
    model: getModel("analysis"),
    system:
      "You are an expert content strategist analyzing creator performance data. Return a JSON array of insight strings.",
    prompt: `Analyze this creator's data and generate 5 actionable insights:
Expertise: ${ctx.profile.expertise.join(", ")}
Content topics: ${ctx.profile.topics.map((t) => t.name).join(", ")}
Recent content sample: ${JSON.stringify(ctx.recentContent.slice(0, 5))}

Return JSON array: ["insight 1", "insight 2", ...]`,
  });

  try {
    return JSON.parse(text) as string[];
  } catch {
    return [text];
  }
}

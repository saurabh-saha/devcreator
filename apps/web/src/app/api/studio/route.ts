import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { auth } from "@/auth";

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  li: `Write a LinkedIn post. Short punchy paragraphs (1-3 lines max). Use → or — for lists. End with 3-5 hashtags. No headers. Hook must grab on first line. 150-300 words.`,
  yt: `Write a YouTube video script. Sections: [HOOK 0:00-0:15], labeled sections with timestamps, [OUTRO]. Include b-roll notes in brackets. 600-900 words. Conversational tone.`,
  sh: `Write a YouTube Short / Reel script. Max 60 seconds. Sections: [0:00-0:03 HOOK], [0:03-0:45 CONTENT], [0:45-0:58 CTA]. Fast-paced, visual. 150-200 words.`,
  ca: `Write a LinkedIn carousel. 8-10 slides. Format: "Slide N: TITLE\\n[content/visual note]". Cover slide must hook. Last slide = save-worthy insight or CTA.`,
  ar: `Write a technical blog article. Use ## headers. Include code examples in backtick fences where relevant. Practical, opinionated, grounded in real experience. 600-900 words.`,
  th: `Write a Twitter/X thread. Number tweets 1/, 2/, etc. Max 280 chars each. 8-12 tweets. Hook tweet must standalone. End with RT/save CTA.`,
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { idea, format } = await req.json();
  if (!idea || !format) return Response.json({ error: "Missing idea or format" }, { status: 400 });

  const result = streamText({
    model: google("gemini-2.5-flash"),
    prompt: `You are writing content for Saurabh Saha, a developer-creator. His voice: direct, opinionated, grounded in real production experience. No fluff. No generic advice. Write from first-person perspective.

IDEA TITLE: ${idea.title}
OPENING HOOK: ${idea.hook}
RATIONALE: ${idea.rationale}
TARGET AUDIENCE: ${idea.audience}

FORMAT INSTRUCTIONS: ${FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.li}

Write the full content now. Output the content directly — no preamble, no "Here is your post:".`,
    maxTokens: 2000,
  });

  return result.toTextStreamResponse();
}

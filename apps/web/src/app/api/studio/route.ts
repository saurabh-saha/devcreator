import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
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

  const prompt = `You are writing content for a developer-creator. Voice: direct, opinionated, grounded in real production experience. No fluff. No generic advice. First-person perspective.

IDEA TITLE: ${idea.title}
HOOK: ${idea.hook}
AUDIENCE: ${idea.audience}

FORMAT: ${FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.li}

Output the content directly — no preamble.`;

  const groq = process.env.GROQ_API_KEY ? createGroq({ apiKey: process.env.GROQ_API_KEY }) : null;
  const MODELS = [
    { model: google("gemini-2.5-flash") },
    ...(groq ? [{ model: groq("groq/compound") }] : []),
  ];

  for (const { model } of MODELS) {
    try {
      const { text } = await generateText({ model, prompt, maxTokens: 2000 });
      return new Response(text, { headers: { "Content-Type": "text/plain" } });
    } catch (err: any) {
      const msg = (err?.message ?? "").toLowerCase();
      const isQuota = msg.includes("quota") || msg.includes("rate") || msg.includes("spend") || msg.includes("exhausted") || err?.status === 429 || err?.statusCode === 429;
      if (!isQuota) throw err;
    }
  }

  return Response.json({ error: "AI generation failed. Please retry." }, { status: 503 });
}

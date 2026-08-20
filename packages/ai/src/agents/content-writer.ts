import { generateText, streamText } from "ai";
import { getModel } from "../router.js";
import type { ContentFormat, Platform, CreatorTone } from "@devcreator/types";

const FORMAT_INSTRUCTIONS: Record<ContentFormat, string> = {
  post: "Write a LinkedIn/X post. Max 3000 chars for LinkedIn, 280 for X. No hashtag spam. Hook in first line.",
  carousel:
    "Write a carousel script. Return as JSON array of slides: [{title, body, visualNote}]. Max 10 slides.",
  reel: "Write a Reel/Short script. 30-60 seconds spoken. Hook in first 3 seconds. Include [B-ROLL] notes.",
  short: "Write a YouTube Short script. 45-60 seconds. Conversational, high energy.",
  video:
    "Write a full YouTube video script. 8-12 minutes. Include intro hook, sections with [VISUAL] notes, CTA.",
  article:
    "Write a technical article. 1000-2000 words. Clear sections, code examples if relevant, conversational but authoritative.",
  newsletter: "Write a newsletter edition. Personal opening, one main idea, 3 takeaways, CTA.",
  script: "Write a general video script with clear sections and timing notes.",
  thread: "Write an X thread. First tweet is the hook. 8-15 tweets. Numbered. Last tweet = CTA.",
};

interface ContentWriterOptions {
  topic: string;
  format: ContentFormat;
  platform: Platform;
  tone: CreatorTone;
  voiceSummary: string;
  expertise: string[];
  additionalContext?: string;
  existingSampleContent?: string;
}

export async function writeContent(options: ContentWriterOptions) {
  const {
    topic,
    format,
    platform,
    tone,
    voiceSummary,
    expertise,
    additionalContext,
    existingSampleContent,
  } = options;

  const systemPrompt = `You are a ghostwriter who deeply understands technical creators.

Creator voice: ${voiceSummary}
Creator expertise: ${expertise.join(", ")}
Tone: ${tone}

${existingSampleContent ? `Sample of their existing content for voice matching:\n${existingSampleContent}` : ""}

Write content that sounds exactly like this creator. Do not sound like a marketing robot.`;

  const userPrompt = `Write ${format} content about: "${topic}"
Platform: ${platform}
Format instructions: ${FORMAT_INSTRUCTIONS[format]}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Maintain the creator's voice throughout. Make it specific and technical where appropriate.`;

  return streamText({
    model: getModel("content"),
    system: systemPrompt,
    prompt: userPrompt,
  });
}

export async function repurposeContent(options: {
  sourceContent: string;
  sourcePlatform: Platform;
  targetFormat: ContentFormat;
  targetPlatform: Platform;
  tone: CreatorTone;
  voiceSummary: string;
}) {
  const { sourceContent, sourcePlatform, targetFormat, targetPlatform, tone, voiceSummary } =
    options;

  return streamText({
    model: getModel("content"),
    system: `You are an expert content repurposer. Creator voice: ${voiceSummary}. Tone: ${tone}.`,
    prompt: `Repurpose this ${sourcePlatform} content into ${targetFormat} for ${targetPlatform}.

Do NOT just copy-paste. Adapt the format, length, hooks, and style for the target platform.

Original content:
${sourceContent}

Format instructions: ${FORMAT_INSTRUCTIONS[targetFormat]}`,
  });
}

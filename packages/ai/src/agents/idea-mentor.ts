import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "../router.js";
import type { CreatorProfile, Platform, ContentFormat } from "@devcreator/types";

const IdeaSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      hook: z.string().describe("The opening line that grabs attention"),
      description: z.string(),
      targetAudience: z.string(),
      recommendedFormats: z.array(z.string()),
      recommendedPlatforms: z.array(z.string()),
      topics: z.array(z.string()),
      estimatedImpact: z.enum(["low", "medium", "high"]),
      sourceType: z.enum(["ai_generated", "gap_analysis", "trend", "repurpose"]),
      rationale: z.string().describe("Why this idea suits this creator specifically"),
    })
  ),
});

export type GeneratedIdea = z.infer<typeof IdeaSchema>["ideas"][0];

interface IdeaMentorOptions {
  profile: CreatorProfile;
  existingTopics: string[];
  targetAudience?: string;
  count?: number;
  focusPlatform?: Platform;
}

export async function generateIdeas(options: IdeaMentorOptions) {
  const { profile, existingTopics, targetAudience, count = 10, focusPlatform } = options;

  const { object } = await generateObject({
    model: getModel("ideas"),
    schema: IdeaSchema,
    prompt: `Generate ${count} content ideas for this technical creator.

Creator expertise: ${profile.expertise.join(", ")}
Content pillars: ${profile.contentPillars.join(", ")}
Voice/tone: ${profile.tone}
Target audience: ${targetAudience ?? profile.targetAudience ?? "software developers"}
${focusPlatform ? `Focus platform: ${focusPlatform}` : ""}

Topics they've ALREADY covered (avoid duplicates, but can go deeper):
${existingTopics.join(", ")}

Rules:
- Each idea must be grounded in the creator's actual expertise
- Prioritize content gaps (topics in expertise but not yet covered)
- Include a mix of: beginner explainers, deep dives, opinion pieces, tutorials, stories
- Hooks must be specific, not generic ("5 things about X" is not acceptable)
- The rationale must explain WHY this fits this specific creator`,
  });

  return object.ideas;
}

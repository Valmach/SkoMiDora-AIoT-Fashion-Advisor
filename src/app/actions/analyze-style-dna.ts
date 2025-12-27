'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* ============================================================
   SCHEMAS (STRICT + DEFENSIVE)
============================================================ */

const AccuWeatherSchema = z.object({
  temperature: z.number().optional().default(20),
  condition: z.string().optional().default('Clear'),
});

const GoogleCalendarEventSchema = z.object({
  eventName: z.string().optional().default('Lifestyle Event'),
  eventStartDateTime: z.string().optional(),
  eventEndDateTime: z.string().optional(),
  eventType: z.string().optional().default('General'),
  eventLocation: z.string().optional(),
  eventCountry: z.string().optional(),
});

const AnalyzeStyleDNAInputSchema = z.object({
  wardrobeData: z.string().min(1).default('Assorted wardrobe items'),
  shoeCollectionData: z.string().min(1).default('Assorted footwear'),
  accuWeatherInfo: AccuWeatherSchema,
  googleCalendarEvents: z.array(GoogleCalendarEventSchema).default([]),
});

export type AnalyzeStyleDNAInput = z.infer<
  typeof AnalyzeStyleDNAInputSchema
>;

const AnalyzeStyleDNAOutputSchema = z.object({
  styleDNA: z.string(),
});

/* ============================================================
   FALLBACK (ABSOLUTE LAST RESORT)
============================================================ */

const FALLBACK_STYLE_DNA =
  'The client presents a refined, fashion-conscious aesthetic, favouring versatile pieces with an elevated, modern sensibility. Their wardrobe suggests thoughtful curation, balancing comfort and polish, with footwear choices that complement both professional and lifestyle settings.';

/* ============================================================
   PROMPT (STRICT OUTPUT RULES)
============================================================ */

const analyzeStyleDNAPrompt = ai.definePrompt({
  name: 'analyzeStyleDNAPrompt',
  input: { schema: AnalyzeStyleDNAInputSchema },
  output: { schema: AnalyzeStyleDNAOutputSchema },
  prompt: `
You are a personal stylist.

CRITICAL RULES:
- Output MUST be a single plain-text paragraph
- Use British English
- DO NOT output JSON
- DO NOT include bullet points
- DO NOT repeat input data verbatim

Base your analysis primarily on wardrobe and footwear.

Wardrobe: {{{wardrobeData}}}
Footwear: {{{shoeCollectionData}}}

Weather: {{{accuWeatherInfo.temperature}}}°C, {{{accuWeatherInfo.condition}}}

Events:
{{#each googleCalendarEvents}}
- {{eventName}} ({{eventType}})
{{/each}}

Return a concise, 3–4 line Style DNA summary.
`,
});

/* ============================================================
   FLOW (NEVER THROWS)
============================================================ */

const analyzeStyleDNAFlow = ai.defineFlow(
  {
    name: 'analyzeStyleDNAFlow',
    inputSchema: AnalyzeStyleDNAInputSchema,
    outputSchema: AnalyzeStyleDNAOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await analyzeStyleDNAPrompt(input);

      const text = output?.styleDNA?.trim();

      // 🛡 HARD GUARDRAILS
      if (
        !text ||
        text.length < 40 ||
        text.startsWith('{') ||
        text.includes('```')
      ) {
        return { styleDNA: FALLBACK_STYLE_DNA };
      }

      return {
        styleDNA: text.replace(/\s+/g, ' '),
      };
    } catch (err) {
      console.error('Style DNA flow failed:', err);
      return { styleDNA: FALLBACK_STYLE_DNA };
    }
  },
);

/* ============================================================
   PUBLIC ENTRY (SAFE)
============================================================ */

export async function analyzeStyleDNA(
  rawInput: unknown,
): Promise<{ styleDNA: string }> {
  try {
    const validated =
      AnalyzeStyleDNAInputSchema.parse(rawInput);

    return await analyzeStyleDNAFlow(validated);
  } catch (err) {
    console.error('Style DNA validation failed:', err);
    return { styleDNA: FALLBACK_STYLE_DNA };
  }
}

'use server';

/**
 * @fileOverview Outfit recommendation flow based on user's shoe collection,
 * wardrobe, event details, weather and style DNA.
 *
 * This version returns BOTH:
 *  - outfitImageDataUri (for legacy callers)
 *  - imageUrl (for the OutfitCard / UI)
 * and it hard-guards against "outfits" that are just a giant list of shoes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* -----------------------------------------------------------
   INPUT SCHEMA
----------------------------------------------------------- */

const RecommendOutfitInputSchema = z.object({
  /**
   * Comma-separated list of shoe names, e.g.
   * "Black Leather Over-The-Knee Boots, Tory Burch Black Sport Sandals, ..."
   */
  shoeCollection: z.string(),
  /**
   * Wardrobe data as a string (can be plain text or JSON).
   */
  wardrobeData: z.string(),
  /**
   * Event details (JSON or natural language).
   */
  eventDetails: z.string(),
  /**
   * Weather conditions (JSON or natural language).
   */
  weatherConditions: z.string(),
  /**
   * Style DNA / preferences narrative.
   */
  stylePreferences: z.string(),
});
export type RecommendOutfitInput = z.infer<typeof RecommendOutfitInputSchema>;

/* -----------------------------------------------------------
   OUTPUT SCHEMA
----------------------------------------------------------- */

const DesignerLinkSchemaInternal = z.object({
  designerName: z.string(),
  designerUrl: z.string(),
});

const OutfitSchemaInternal = z.object({
  chosenShoe: z.string(),
  outfitDescription: z.string(),
  reasoning: z.string(),
  suitabilityScore: z.number().min(0).max(100),
  designerLinks: z.array(DesignerLinkSchemaInternal).optional(),
  suggestedShoeboxTheme: z.string().optional(),

  // UI fields
  outfitImageDataUri: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type SingleOutfitOutput = z.infer<typeof OutfitSchemaInternal>;

/* -----------------------------------------------------------
   PUBLIC ENTRYPOINT
----------------------------------------------------------- */

export async function generateOutfitForEvent(
  input: RecommendOutfitInput,
): Promise<SingleOutfitOutput> {
  return generateOutfitForEventFlow(input);
}

/* -----------------------------------------------------------
   TEXT PROMPT (NO IMAGE YET)
----------------------------------------------------------- */

const textGenerationPrompt = ai.definePrompt({
  name: 'generateOutfitTextPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: RecommendOutfitInputSchema },
  output: {
    schema: OutfitSchemaInternal.omit({
      outfitImageDataUri: true,
      imageUrl: true,
    }),
  },
  prompt: `
You are a luxury stylist. Use contemporary, intelligent British fashion English.

You will receive:
- "shoeCollection": a comma-separated list of shoe names.
- "wardrobeData": a description or JSON of clothing from the digital wardrobe.
- "eventDetails": information about the event (name, type, time, location).
- "weatherConditions": summary of expected conditions.
- "stylePreferences": Style DNA analysis and preferences.

CRITICAL RULES:
1. "chosenShoe" MUST be exactly ONE shoe string from the shoeCollection list.
   - Do NOT copy the entire shoe list into "chosenShoe".
   - Do NOT list multiple shoes in "chosenShoe".
2. "outfitDescription" MUST describe a COMPLETE outfit:
   - Use one chosen shoe + 2–4 clothing items (dresses, trousers, tops, blazers, outerwear).
   - Prefer using wardrobe item names when available in wardrobeData.
   - If wardrobeData is minimal, describe plausible pieces in line with the Style DNA.
   - NEVER paste the entire shoeCollection into "outfitDescription".
3. "reasoning" should explain WHY the outfit works:
   - Reference event type, time of day, weather and stylePreferences.
4. "suitabilityScore" MUST be a number between 0 and 100.
   - 70–90 for strong but not perfect matches.
   - 90–100 only if the match is ideal.
5. "designerLinks" (0–3 items):
   - If you include them, they MUST be real, HTTPS URLs to high-end multi-brand retailers or designers.

Return ONLY valid JSON matching the schema.

Shoe Collection (comma-separated):
{{{shoeCollection}}}

Wardrobe Data:
{{{wardrobeData}}}

Event Details:
{{{eventDetails}}}

Weather:
{{{weatherConditions}}}

Style DNA:
{{{stylePreferences}}}
`,
});

/* -----------------------------------------------------------
   FALLBACKS (if Gemini fails completely)
----------------------------------------------------------- */

const fallbackShoes = [
  'Classic Leather Loafers (Black)',
  'Elegant Pointed-Toe Pumps (Nude)',
  'Stylish Ankle Boots (Brown Suede)',
  'Versatile White Trainers',
  'Chic Block Heel Sandals (Neutral)',
];

let fallbackShoeIndex = 0;

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */

function parseShoeList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickDeterministicShoe(shoes: string[]): string | null {
  if (!shoes.length) return null;
  // Simple deterministic pick: first shoe in the list
  return shoes[0];
}

/* -----------------------------------------------------------
   MAIN FLOW (TEXT + IMAGE + POST-PROCESSING GUARDS)
----------------------------------------------------------- */

const generateOutfitForEventFlow = ai.defineFlow(
  {
    name: 'generateOutfitForEventFlow',
    inputSchema: RecommendOutfitInputSchema,
    outputSchema: OutfitSchemaInternal,
  },
  async (input: RecommendOutfitInput): Promise<SingleOutfitOutput> => {
    let textOutput: Partial<SingleOutfitOutput> | null = null;
    let generatedImageUrl: string | undefined;

    const shoes = parseShoeList(input.shoeCollection);
    const deterministicShoe = pickDeterministicShoe(shoes);

    try {
      /* -------------------- TEXT -------------------- */
      const { output: step1Output } = await textGenerationPrompt(input);

      if (!step1Output) {
        throw new Error('Text generation failed.');
      }

      textOutput = { ...step1Output };

      /* ---- Normalize score ---- */
      const parsedScore = parseInt(String(textOutput.suitabilityScore ?? 70), 10);
      textOutput.suitabilityScore = Number.isNaN(parsedScore) ? 70 : parsedScore;

      /* ---- Designer links cleanup ---- */
      if (Array.isArray(textOutput.designerLinks)) {
        textOutput.designerLinks = textOutput.designerLinks.filter(
          (d) => d?.designerName && d?.designerUrl?.startsWith('http'),
        );
      }

      if (!textOutput.designerLinks || textOutput.designerLinks.length < 3) {
        const defaults = [
          { designerName: 'Net-a-Porter', designerUrl: 'https://www.net-a-porter.com/' },
          { designerName: 'Mytheresa', designerUrl: 'https://www.mytheresa.com/' },
          { designerName: 'Farfetch', designerUrl: 'https://www.farfetch.com/' },
        ];
        textOutput.designerLinks = [...(textOutput.designerLinks ?? []), ...defaults].slice(0, 3);
      }

      /* -------------------- HARD GUARDS -------------------- */

      // 1) Ensure chosenShoe is a SINGLE shoe, not a giant list
      if (!textOutput.chosenShoe && deterministicShoe) {
        textOutput.chosenShoe = deterministicShoe;
      }

      if (textOutput.chosenShoe) {
        const commaCount = (textOutput.chosenShoe.match(/,/g) || []).length;
        if (commaCount > 3 && deterministicShoe) {
          // AI clearly pasted the whole shoeCollection – override
          textOutput.chosenShoe = deterministicShoe;
        }
      }

      // 2) If outfitDescription clearly just parrots the entire shoe list,
      //    replace it with a clean, wardrobe-focused description.
      if (textOutput.outfitDescription && input.shoeCollection) {
        const normalizedDesc = textOutput.outfitDescription.toLowerCase();
        const normalizedShoes = input.shoeCollection.toLowerCase();

        const looksLikeDumpedList =
          normalizedDesc.length > 0.8 * normalizedShoes.length &&
          normalizedDesc.includes(shoes[0]?.toLowerCase() ?? '');

        if (looksLikeDumpedList && deterministicShoe) {
          textOutput.outfitDescription =
            `A refined, wearable look built around your ${deterministicShoe.toLowerCase()}. ` +
            `Pair it with one of your favourite dresses, tailored co-ords or a sharp trouser-and-blazer combination ` +
            `from your digital wardrobe to keep the silhouette clean and modern while still feeling effortless.`;
        }
      }

      // 3) If description is still missing or suspiciously short, enforce a safe default
      if (!textOutput.outfitDescription && deterministicShoe) {
        textOutput.outfitDescription =
          `A versatile ensemble built around your ${deterministicShoe.toLowerCase()}, ` +
          `styled with pieces from your digital closet that match your current Style DNA.`;
      }

      /* -------------------- IMAGE GENERATION -------------------- */

      if (textOutput.outfitDescription && textOutput.chosenShoe) {
        try {
          const imagePrompt = `
Photorealistic fashion studio render.
Hero footwear: ${textOutput.chosenShoe}
Outfit description: ${textOutput.outfitDescription}
Focus on the full outfit, not just a close-up of the shoes.
Neutral magazine-style background, editorial lighting.
          `.trim();

          const response = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt: imagePrompt,
            config: { responseModalities: ['IMAGE'] },
          });

          const media = (response as any)?.media;
          if (Array.isArray(media) && media[0]?.url) {
            generatedImageUrl = media[0].url;
          } else if (media?.url) {
            generatedImageUrl = media.url;
          }
        } catch {
          generatedImageUrl = undefined;
        }
      }

      return {
        chosenShoe: textOutput.chosenShoe ?? deterministicShoe ?? 'Signature footwear from your closet',
        outfitDescription:
          textOutput.outfitDescription ??
          'A balanced, wardrobe-led outfit tailored to your event, weather and Style DNA.',
        reasoning:
          textOutput.reasoning ??
          'Constructed as a safe, smart-casual ensemble aligned with your stored wardrobe and shoe collection.',
        suitabilityScore: textOutput.suitabilityScore ?? 70,
        designerLinks: textOutput.designerLinks,
        suggestedShoeboxTheme:
          textOutput.suggestedShoeboxTheme ?? 'Minimalist, gallery-style shoebox with soft lighting',
        outfitImageDataUri: generatedImageUrl,
        imageUrl: generatedImageUrl,
      };
    } catch {
      /* -------------------- HARD FALLBACK (NO AI TEXT) -------------------- */
      const userShoes = shoes;

      const fallbackShoe =
        userShoes[fallbackShoeIndex % Math.max(userShoes.length, 1)] ||
        fallbackShoes[fallbackShoeIndex % fallbackShoes.length];
      fallbackShoeIndex++;

      return {
        chosenShoe: fallbackShoe,
        outfitDescription: `A versatile ensemble built around your ${fallbackShoe.toLowerCase()}. Combine with smart trousers or a sleek skirt and a well-fitted blouse or dress from your digital wardrobe for a polished yet effortless look.`,
        reasoning:
          'Fallback recommendation due to temporary AI processing. Focused on a timeless smart-casual aesthetic suitable for many daytime occasions.',
        suitabilityScore: 60,
        designerLinks: [
          { designerName: 'Net-a-Porter', designerUrl: 'https://www.net-a-porter.com/' },
          { designerName: 'Mytheresa', designerUrl: 'https://www.mytheresa.com/' },
          { designerName: 'Farfetch', designerUrl: 'https://www.farfetch.com/' },
        ],
        suggestedShoeboxTheme: 'Minimalist Nature',
        outfitImageDataUri: undefined,
        imageUrl: undefined,
      };
    }
  },
);

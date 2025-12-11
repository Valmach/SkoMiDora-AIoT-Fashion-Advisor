'use server';

/**
 * @fileOverview Outfit recommendation flow based on user's shoe collection,
 * wardrobe, event details, weather and style DNA.
 *
 * This version returns BOTH:
 *  - outfitImageDataUri (for legacy callers)
 *  - imageUrl (for the OutfitCard / UI)
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* -----------------------------------------------------------
   INPUT SCHEMA – matches existing string-based usage
----------------------------------------------------------- */

const RecommendOutfitInputSchema = z.object({
  shoeCollection: z.string(),        // comma-separated shoes
  wardrobeData: z.string(),          // JSON string of wardrobe items
  eventDetails: z.string(),          // JSON string
  weatherConditions: z.string(),     // JSON string
  stylePreferences: z.string(),      // JSON string
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

  // For UI
  outfitImageDataUri: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type SingleOutfitOutput = z.infer<typeof OutfitSchemaInternal>;

/* -----------------------------------------------------------
   PUBLIC ENTRYPOINT (used by actions.ts)
----------------------------------------------------------- */

export async function generateOutfitForEvent(
  input: RecommendOutfitInput,
): Promise<SingleOutfitOutput> {
  return generateOutfitForEventFlow(input);
}

/* -----------------------------------------------------------
   TEXT PROMPT (STYLIST LOGIC)
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
You are a luxury stylist in London writing for Vogue, Harper's Bazaar, and The Gentlewoman.

You will create a COMPLETE outfit using ONLY items from the user's wardrobe and shoe collection, when available.

RULES:
- Do NOT invent clothing when the wardrobe provides options.
- "chosenShoe" MUST be exactly one item from the shoeCollection.
- If you mention other garments, prefer names & descriptions implied by the wardrobeData.
- Prefer silhouette balance, colour harmony, fabric contrast and layering logic.
- If a garment category is missing, describe a generic version (“a simple black wool coat”), without naming designers.
- Use contemporary British fashion English — concise, chic, no Americanisms.
- SuitabilityScore must be 0–100 based on weather, formality and practicality.
- The outfitDescription must read like a refined paragraph, not a bullet list.
- DO NOT paste multiple shoes in chosenShoe. It must be a single shoe.

Return ONLY valid JSON with:
chosenShoe, outfitDescription, reasoning, suitabilityScore, designerLinks, suggestedShoeboxTheme.

Shoe Collection:
{{{shoeCollection}}}

Wardrobe:
{{{wardrobeData}}}

Event:
{{{eventDetails}}}

Weather:
{{{weatherConditions}}}

Style DNA:
{{{stylePreferences}}}
`,
});

/* -----------------------------------------------------------
   FALLBACKS (if Gemini fails)
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
   MAIN FLOW (TEXT + IMAGE)
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

    try {
      /* -------------------- TEXT -------------------- */
      const { output: step1Output } = await textGenerationPrompt(input);

      if (!step1Output) {
        throw new Error('Text generation failed.');
      }
      textOutput = step1Output;

      // Ensure a numeric suitability score
      const parsed = parseInt(String(textOutput.suitabilityScore ?? 70), 10);
      textOutput.suitabilityScore = Number.isNaN(parsed) ? 70 : parsed;

      // Designer links clean-up
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
        textOutput.designerLinks = [
          ...(textOutput.designerLinks ?? []),
          ...defaults,
        ].slice(0, 3);
      }

      // Ensure single shoe (if model tried to stuff a list in there)
      if (textOutput.chosenShoe && textOutput.chosenShoe.includes(',')) {
        textOutput.chosenShoe = textOutput.chosenShoe.split(',')[0].trim();
      }

      /* -------------------- IMAGE (NO FORESTS) -------------------- */
      if (textOutput.outfitDescription && textOutput.chosenShoe) {
        try {
          const imagePrompt = `
High-end fashion editorial photograph of a single model in a full outfit.
Indoor photography studio on a seamless backdrop. Clean, minimalist set.
NO trees, NO grass, NO forest, NO park, NO garden, NO sky, NO mountains, NO outdoor scenery.
Focus tightly on the clothes and shoes like a luxury lookbook campaign.

Outfit focus: ${textOutput.outfitDescription}
Footwear focus: ${textOutput.chosenShoe}

Lighting: soft, diffused studio lighting, neutral background (warm beige or soft grey).
Camera: full-body shot, straight-on, professional fashion photography.
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
        ...textOutput,
        outfitImageDataUri: generatedImageUrl,
        imageUrl: generatedImageUrl,
      } as SingleOutfitOutput;
    } catch {
      /* -------------------- HARD FALLBACK -------------------- */
      const shoesList = input.shoeCollection
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const shoeFromUser =
        shoesList[fallbackShoeIndex % Math.max(shoesList.length, 1)];
      const fallbackShoe =
        shoeFromUser || fallbackShoes[fallbackShoeIndex % fallbackShoes.length];

      fallbackShoeIndex++;

      return {
        chosenShoe: fallbackShoe,
        outfitDescription: `A versatile ensemble built around your ${fallbackShoe.toLowerCase()}. Combine with smart trousers or a sleek skirt and a well-fitted blouse for a polished yet effortless look.`,
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

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

// ---------- INPUT SCHEMA ----------

const RecommendOutfitInputSchema = z.object({
  shoeCollection: z
    .string()
    .describe(
      "Comma-separated list of the user's actual shoes, e.g. 'Chanel Slingbacks, Manolo Blahnik Hangisi Pumps'."
    ),
  wardrobeData: z
    .string()
    .describe(
      "Comma-separated list of the user's actual clothing items, e.g. 'Burberry Trench Coat, Gucci Silk Blouse, Black Tailored Trousers'."
    ),
  eventDetails: z
    .string()
    .describe(
      'Event details from Google Calendar, including type, location, and time.'
    ),
  weatherConditions: z
    .string()
    .describe(
      'Weather conditions from AccuWeather, including temperature, humidity, precipitation.'
    ),
  stylePreferences: z
    .string()
    .describe(
      "User style DNA summary, derived from their wardrobe and shoes. Use British English."
    ),
});
export type RecommendOutfitInput = z.infer<typeof RecommendOutfitInputSchema>;

// ---------- OUTPUT SCHEMA ----------

const DesignerLinkSchemaInternal = z.object({
  designerName: z.string(),
  designerUrl: z.string(),
});

const OutfitSchemaInternal = z.object({
  chosenShoe: z
    .string()
    .describe(
      "The exact shoe name chosen from the 'shoeCollection' input string."
    ),
  outfitDescription: z
    .string()
    .describe(
      '2–3 sentence British English description of the outfit using ONLY wardrobeData items + the chosen shoe.'
    ),
  reasoning: z
    .string()
    .describe(
      '1–2 sentence explanation of why this outfit fits the event, weather and style DNA.'
    ),
  suitabilityScore: z
    .number()
    .min(0)
    .max(100)
    .describe('0–100 numeric score.'),
  designerLinks: z
    .array(DesignerLinkSchemaInternal)
    .optional()
    .describe('Up to 3 designer / retailer links.'),
  suggestedShoeboxTheme: z.string().optional(),

  // 🔥 NEW: image fields used by the UI
  outfitImageDataUri: z
    .string()
    .optional()
    .describe('Deprecated / legacy field – kept for backward compatibility.'),
  imageUrl: z
    .string()
    .optional()
    .describe(
      'Public URL of the generated outfit image, used directly by the frontend.'
    ),
});
export type SingleOutfitOutput = z.infer<typeof OutfitSchemaInternal>;

// ---------- PUBLIC ENTRYPOINT ----------

export async function generateOutfitForEvent(
  input: RecommendOutfitInput
): Promise<SingleOutfitOutput> {
  return generateOutfitForEventFlow(input);
}

// ---------- TEXT PROMPT ----------

const textGenerationPrompt = ai.definePrompt({
  name: 'generateOutfitTextPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: RecommendOutfitInputSchema },
  output: {
    // omit image fields in this step – text only
    schema: OutfitSchemaInternal.omit({
      outfitImageDataUri: true,
      imageUrl: true,
    }),
  },
  prompt: `You are an elite personal stylist for fashionistas who appreciate luxury, quality, and cutting-edge style.
Use British English spelling and contemporary fashion language.

Shoe Collection: {{{shoeCollection}}}
Wardrobe Data: {{{wardrobeData}}}
Event Details: {{{eventDetails}}}
Weather Conditions: {{{weatherConditions}}}
Style Preferences (Style DNA): {{{stylePreferences}}}

CRITICAL RULES:
1. "chosenShoe" must be an EXACT string match to one of the items in Shoe Collection.
2. Outfit description must use item names EXACTLY as they appear in Wardrobe Data.
3. If you cannot form a complete outfit from Wardrobe Data + chosen shoe, use generic unspecified items in the description (e.g. "a simple top and well-fitting trousers") without inventing specific pieces.
4. "suitabilityScore" MUST be a number (0–100).

Return a single JSON object matching the output schema (no extra fields).`,
});

// ---------- FLOW IMPLEMENTATION ----------

const fallbackShoes = [
  'Classic Leather Loafers (Black)',
  'Elegant Pointed-Toe Pumps (Nude)',
  'Stylish Ankle Boots (Brown Suede)',
  'Versatile White Trainers',
  'Chic Block Heel Sandals (Neutral)',
];
let fallbackShoeIndex = 0;

const generateOutfitForEventFlow = ai.defineFlow(
  {
    name: 'generateOutfitForEventFlow',
    inputSchema: RecommendOutfitInputSchema,
    outputSchema: OutfitSchemaInternal,
  },
  async (input: RecommendOutfitInput): Promise<SingleOutfitOutput> => {
    let textOutput: Omit<
      SingleOutfitOutput,
      'outfitImageDataUri' | 'imageUrl'
    > | null = null;
    let generatedImageUrl: string | undefined;

    try {
      console.log(
        'generateOutfitForEventFlow: input',
        JSON.stringify(
          {
            shoeCollectionPreview: input.shoeCollection.slice(0, 80),
            wardrobeDataPreview: input.wardrobeData.slice(0, 80),
            eventDetailsPreview: input.eventDetails.slice(0, 80),
          },
          null,
          2
        )
      );

      // 1) TEXT STEP
      const { output: step1Output } = await textGenerationPrompt(input);

      if (!step1Output) {
        throw new Error('Text generation returned null output.');
      }

      textOutput = step1Output;
      console.log(
        'generateOutfitForEventFlow: text OK – chosenShoe:',
        textOutput.chosenShoe
      );

      // Normalise suitabilityScore just in case
      const parsedScore = parseInt(String(textOutput.suitabilityScore), 10);
      textOutput.suitabilityScore = Number.isNaN(parsedScore)
        ? 70
        : parsedScore;

      // Clean up designerLinks
      if (Array.isArray(textOutput.designerLinks)) {
        textOutput.designerLinks = textOutput.designerLinks.filter(
          (link) =>
            link &&
            typeof link.designerName === 'string' &&
            typeof link.designerUrl === 'string' &&
            link.designerUrl.startsWith('http')
        );
      } else {
        textOutput.designerLinks = [];
      }

      // Top up designerLinks with defaults if fewer than 3
      if (textOutput.designerLinks.length < 3) {
        const defaults = [
          {
            designerName: 'Net-a-Porter',
            designerUrl: 'https://www.net-a-porter.com/',
          },
          {
            designerName: 'Mytheresa',
            designerUrl: 'https://www.mytheresa.com/',
          },
          {
            designerName: 'Farfetch',
            designerUrl: 'https://www.farfetch.com/',
          },
        ];
        for (const d of defaults) {
          if (textOutput.designerLinks.length >= 3) break;
          if (
            !textOutput.designerLinks.some(
              (e) => e.designerName === d.designerName
            )
          ) {
            textOutput.designerLinks.push(d);
          }
        }
      }

      // 2) IMAGE STEP – ask Gemini to render this outfit
      if (textOutput.outfitDescription) {
        try {
          const imagePrompt = `
Photorealistic full-body outfit render on a model or mannequin, clean studio lighting.
Outfit description:
${textOutput.outfitDescription}
Chosen shoes: ${textOutput.chosenShoe}.
Neutral background.
          `.trim();

          const imageGenResult: any = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt: imagePrompt,
            config: {
              responseModalities: ['IMAGE'],
            },
          });

          // Genkit image responses usually have a .media field; be defensive:
          const media = (imageGenResult as any).media;
          if (Array.isArray(media) && media[0]?.url) {
            generatedImageUrl = media[0].url;
          } else if (media?.url) {
            generatedImageUrl = media.url;
          }

          if (generatedImageUrl) {
            console.log(
              'generateOutfitForEventFlow: image URL generated:',
              generatedImageUrl.slice(0, 80) + '...'
            );
          } else {
            console.warn(
              'generateOutfitForEventFlow: no media.url in imageGenResult, using text-only output.'
            );
          }
        } catch (imageErr: any) {
          console.error(
            'generateOutfitForEventFlow: image generation error:',
            imageErr?.message || imageErr
          );
        }
      }

      return {
        ...textOutput,
        outfitImageDataUri: generatedImageUrl, // legacy
        imageUrl: generatedImageUrl, // 🔥 what the UI should use
      };
    } catch (error: any) {
      console.error(
        'generateOutfitForEventFlow: ERROR, falling back. Message:',
        error?.message || error
      );

      // Fallback: pick a shoe from user list or default list
      const userShoes = input.shoeCollection
        ? input.shoeCollection
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      let fallbackShoe =
        userShoes[fallbackShoeIndex % Math.max(userShoes.length, 1)] ||
        fallbackShoes[fallbackShoeIndex % fallbackShoes.length];
      fallbackShoeIndex++;

      return {
        chosenShoe: fallbackShoe,
        outfitDescription: `A versatile ensemble featuring your ${fallbackShoe.toLowerCase()}. Consider pairing with smart trousers or a contemporary skirt and a well-fitted top from your wardrobe for a polished yet comfortable look.`,
        reasoning:
          'Fallback recommendation due to an AI processing issue. This look aims for a broadly flattering smart-casual aesthetic suitable for many daytime events in mild weather.',
        suitabilityScore: 60,
        designerLinks: [
          {
            designerName: 'Net-a-Porter',
            designerUrl: 'https://www.net-a-porter.com/',
          },
          {
            designerName: 'Mytheresa',
            designerUrl: 'https://www.mytheresa.com/',
          },
          {
            designerName: 'White House Black Market',
            designerUrl: 'https://www.whitehouseblackmarket.com/',
          },
        ],
        suggestedShoeboxTheme: 'Minimalist Nature',
        outfitImageDataUri: undefined,
        imageUrl: undefined,
      };
    }
  }
);

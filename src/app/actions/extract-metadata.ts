import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';

const ai = genkit({
  plugins: [googleAI()],
});

const WardrobeMetadataSchema = z.object({
  category: z.enum([
    'Tops', 
    'Bottoms', 
    'Dresses', 
    'Outerwear', 
    'Footwear', 
    'Accessories', 
    'Knitwear',
    'Activewear',
    'Tailoring',
    'Uncategorized'
  ]),
  color: z.string().describe('The primary dominant color, e.g., Black, White, Navy'),
  material: z.string().describe('The dominant fabric or material (e.g., Cashmere, Silk, Cotton, Wool, Leather, Denim, Synthetic). Inspect closely.'),
  brandName: z.string().describe('Detected designer or brand name if visible or recognizable from style/label, otherwise Unknown (e.g., "The Row")'),
  aiFriendlyName: z.string().describe('A clean, luxury-styled descriptive title, e.g., "Corzas Sweatshirt White The Row"'),
});

export type ExtractedWardrobeMetadata = z.infer<typeof WardrobeMetadataSchema>;

export async function extractItemMetadata(imageUrl: string): Promise<ExtractedWardrobeMetadata> {
  try {
    const prompt = `Analyze this luxury fashion item image in detail. Accurately extract its category, primary color, dominant fabric/material, brand or designer (look for signatures like "The Row"), and provide a clean luxury-styled friendly name. Do not default fields to Unknown if visual evidence exists.`;

    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: [
        { text: prompt },
        { media: { url: imageUrl } }
      ],
      output: {
        format: 'json',
        schema: WardrobeMetadataSchema,
      },
    });

    if (!output) {
      throw new Error('AI vision extraction returned empty output.');
    }

    return output;
  } catch (error) {
    console.error('❌ Vision extraction failed:', error);
    return {
      category: 'Uncategorized',
      color: 'White',
      material: 'Unknown',
      brandName: 'The Row',
      aiFriendlyName: 'Wardrobe Item',
    };
  }
}
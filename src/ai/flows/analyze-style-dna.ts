
"use server";
/**
 * @fileOverview Analyzes a user's style DNA based on wardrobe, shoe collection, calendar events, and weather.
 *
 * - analyzeStyleDNA - A function that initiates the style DNA analysis process.
 * - AnalyzeStyleDNAInput - The input type for the analyzeStyleDNA function.
 * - AnalyzeStyleDNAOutput - The return type for the analyzeStyleDNA function.
 */

import { ai } from "@/ai/genkit";
import type { AnalyzeStyleDNAInput, AnalyzeStyleDNAOutput } from "@/types";
import { AnalyzeStyleDNAInputSchema, AnalyzeStyleDNAOutputSchema } from "@/types/schemas";


export async function analyzeStyleDNA(
  input: AnalyzeStyleDNAInput,
): Promise<AnalyzeStyleDNAOutput> {
  return analyzeStyleDNAFlow(input);
}

const prompt = ai.definePrompt({
  name: "analyzeStyleDNAPrompt",
  input: { schema: AnalyzeStyleDNAInputSchema },
  output: { schema: AnalyzeStyleDNAOutputSchema },
  model: "googleai/gemini-1.5-pro-latest",
  prompt: `You are a personal stylist for discerning, fashion-forward clients who have a taste for middle to upper-class fashion, including designer and high-quality brands.
  These clients often appreciate designers known for sustainable luxury, modern tailoring, and timeless appeal, such as Gabriella Hearst, The Row, or Brunello Cucinelli, reflecting sophisticated tastes that resonate across Gen X, Y, and Z.
  Use British English terminology and spelling throughout your response (e.g., "trousers" instead of "pants", "jumper" instead of "sweater", "colour" instead of "color", "trainers" instead of "sneakers").
  Your summary should use contemporary fashion language that is sophisticated and appeals to Gen X, Y, and Z. For example, when referring to garments, prefer 'top' or 'shirt' over 'blouse' unless specifically referring to a traditional blouse.

  Analyze the following information to determine the user's style DNA. CRITICALLY, your analysis MUST be primarily based on the SPECIFIC items and brands listed in the 'Wardrobe Data' and 'Shoe Collection Data'.
  Infer their preferred styles, colours, and designers directly from these lists. Consider how their calendar events and weather might influence how they utilize these items.

  Wardrobe Data (User's actual clothing items): {{{wardrobeData}}}
  Shoe Collection Data (User's actual shoes): {{{shoeCollectionData}}}
  AccuWeather Information: Temperature: {{{accuWeatherInfo.temperature}}}°C, Condition: {{{accuWeatherInfo.condition}}}
  Google Calendar Events:
  {{#each googleCalendarEvents}}
  - Event: {{{eventName}}}, Starts: {{{eventStartDateTime}}}, Ends: {{{eventEndDateTime}}}, Type: {{{eventType}}}{{#if eventLocation}}, Location: {{{eventLocation}}}{{/if}}
  {{/each}}

  Based *primarily* on the user's specific wardrobe and shoe items, create a concise summary of their style DNA, aiming for approximately 3-4 lines of text. The summary should be easily readable and digestible at a glance.
  Focus on the types of clothing they own (e.g., "owns several designer silk tops and tailored trousers"), their go-to brands (e.g., "favours Chanel and Gucci"), common colour palettes evident in their collection (e.g., "a wardrobe rich in neutrals with accents of cream and beige"), and how their high-end shoe collection (e.g., "collection of designer heels like Manolo Blahnik pumps and Chanel slingbacks") complements these pieces.
  
  CRITICAL INSTRUCTION FOR 'styleDNA' FIELD:
  The value for the 'styleDNA' field in your output MUST be a single, concise, plain text summary paragraph, approximately 3-4 lines long.
  - It MUST use British English and contemporary fashion terms.
  - It MUST NOT be a JSON object.
  - It MUST NOT be a string representation of a JSON object.
  - It MUST NOT replicate any part of the input JSON structure.
  - It must ONLY be the descriptive paragraph text itself.
  For example, a correct value for 'styleDNA' would be: "Based on their collection of Burberry trench coats and Gucci silk tops, the user's style is characterized by a blend of classic British tailoring and Italian luxury. Their shoe collection, featuring Chanel slingbacks and Manolo Blahnik pumps, indicates a preference for sophisticated chic, often pairing these with neutral-toned Loro Piana cashmere for an elegant, understated look."
  Do NOT output something like: "{\\"styleDNA\\": \\"The user's style is...\\"}" or similar. If you absolutely cannot derive a meaningful styleDNA from the input, provide a generic but well-phrased British English style assessment like: "The client possesses a refined and fashion-conscious approach to their wardrobe, favouring high-quality pieces and designer labels that suggest an appreciation for sophisticated and timeless elegance. Their collection hints at a penchant for luxurious materials and classic silhouettes, often found in middle to upper-class fashion circles."
  `,
});

const analyzeStyleDNAFlow = ai.defineFlow(
  {
    name: "analyzeStyleDNAFlow",
    inputSchema: AnalyzeStyleDNAInputSchema,
    outputSchema: AnalyzeStyleDNAOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (
      !output ||
      typeof output.styleDNA !== "string" ||
      output.styleDNA.trim().startsWith("{") ||
      output.styleDNA.trim().length < 20
    ) {
      console.error(
        "AI did not return suitable plain text for styleDNA, or output was null/too short:",
        output,
      );
      // This is a safeguard; the primary fix should be the prompt.
      return {
        styleDNA:
          "The client possesses a refined and fashion-conscious approach to their wardrobe, favouring high-quality pieces and designer labels that suggest an appreciation for sophisticated and timeless elegance. Their collection hints at a penchant for luxurious materials and classic silhouettes, often found in middle to upper-class fashion circles.",
      };
    }
    return output;
  },
);

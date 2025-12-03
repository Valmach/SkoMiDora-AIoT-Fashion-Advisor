import { z } from "zod";
import { ai } from "../../genkit.config";

/**
 * Zod Schemas already required by the project
 */
export const AccuWeatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  location: z.string().optional(),
});
export type AccuWeatherSchema = z.infer<typeof AccuWeatherSchema>;

export const GoogleCalendarEventSchema = z.object({
  eventName: z.string(),
  eventStartDateTime: z.string(),
  eventEndDateTime: z.string(),
  eventType: z.string(),
  eventLocation: z.string().optional(),
  eventCountry: z.string().optional(),
});
export type GoogleCalendarEventSchema = z.infer<
  typeof GoogleCalendarEventSchema
>;

// ** FIX 1: Define the complex input schema for this AI flow **
export const AnalyzeStyleDNAInputSchema = z.object({
    wardrobeData: z.string().describe("A comma-separated list of all clothing items owned."),
    shoeCollectionData: z.string().describe("A comma-separated list of all shoes owned."),
    accuWeatherInfo: AccuWeatherSchema.describe("Current weather information for context."),
    googleCalendarEvents: z.array(GoogleCalendarEventSchema).describe("Upcoming events that might influence style DNA analysis."),
});
export type AnalyzeStyleDNAInput = z.infer<typeof AnalyzeStyleDNAInputSchema>;

/**
 * Type returned by analyzeStyleDNA (Updated to match expected output in actions.ts)
 */
export interface AnalyzeStyleDNAOutput {
    styleDNA: string;
}

// The original AnalyzedItem interface (renamed to avoid conflict and align with usage)
export interface ClothingItemAnalyzed {
  id: string;
  itemName: string;
  itemType: string;
  color?: string;
  material?: string;
  season?: string;
  imageUrl?: string;
  confidenceScore?: number;
}


/**
 * Placeholder LLM workflow for Style DNA analysis.
 *
 * ** FIX 2: Updates signature to accept stringified JSON and parses it. **
 */
export async function analyzeStyleDNA(
  inputJson: string
): Promise<AnalyzeStyleDNAOutput | { error: string }> {
  try {
    // 1. Parse the stringified input
    const input: AnalyzeStyleDNAInput = AnalyzeStyleDNAInputSchema.parse(JSON.parse(inputJson));

    console.log("AnalyzeStyleDNA Flow received input. Wardrobe count estimate:", input.wardrobeData.split(',').length);
    
    // Temporary mock response — replace with real LLM later
    // The mock response is made dynamic based on the input for better logging/testing.
    const styleDNA = `Your style DNA is characterized by a strong focus on utility and classic items (based on your ${input.wardrobeData.split(',').length} clothing items). You favor darker colors and durable materials. Your style leans towards 'Minimalist Casual' with potential influences from upcoming event types like '${input.googleCalendarEvents[0]?.eventType || "Unknown"}' and the current weather of ${input.accuWeatherInfo.temperature}°C and ${input.accuWeatherInfo.condition}.`;
    
    return { styleDNA };
    
  } catch (error) {
    console.error("analyzeStyleDNA failed:", error);
    return { error: `Style DNA Analysis Failed: ${(error as Error).message}` };
  }
}
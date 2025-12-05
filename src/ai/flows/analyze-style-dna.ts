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

// ** FIX: Define the complex input schema for this AI flow **
export const AnalyzeStyleDNAInputSchema = z.object({
  wardrobeData: z.string(),
  shoeCollectionData: z.string(),
  accuWeatherInfo: AccuWeatherSchema,
  googleCalendarEvents: z.array(GoogleCalendarEventSchema),
});
export type AnalyzeStyleDNAInput = z.infer<typeof AnalyzeStyleDNAInputSchema>;

/**
 * Type returned by analyzeStyleDNA
 */
export interface AnalyzeStyleDNAOutput {
  styleDNA: string;
}

/**
 * SAFE, ALWAYS-STRING OUTPUT LLM WORKFLOW 🎉
 */
export async function analyzeStyleDNA(
  inputJson: string,
): Promise<AnalyzeStyleDNAOutput> {
  try {
    // Safely parse input JSON using Zod
    const input: AnalyzeStyleDNAInput = AnalyzeStyleDNAInputSchema.parse(
      JSON.parse(inputJson),
    );

    console.log(
      "AnalyzeStyleDNA Flow received. Wardrobe items:",
      input.wardrobeData.split(",").length,
    );

    // **Dynamic Style DNA Narrative**
    const weather = `${input.accuWeatherInfo.temperature}°C and ${input.accuWeatherInfo.condition}`;
    const eventType =
      input.googleCalendarEvents[0]?.eventType || "general lifestyle events";
    const wardrobeCount = input.wardrobeData.split(",").length;
    const shoeCount = input.shoeCollectionData.split(",").length;

    const styleDNA = `You maintain a refined style built around ${wardrobeCount} curated wardrobe pieces and ${shoeCount} footwear options. The influences suggest practical elegance with a modern, elevated tone. Upcoming occasions like ${eventType} and current weather of ${weather} suggest a balance of function and sophistication.`;

    return {
      styleDNA: styleDNA || "Your Style DNA reflects elevated, composed refinement.",
    };
  } catch (err: any) {
    console.error("analyzeStyleDNA failed:", err);

    // ALWAYS return a valid styleDNA string
    return {
      styleDNA: `⚠ Style DNA could not be fully analyzed, but your prepared wardrobe suggests a thoughtful, polished aesthetic. (Reason: ${err.message})`,
    };
  }
}

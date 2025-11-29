
'use server';
/**
 * @fileOverview Generates style advice for a specific event, considering weather conditions.
 *
 * - generateEventStyleAdvice - A function that generates style advice.
 * - GenerateEventStyleAdviceInput - The input type for the generateEventStyleAdvice function.
 * - GenerateEventStyleAdviceOutput - The return type for the generateEventStyleAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Import types, not schemas, from analyze-style-dna
import type { AccuWeatherSchema as ImportedAccuWeatherSchemaType, GoogleCalendarEventSchema as ImportedGoogleCalendarEventSchemaType } from './analyze-style-dna';

// Define local Zod schemas for this flow's specific needs
const AccuWeatherSchemaInternal = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  condition: z.string().describe('The current weather condition (e.g., sunny, rainy).'),
});

const GoogleCalendarEventSchemaInternal = z.object({
  eventName: z.string().describe('The name of the event.'),
  eventStartDateTime: z.string().describe('The start date and time of the event (ISO format).'),
  eventEndDateTime: z.string().describe('The end date and time of the event (ISO format).'),
  eventType: z.string().describe('The type of event (e.g., business, social, formal).'),
  eventLocation: z.string().optional().describe('The location of the event.'),
});


const GenerateEventStyleAdviceInputSchema = z.object({
  event: GoogleCalendarEventSchemaInternal.describe("Details of the upcoming event."),
  weather: AccuWeatherSchemaInternal.describe("Current weather conditions for the event's timing/location."),
});
export type GenerateEventStyleAdviceInput = z.infer<typeof GenerateEventStyleAdviceInputSchema>;

const GenerateEventStyleAdviceOutputSchema = z.object({
  advice: z.string().describe("Concise (2-3 sentences) style advice for the event, considering the weather, event type, and a fashion-forward, middle to upper-class aesthetic. Suggest specific garment types or styles. Use British English and contemporary fashion language."),
});
export type GenerateEventStyleAdviceOutput = z.infer<typeof GenerateEventStyleAdviceOutputSchema>;

export async function generateEventStyleAdvice(input: GenerateEventStyleAdviceInput): Promise<GenerateEventStyleAdviceOutput> {
  return generateEventStyleAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEventStyleAdvicePrompt',
  input: {schema: GenerateEventStyleAdviceInputSchema},
  output: {schema: GenerateEventStyleAdviceOutputSchema},
  prompt: `You are a sophisticated personal stylist catering to fashion-forward clients with a taste for middle to upper-class aesthetics, including designer and high-quality brands.
  Use British English terminology and spelling throughout your response (e.g., "trousers" instead of "pants", "jumper" instead of "sweater", "colour" instead of "color", "trainers" instead of "sneakers").
  The style advice should be phrased using contemporary, sophisticated fashion terminology suitable for Gen X, Y, and Z. For example, suggest 'a chic top' or 'a modern shirt' rather than just 'a blouse'.

  Provide concise style advice (2-3 sentences) for the following event, keeping in mind the weather conditions. Suggest specific types of garments or styles that would be appropriate and chic.

  Event Details:
  - Name: {{{event.eventName}}}
  - Type: {{{event.eventType}}}
  - Start: {{{event.eventStartDateTime}}}
  - End: {{{event.eventEndDateTime}}}
  {{#if event.eventLocation}}- Location: {{{event.eventLocation}}}{{/if}}

  Weather Conditions:
  - Temperature: {{{weather.temperature}}}°C
  - Condition: {{{weather.condition}}}

  Focus on creating an impression of effortless elegance and an understanding of current yet timeless fashion. Use British English.
  For example, if it's a business meeting, you might suggest "a tailored power suit in a jewel tone" or "a sophisticated midi dress with pointed-toe heels."
  If it's a social event, you could suggest "a flowy silk top with wide-leg trousers and statement earrings."
  `,
});

const generateEventStyleAdviceFlow = ai.defineFlow(
  {
    name: 'generateEventStyleAdviceFlow',
    inputSchema: GenerateEventStyleAdviceInputSchema,
    outputSchema: GenerateEventStyleAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Failed to get a response from the AI model for event style advice.");
    }
    return output;
  }
);
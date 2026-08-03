'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* ============================================================
   SCHEMAS (STRICT INPUT, FLEXIBLE OUTPUT)
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
  wardrobeData: z.string().min(1).catch('Assorted wardrobe items'),
  shoeCollectionData: z.string().min(1).catch('Assorted footwear'),
  accuWeatherInfo: AccuWeatherSchema.catch({ temperature: 20, condition: 'Clear' }),
  googleCalendarEvents: z.array(GoogleCalendarEventSchema).catch([]),
  contextHint: z.string().optional().default(''), // Added path/filename context hint to resolve low-contrast vision items
});

export type AnalyzeStyleDNAInput = z.infer<typeof AnalyzeStyleDNAInputSchema>;

/* ============================================================
   FALLBACKS & CONSTANTS
============================================================ */

const FALLBACK_STYLE_DNA =
  'The client presents a refined, fashion-conscious aesthetic, favouring versatile pieces with an elevated, modern sensibility. Their wardrobe suggests thoughtful curation, balancing comfort and polish, with footwear choices that complement both professional and lifestyle settings.';

/* ============================================================
   PROMPT (ENHANCED FOR CONTEXT & TEXTILE ACCURACY)
============================================================ */

const stylePrompt = ai.definePrompt({
  name: 'analyzeStyleDNAPrompt',
  input: { schema: AnalyzeStyleDNAInputSchema },
  prompt: `
    You are a luxury personal stylist for the SkoMiDora brand.
    
    TASK: Generate a concise "Style DNA" summary.
    RULES: 
    - 3-4 sentences maximum. 
    - British English.
    - No bullet points, no JSON, no markdown code blocks.
    - Focus on how their footwear (Shoebox) matches their wardrobe.
    - Overcome low-contrast visual hurdles (such as pristine whites, creams, and deep indigo or blue denim) by utilizing the provided context hints to ensure accurate material and color classification.

    INPUT DATA:
    Wardrobe: {{wardrobeData}}
    Footwear: {{shoeCollectionData}}
    Context Hints: {{contextHint}}
    Weather: {{accuWeatherInfo.temperature}}°C, {{accuWeatherInfo.condition}}
    Events: {{#each googleCalendarEvents}}{{eventName}} ({{eventType}}), {{/each}}
  `,
});

/* ============================================================
   PUBLIC ENTRY (THE TANK-PROOF VERSION)
============================================================ */

export async function analyzeStyleDNA(rawInput: unknown): Promise<{ styleDNA: string }> {
  try {
    // 1. Defensive Parsing
    const validated = AnalyzeStyleDNAInputSchema.parse(rawInput || {});

    // 2. Direct Model Call
    const response = await stylePrompt(validated);
    
    // 3. Robust Text Extraction
    let text = response.text.trim();

    // 4. Cleanup AI "chatter" or accidental JSON markers
    text = text.replace(/```json|```|{|}/g, '').trim();

    // 5. Final Validation Check
    if (!text || text.length < 20) {
      return { styleDNA: FALLBACK_STYLE_DNA };
    }

    return { 
      styleDNA: text.replace(/\s+/g, ' ') 
    };

  } catch (err) {
    console.error('CRITICAL: Style DNA Action failed:', err);
    return { styleDNA: FALLBACK_STYLE_DNA };
  }
}
/**
 * @fileOverview Shared TypeScript types used across server actions, flows,
 * and client components. Ensures type-safety between AI flows, Firestore,
 * and React components.
 */

import type { z } from "zod";
import { Timestamp } from "firebase/firestore";

import type {
  AnalyzeClothingItemOutputSchema,
  AnalyzeStyleDNAInputSchema,
  AnalyzeStyleDNAOutputSchema,
  AccuWeatherSchema as AccuWeatherSchemaInternal,
  GoogleCalendarEventSchema,
  GenerateEventStyleAdviceInputSchema,
  GenerateEventStyleAdviceOutputSchema,
  ProcessOutfitFeedbackInputSchema,
  ProcessOutfitFeedbackOutputSchema,
  OutfitSchema,
} from "./schemas";

import type { AnalyzeClothingItemInput } from "@/ai/flows/analyze-clothing-item";

/* ============================================================
   FIRESTORE ITEM
============================================================ */

export type AnalyzedItem = z.infer<typeof AnalyzeClothingItemOutputSchema> & {
  id: string;
  imageUrl: string;
  imagePath?: string;
  createdAt: number;
};

/* ============================================================
   BASIC EVENT TYPES
============================================================ */

export type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEventSchema>;

/**
 * Style advice for upcoming events (used on Dashboard).
 */
export interface UpcomingEventStyleAdvice {
  outfitRecommendation: any; // Future: replace with typed outfit structure
  eventCountry: string;
  id: string | null | undefined;

  eventName: string;
  eventStartDateTime: string;
  eventEndDateTime: string;
  eventType: string;
  eventLocation: string;

  temperature: number;
  weatherCondition: string;
  advice: string;
}

/* ============================================================
   AI FLOW TYPE EXPORTS
============================================================ */

export type { AnalyzeClothingItemInput };

export type AnalyzeClothingItemOutput = z.infer<
  typeof AnalyzeClothingItemOutputSchema
>;

export type AnalyzeStyleDNAInput = z.infer<typeof AnalyzeStyleDNAInputSchema>;
export type AnalyzeStyleDNAOutput = z.infer<typeof AnalyzeStyleDNAOutputSchema>;

export type AccuWeatherSchema = z.infer<typeof AccuWeatherSchemaInternal>;

export type GenerateEventStyleAdviceInput = z.infer<
  typeof GenerateEventStyleAdviceInputSchema
>;
export type GenerateEventStyleAdviceOutput = z.infer<
  typeof GenerateEventStyleAdviceOutputSchema
>;

export type ProcessOutfitFeedbackInput = z.infer<
  typeof ProcessOutfitFeedbackInputSchema
>;
export type ProcessOutfitFeedbackOutput = z.infer<
  typeof ProcessOutfitFeedbackOutputSchema
>;

/* ============================================================
   🔥 FIXED: RECOMMEND OUTFIT INPUT
============================================================ */
/**
 * NOTE:
 * - This MUST match page.tsx → generateOutfitForEventAction
 * - And MUST match flows/recommend-outfit.ts Zod schema.
 * - The AI expects EVERYTHING as strings.
 */
export interface RecommendOutfitInput {
  shoeCollection: string;       // comma-separated list
  wardrobeData: string;         // JSON stringified array of wardrobe items
  eventDetails: string;         // JSON string
  weatherConditions: string;    // JSON string
  stylePreferences: string;     // JSON string (Style DNA)
}

/* Output from the Outfit Flow */
export type SingleOutfitOutput = z.infer<typeof OutfitSchema>;
export type OutfitOutput = z.infer<typeof OutfitSchema>;

/* ============================================================
   DATE NORMALIZER
============================================================ */

/**
 * Safely converts Firestore timestamps, JS Dates, or raw numbers
 * into a millisecond timestamp for UI sorting.
 */
export const safeToMillis = (dateValue: any): number => {
  if (!dateValue) return Date.now();

  if (dateValue instanceof Timestamp) {
    return dateValue.toMillis();
  }

  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "toMillis" in dateValue &&
    typeof dateValue.toMillis === "function"
  ) {
    return dateValue.toMillis();
  }

  if (dateValue instanceof Date) return dateValue.getTime();

  if (typeof dateValue === "number") return dateValue;

  return Date.now();
};

/* ============================================================
   FEEDBACK TYPES
============================================================ */

export type OutfitForFeedbackAction = z.infer<typeof OutfitSchema>;
export type EventDetailsForFeedbackAction = z.infer<
  typeof GoogleCalendarEventSchema
>;

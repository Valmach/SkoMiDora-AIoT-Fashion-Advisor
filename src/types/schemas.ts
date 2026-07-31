/**
 * @fileOverview
 * Shared Zod schemas for runtime validation across the application.
 */

import { z } from "zod";

/* ============================================================
   Analyze Clothing Item
============================================================ */

export const AnalyzeClothingItemInputSchema = z.object({
  imageUri: z.string(),
});

export const AnalyzeClothingItemOutputSchema = z.object({
  itemName: z.string(),
  itemType: z.enum([
    "Top",
    "Bottom",
    "Outerwear",
    "Dress",
    "Shoes",
    "Accessory",
    "Bag",
    "Other",
  ]),
  designerName: z.string().optional(),
  color: z.string(),
  generalMaterial: z.string(),
  styleKeywords: z.array(z.string()),
  narrativeDescription: z.string(),
  detailedSpecifications: z.string().optional(),
});

/* ============================================================
   Shared Schemas
============================================================ */

export const AccuWeatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  location: z.string().optional(),
});

export const GoogleCalendarEventSchema = z.object({
  eventName: z.string(),
  eventStartDateTime: z.string(),
  eventEndDateTime: z.string(),
  eventType: z.string(),
  eventLocation: z.string().optional(),
  eventCountry: z.string().optional(),
});

/* ============================================================
   Analyze Style DNA (weather OPTIONAL)
============================================================ */

export const AnalyzeStyleDNAInputSchema = z.object({
  wardrobeData: z.string(),
  shoeCollectionData: z.string(),

  /**
   * ✅ FIX:
   * Weather is OPTIONAL for Style DNA analysis.
   * Style DNA should reflect enduring personal taste,
   * not transient environmental conditions.
   */
  accuWeatherInfo: AccuWeatherSchema.optional(),

  googleCalendarEvents: z.array(GoogleCalendarEventSchema),
});

export const AnalyzeStyleDNAOutputSchema = z.object({
  styleDNA: z.string(),
});

/* ============================================================
   Generate Event Style Advice (weather REQUIRED)
============================================================ */

export const GenerateEventStyleAdviceInputSchema = z.object({
  event: GoogleCalendarEventSchema,
  weather: AccuWeatherSchema,
});

export const GenerateEventStyleAdviceOutputSchema = z.object({
  advice: z.string(),
});

/* ============================================================
   Process Outfit Feedback
============================================================ */

const DesignerLinkSchema = z.object({
  designerName: z.string(),
  designerUrl: z.string(),
});

export const OutfitSchema = z.object({
  chosenShoe: z.string(),
  outfitImageDataUri: z.string().optional(),
  outfitDescription: z.string(),
  reasoning: z.string(),
  suitabilityScore: z.number(),
  designerLinks: z.array(DesignerLinkSchema).optional(),
  suggestedShoeboxTheme: z.string().optional(),
});

export const ProcessOutfitFeedbackInputSchema = z.object({
  outfitDetails: OutfitSchema,
  userAction: z.enum(["accepted", "rejected", "modified"]),
  eventDetails: GoogleCalendarEventSchema,
  userStyleDNA: z.string(),
  userReason: z.string().optional(),
});

export const ProcessOutfitFeedbackOutputSchema = z.object({
  followUpMessage: z.string(),
});

/* ============================================================
   Recommend Outfit
============================================================ */

export const RecommendOutfitInputSchema = z.object({
  shoeCollection: z.string(),
  wardrobeData: z.string(),
  eventDetails: z.string(),
  weatherConditions: z.string(),
  stylePreferences: z.string(),
});

/**
 * @fileOverview This file contains shared Zod schemas for type validation
 * across the application. These schemas are used by the AI flows and can be
 * used for input validation in server actions and components.
 */

import { z } from "zod";

// Schema for: src/ai/flows/analyze-clothing-item.ts
export const AnalyzeClothingItemInputSchema = z.object({
  imageUri: z
    .string()
    .describe(
      "A photo of a clothing item or accessory, as a public URL or a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>' or 'https://...'",
    ),
});

export const AnalyzeClothingItemOutputSchema = z.object({
  itemName: z
    .string()
    .describe(
      "A concise, descriptive name for the item (e.g., 'Blue Denim Jacket', 'Chanel Classic Flap Bag'). Aim for 3-5 words. If a brand is highly prominent and part of the item\'s common name (e.g., 'Gucci Horsebit Loafers'), it can be included here.",
    ),
  itemType: z
    .enum([
      "Top",
      "Bottom",
      "Outerwear",
      "Dress",
      "Shoes",
      "Accessory",
      "Bag",
      "Other",
    ])
    .describe("The general category of the clothing item or accessory."),
  designerName: z
    .string()
    .optional()
    .describe(
      "The designer or brand name, if identifiable from the image (e.g., logos, distinct brand markers). Otherwise omit. Do not guess if unsure.",
    ),
  color: z
    .string()
    .describe(
      "The dominant color(s) of the item. Be specific (e.g., 'Navy Blue', 'Cream White', 'Multicolor Floral Print', 'Metallic Gold').",
    ),
  generalMaterial: z
    .string()
    .describe(
      "The primary material perceived from the image (e.g., 'Cotton', 'Silk', 'Leather', 'Denim', 'Wool Blend', 'Knit', 'Patent Leather'). Avoid overly technical terms unless essential and clearly visible.",
    ),
  styleKeywords: z
    .array(z.string())
    .describe(
      "Up to 5 relevant style keywords describing its aesthetic (e.g., 'vintage', 'minimalist', 'bohemian', 'streetwear', 'formal', 'casual', 'sporty', 'athleisure', 'avant-garde', 'classic').",
    ),
  narrativeDescription: z
    .string()
    .describe(
      "A brief (2-3 sentences) engaging narrative description of the item, highlighting its key features and overall style impression. Use fashion-conscious language suitable for a discerning audience.",
    ),
  detailedSpecifications: z
    .string()
    .optional()
    .describe(
      "Additional notable visual details like pattern (e.g., 'Striped', 'Polka Dot'), print, fit (e.g., 'Slim Fit', 'Oversized', 'A-Line'), embellishments (e.g., 'Embroidery', 'Sequins'), hardware, or specific design features (e.g., 'Notched lapel', 'Quilted texture', 'Distressed details'). If you can discern or reasonably infer the country of origin (e.g., 'Made in Italy' for many luxury goods), include it as 'Made in [Country]'. List as bullet points if multiple details are present, separated by newlines within the string.",
    ),
});

// Schemas for: src/ai/flows/analyze-style-dna.ts
export const AccuWeatherSchema = z.object({
  temperature: z.number().describe("The current temperature in Celsius."),
  condition: z
    .string()
    .describe("The current weather condition (e.g., sunny, rainy)."),
});

export const GoogleCalendarEventSchema = z.object({
  eventName: z.string().describe("The name of the event."),
  eventStartDateTime: z.coerce
    .date()
    .describe("The start date and time of the event (ISO format)."),
  eventEndDateTime: z.coerce
    .date()
    .describe("The end date and time of the event (ISO format)."),
  eventType: z.string().describe("The type of event (e.g., business, social)."),
  eventLocation: z.string().optional().describe("The location of the event."),
});

export const AnalyzeStyleDNAInputSchema = z.object({
  wardrobeData: z
    .string()
    .describe(
      'RFID/NFC data representing the user\'s wardrobe collection. These users are fashion-forward and appreciate high-quality, stylish items, often from well-known designers or high-end brands. Their wardrobe reflects a sophisticated taste and a keen eye for current trends as well as timeless pieces. Example: "Item_1_Burberry_TrenchCoat_Beige_SizeM, Item_2_Gucci_SilkBlouse_Cream_SizeS"',
    ),
  shoeCollectionData: z
    .string()
    .describe(
      'RFID/NFC data representing the user\'s shoe collection. Shoes are a statement for these users, ranging from designer heels and boots to exclusive trainers and elegant flats. Collection emphasizes style, craftsmanship, and brand prestige. Example: "Shoe_1_Chanel_Slingbacks_BeigeBlack_Size39, Shoe_2_ManoloBlahnik_HangisiPumps_BlueSatin_Size39"',
    ),
  accuWeatherInfo: AccuWeatherSchema.describe("Data from the AccuWeather API."),
  googleCalendarEvents: z
    .array(GoogleCalendarEventSchema)
    .describe("Events from the user\'s Google Calendar."),
});

export const AnalyzeStyleDNAOutputSchema = z.object({
  styleDNA: z
    .string()
    .describe(
      "CRITICAL: This field MUST contain a single, plain text summary paragraph (approximately 3-4 lines) describing the user\'s style DNA. It should use British English and contemporary fashion language. It MUST NOT be a JSON object. It MUST NOT be a string representation of a JSON object. It MUST NOT echo or replicate the input JSON structure. It must be ONLY the descriptive paragraph text itself.",
    ),
});

// Schemas for: src/ai/flows/generate-event-style-advice.ts
export const GenerateEventStyleAdviceInputSchema = z.object({
  event: GoogleCalendarEventSchema.describe("Details of the upcoming event."),
  weather: AccuWeatherSchema.describe(
    "Current weather conditions for the event\'s timing/location.",
  ),
});

export const GenerateEventStyleAdviceOutputSchema = z.object({
  advice: z
    .string()
    .describe(
      "Concise (2-3 sentences) style advice for the event, considering the weather, event type, and a fashion-forward, middle to upper-class aesthetic. Suggest specific garment types or styles. Use British English and contemporary fashion language.",
    ),
});

// Schemas for: src/ai/flows/process-outfit-feedback.ts
// This schema is defined within recommend-outfit but is used here.
// For simplicity in sharing, we can redefine a compatible version or ensure it\'s imported.
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
  outfitDetails: OutfitSchema.describe(
    "The outfit recommendation the user provided feedback on.",
  ),
  userAction: z
    .enum(["accepted", "rejected", "modified"])
    .describe("The user\'s action regarding the outfit."),
  eventDetails: GoogleCalendarEventSchema.describe(
    "The details of the event for which the outfit was recommended.",
  ),
  userStyleDNA: z
    .string()
    .describe(
      "The user\'s current style DNA profile. Example: 'Based on their collection of Burberry trench coats and Gucci silk tops, the user\\\'s style is characterized by a blend of classic British tailoring and Italian luxury...'",
    ),
  userReason: z
    .string()
    .optional()
    .describe(
      "Optional reason provided by the user for rejection or modification.",
    ),
});

export const ProcessOutfitFeedbackOutputSchema = z.object({
  followUpMessage: z
    .string()
    .describe(
      "A helpful and context-aware follow-up message in British English based on the user\'s feedback. This message will be displayed to the user and should use contemporary, sophisticated language.",
    ),
});

// Schemas for: src/ai/flows/recommend-outfit.ts
export const RecommendOutfitInputSchema = z.object({
  shoeCollection: z
    .string()
    .describe(
      "A comma-separated list of the user\'s actual shoe names (e.g., 'Chanel Slingbacks, Manolo Blahnik Hangisi Pumps, Gucci Princetown Loafers'). Assume a high-end collection featuring designer names, quality craftsmanship, and fashionable pieces (e.g., trainers, heels, boots). This is a list of the user\'s ACTUAL shoes from their Digital Closet.",
    ),
  wardrobeData: z
    .string()
    .describe(
      "A comma-separated list of the user\'s actual clothing item names or brief descriptions (e.g., 'Burberry Trench Coat, Gucci Silk Blouse, Black Tailored Trousers'). This is a list of the user\'s ACTUAL clothing items from their Digital Closet.",
    ),
  eventDetails: z
    .string()
    .describe(
      "Event details from Google Calendar, including type, location, and time. Consider the formality and social context of these events.",
    ),
  weatherConditions: z
    .string()
    .describe(
      "Weather conditions from AccuWeather, including temperature, humidity, and precipitation.",
    ),

  stylePreferences: z // This is the Style DNA output from the previous flow
    .string()
    .describe(
      'User style DNA summary, reflecting their specific fashion profile derived from their actual wardrobe and shoes. This might include their preferred designers, silhouettes, materials, and a general aesthetic that leans towards middle to upper-class fashion trends and timeless elegance. Use British English in descriptions. Example: "Based on their collection of Burberry trench coats and Gucci silk blouses, the user\'s style is characterized by a blend of classic British tailoring and Italian luxury..."',
    ),
});

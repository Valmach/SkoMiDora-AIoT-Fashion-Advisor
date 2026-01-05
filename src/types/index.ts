import { z } from "zod";

// --- Schema Definitions (Zod) ---
export const AccuWeatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  location: z.string().optional(),
});

// --- Interface Definitions ---

export interface AnalyzedItem {
  id?: string;
  itemName: string;
  itemType: string;
  color: string;
  imageUrl: string;
  imagePath: string; // Used for deletion reference
  category?: string;
  createdAt: any;
  [key: string]: any;
}

export interface EventRecommendation {
  id: string;
  eventName: string;
  city: string;
  cityUrl?: string;
  footwearName: string;
  footwearImageUrl: string;
  clothingName?: string;
  clothingImageUrl?: string;
  suitabilityScore?: number;
  temp?: number;
  condition?: string;
  outfitDescription?: string;
  reasoning?: string;
}

// 🏆 ADDED: Missing Type for OutfitCard
export interface GoogleCalendarEvent {
  eventName: string;
  eventStartDateTime: string | Date;
  eventType: string;
  location?: string;
  description?: string;
}

export interface SingleOutfitOutput {
  outfitDescription: string;
  chosenShoe?: string;
  suitabilityScore: number;
  outfitImageDataUri?: string;
}

// --- Utility Functions ---
export function safeToMillis(date: any): number {
  if (!date) return Date.now();
  if (typeof date === 'object' && 'seconds' in date) return date.seconds * 1000;
  const parsed = new Date(date).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}
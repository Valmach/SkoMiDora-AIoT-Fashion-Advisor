import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod"; 
import { ReactNode } from "react"; 

// --- Zod Schemas ---

export const AccuWeatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  location: z.string().optional(),
});
export type AccuWeatherSchemaType = z.infer<typeof AccuWeatherSchema>;

export const GoogleCalendarEventSchema = z.object({
  eventName: z.string(),
  eventStartDateTime: z.string(),
  eventEndDateTime: z.string(),
  eventType: z.string(),
  eventLocation: z.string().optional(),
  eventCountry: z.string().optional(),
});
export type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEventSchema>;

// --- Outfit & Item Types ---

export interface SingleOutfitOutput {
  outfitImageDataUri: string | undefined;
  outfitDescription: ReactNode;
  chosenShoe: any;
  suitabilityScore: (score: any) => ReactNode;
  narrativeDescription: string;
  top: string;
  bottom: string;
  shoes: string;
  outerwear: string | null;
  accessories: string | null;
  imageUrl: string;
  description: string;
}

// Add this to your existing types file
export interface AnalyzedItem {
  id?: string;
  itemName: string;
  itemType: string;
  color: string;
  description?: string;
  narrativeDescription?: string;
  imageUrl: string;
  imagePath: string;
  createdAt: any; // Can be Firestore Timestamp or string
  styleKeywords?: string[];
  [key: string]: any; 
}

/**
 * ✅ Fixes ts(2305): Exporting safeToMillis
 * Converts various date formats into a sortable number
 */
export function safeToMillis(date: any): number {
  if (!date) return Date.now();
  
  // Handle Firestore Timestamp { seconds, nanoseconds }
  if (typeof date === 'object' && 'seconds' in date) {
    return date.seconds * 1000;
  }
  
  // Handle Date object or ISO String
  const parsed = new Date(date).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

// --- Recommendation & Feedback Types ---

export interface UpcomingEventStyleAdvice {
  eventImageUrl: any;
  outfitRecommendation: SingleOutfitOutput | any; 
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

export interface RecommendOutfitInput {
  shoeCollection: string[];
  wardrobeData: AnalyzedItem[]; 
  eventDetails: string;
  weatherConditions: string;
  stylePreferences: string;
}

export interface AnalyzeStyleDNAInput {
  googleCalendarEvents: any;
  wardrobeData: string;
  shoeCollectionData: string;
  styleQuestions: string[];
  currentStyleDNA: string;
}

// --- Feedback Specific Types (FIXED BUILD ERROR) ---

export interface ProcessOutfitFeedbackInput {
  userAction: string;
  outfit: SingleOutfitOutput;
  feedbackType: 'accepted' | 'rejected' | 'modified';
  userComment?: string;
  eventContext: string;
}

// ✅ UPDATE THIS TO MATCH YOUR AI FLOW RETURN VALUE
export interface ProcessOutfitFeedbackOutput {
  followUpMessage: string;  // This matches what line 30 is actually returning
  success?: boolean;        // Made optional so it doesn't crash if missing
  message?: string;        // Made optional so it doesn't crash if missing
  updatedDNA?: any;

}


// Helper types for Feedback Actions
export interface OutfitForFeedbackAction extends SingleOutfitOutput {}
export interface EventDetailsForFeedbackAction {
  eventName: string;
  eventType: string;
  [key: string]: any;
}
import { FieldValue } from "firebase-admin/firestore";

// --- Outfit & Item Types ---

export interface SingleOutfitOutput {
  top: string;
  bottom: string;
  shoes: string;
  outerwear: string | null;
  accessories: string | null;
  imageUrl: string; // The URL of the generated outfit image
  description: string;
}

export interface AnalyzedItem {
  id?: string; // Optional ID for client-side representation
  itemName: string;
  itemType: string;
  color: string | null;
  generalMaterial: string | null;
  narrativeDescription: string | null;
  styleKeywords: string[] | undefined;
  imageUrl: string;
  imagePath: string;
  createdAt: number | FieldValue;
}

// --- Recommendation Input/Output Types ---

// The type structure used for displaying an event and its associated style advice.
export interface UpcomingEventStyleAdvice {
  outfitRecommendation: SingleOutfitOutput | any; 
  
  eventCountry: string;
  id: string | null | undefined;

  // Event Details
  eventName: string;
  eventStartDateTime: string;
  eventEndDateTime: string;
  eventType: string;
  eventLocation: string;
  
  // Weather/Advice from LLM
  temperature: number;
  weatherCondition: string;
  advice: string;
}

// Input for the LLM flow (used in Server Actions after normalization)
export interface RecommendOutfitInput {
  shoeCollection: string[];
  wardrobeData: AnalyzedItem[]; // Use the structured AnalyzedItem array
  eventDetails: string;
  weatherConditions: string;
  stylePreferences: string;
}

// Input for Style DNA analysis flow
export interface AnalyzeStyleDNAInput {
  wardrobeData: string; // Comma-separated list of items (used before flow)
  shoeCollectionData: string; // Comma-separated list of shoes (used before flow)
  styleQuestions: string[];
  currentStyleDNA: string;
}

// Input for the feedback flow
export interface ProcessOutfitFeedbackInput {
  outfit: SingleOutfitOutput;
  feedbackType: 'accepted' | 'rejected' | 'modified';
  userComment?: string;
  eventContext: string;
}
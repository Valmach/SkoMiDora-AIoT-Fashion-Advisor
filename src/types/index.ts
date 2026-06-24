// src/types/index.d.ts

/* ============================================================
   📅 Google Calendar Event Contract
   Used by: recommendations, outfits, calendar AI
   ============================================================ */
   export interface GoogleCalendarEvent {
    id?: string;
    eventName: string;
    eventType?: string;
    eventStartDateTime: string;
    eventEndDateTime?: string;
    location?: string;
    temperature?: number;
    weatherCondition?: string;
  }
  
  /* ============================================================
     👗 Single Outfit Output (AI → UI Contract)
     Used by: OutfitCard, Recommendations, Hardware triggers
     ============================================================ */
  export interface SingleOutfitOutput {
    outfitDescription: string;
    outfitImageDataUri?: string; // Gemini / GenAI image
    suitabilityScore: number | string;
    chosenShoe?: string;
  
    /** Enforced post-fix */
    clothing?: {
      id: string;
      itemName: string;
      imageUrl: string;
    };
  
    footwear?: {
      id: string;
      itemName: string;
      imageUrl: string;
    };
  }
  
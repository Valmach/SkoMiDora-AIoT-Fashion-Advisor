'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const schema = z.object({
  recommendations: z.array(
    z.object({
      id: z.string().optional(),
      eventName: z.string(),
      eventStartDateTime: z.string(),
      location: z.string(),
      weatherCondition: z.string(),
      temperature: z.number(),
      outfitIdea: z.string(),
      reasoning: z.string(),
      items: z.array(z.string()),
      colorPalette: z.string(),
    })
  ),
});

// Helper: Shuffles the closet so Gemini sees a different mix every time
function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getUpcomingEventsStyleAdviceAction(closetItems: any[] = []) {
  
  if (!closetItems || closetItems.length === 0) {
    throw new Error("No wardrobe items found. Please add items to the closet.");
  }

  // 1. Shuffle and format the inventory to prevent LLM list-order bias
  // We slice to 80 items to give the AI massive variety while keeping token counts optimal
  const shuffledCloset = shuffleArray(closetItems).slice(0, 80); 
  
  const availableItemsList = shuffledCloset.map(item => 
    `- ${item.itemName || 'Unknown Item'} (Color: ${item.color || 'Any'}, Style: ${item.style || 'Versatile'})`
  ).join('\n');

  try {
    // 2. THE REAL AI CALL
    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      schema: schema,
      temperature: 0.8, // High temperature forces creative exploration of the 108 items
      system: `You are the elite AI fashion architect for the digital closet. 
      Your task is to generate 3 highly distinct outfit recommendations for upcoming lifestyle events.
      
      CRITICAL RULES:
      1. STRICT INVENTORY: You MUST ONLY select items from the "AVAILABLE CLOSET" list provided. Never invent or hallucinate clothing that is not on the list.
      2. ZERO REPETITION: Do not repeat any single item across the 3 outfits. Every look must use completely unique pieces.
      3. DEEP UTILIZATION: Dig deep into the inventory. Avoid defaulting to basic black items unless contextually perfect.
      4. Create realistic but distinct events (e.g., "Gallery Opening in SoHo", "Morning Coffee Run", "Client Dinner").`,
      prompt: `AVAILABLE CLOSET INVENTORY:\n${availableItemsList}\n\nReview this inventory and generate 3 unique, fully accessorized outfits for 3 different upcoming events.`,
    });

    return object.recommendations;

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // 3. THE GRACEFUL FALLBACK (Only triggers if the AI times out or crashes)
    return [
      {
        eventName: "API Timeout",
        eventStartDateTime: "System Notice",
        location: "Local Device",
        weatherCondition: "Offline",
        temperature: 70,
        outfitIdea: "Standard Uniform",
        reasoning: "The styling engine is currently syncing. Displaying fallback styles.",
        items: ["Classic White Tee", "Blue Denim", "Sneakers"],
        colorPalette: "White, Blue"
      }
    ];
  }
}
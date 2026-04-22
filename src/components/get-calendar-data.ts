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

// Helper: Shuffles the closet completely randomly
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

  // 1. Shuffle the entire inventory
  const shuffledCloset = shuffleArray(closetItems);

  // 2. SEED INJECTION: Extract 3 completely random items that the AI MUST use.
  // Because the array is shuffled, these will be wildly different every time you click refresh.
  const seedItem1 = shuffledCloset[0]?.itemName || '';
  const seedItem2 = shuffledCloset[1]?.itemName || '';
  const seedItem3 = shuffledCloset[2]?.itemName || '';

  // 3. Provide a large chunk of the closet for the AI to build the REST of the outfit
  const availableItemsList = shuffledCloset.slice(0, 90).map(item => 
    `- ${item.itemName || 'Unknown Item'} (Color: ${item.color || 'Any'}, Style: ${item.style || 'Versatile'})`
  ).join('\n');

  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      schema: schema,
      temperature: 0.9, // Cranked up to 0.9 for maximum styling chaos/creativity
      system: `You are an elite, avant-garde AI fashion architect styling a digital closet. 
      Your task is to generate 3 highly distinct outfit recommendations for upcoming lifestyle events.
      
      CRITICAL RULES - YOU MUST OBEY THESE:
      1. MANDATORY SEEDS: 
         - You MUST build Outfit #1 around this exact item: "${seedItem1}".
         - You MUST build Outfit #2 around this exact item: "${seedItem2}".
         - You MUST build Outfit #3 around this exact item: "${seedItem3}".
         These items must be the focal point of your 'reasoning'.
      2. STRICT INVENTORY: To complete the rest of the outfits, you MUST ONLY select from the "AVAILABLE CLOSET" list. 
      3. VERBATIM NAMES: When listing the 'items' array, copy the item names EXACTLY word-for-word from the inventory list. Do not alter a single word, or the frontend image matcher will fail.
      4. ZERO REPETITION: Do not use the same supporting item across multiple outfits.`,
      prompt: `AVAILABLE CLOSET INVENTORY:\n${availableItemsList}\n\nReview this inventory and construct 3 outfits utilizing the mandatory seed items.`,
    });

    return object.recommendations;

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Fallback if the AI crashes
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
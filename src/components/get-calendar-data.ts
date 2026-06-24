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

// Helper 1: Scrambles the array
function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper 2: THE FIX. Strips timestamps, hyphens, and file extensions.
function cleanItemName(rawName: string): string {
  if (!rawName) return 'Unknown Item';
  return rawName
    .replace(/^[0-9]+-/, '') // Removes leading Unix timestamps (e.g., 1751296561090-)
    .replace(/\.[a-zA-Z0-9]+$/, '') // Removes file extensions like .png or .jpg
    .replace(/-/g, ' ') // Replaces hyphens with spaces
    .replace(/_/g, ' ') // Replaces underscores with spaces
    .trim();
}

export async function getUpcomingEventsStyleAdviceAction(closetItems: any[] = []) {
  
  if (!closetItems || closetItems.length === 0) {
    throw new Error("No wardrobe items found. Please add items to the closet.");
  }

  const shuffledCloset = shuffleArray(closetItems);

  // SANITIZATION: Clean the names before feeding them to the AI
  const availableItemsList = shuffledCloset.slice(0, 90).map(item => {
    const cleanName = cleanItemName(item.itemName);
    return `- ${cleanName} (Color: ${item.color || 'Any'}, Style: ${item.style || 'Versatile'}, OriginalID: ${item.itemName})`;
  }).join('\n');

  // We still use seed injection, but with the CLEAN names.
  const seedItem1 = cleanItemName(shuffledCloset[0]?.itemName || '');
  const seedItem2 = cleanItemName(shuffledCloset[1]?.itemName || '');
  const seedItem3 = cleanItemName(shuffledCloset[2]?.itemName || '');

  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      schema: schema,
      temperature: 0.9, 
      system: `You are an elite, avant-garde AI fashion architect styling a digital closet. 
      Your task is to generate 3 highly distinct outfit recommendations for upcoming lifestyle events.
      
      CRITICAL RULES:
      1. MANDATORY SEEDS: 
         - Outfit #1 MUST prominently feature: "${seedItem1}".
         - Outfit #2 MUST prominently feature: "${seedItem2}".
         - Outfit #3 MUST prominently feature: "${seedItem3}".
      2. STRICT INVENTORY: You MUST ONLY select items from the "AVAILABLE CLOSET" list. 
      3. EXACT NAMES: When listing the 'items' array, use the exact name provided in the list.
      4. ZERO REPETITION: Do not use the same supporting item across multiple outfits.`,
      prompt: `AVAILABLE CLOSET INVENTORY:\n${availableItemsList}\n\nReview this inventory and construct 3 outfits utilizing the mandatory seed items.`,
    });

    return object.recommendations;

  } catch (error) {
    console.error("Gemini API Error:", error);
    
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
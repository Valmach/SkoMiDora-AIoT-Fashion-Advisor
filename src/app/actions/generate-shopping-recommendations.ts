'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
});

// Enforce that the AI must return a highly specific search query we can use to build a shopping link
const ShoppingRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    suggestedBrand: z.string().describe("The specific luxury designer brand (e.g., The Row, Loewe, Khaite)"),
    itemType: z.string().describe("The exact category of the item"),
    description: z.string().describe("Why this specific piece fills a gap in their current wardrobe for this event."),
    searchQuery: z.string().describe("A highly specific phrase to find this item online (e.g., 'Loewe camel wool tailored coat')")
  }))
});

export async function generateShoppingRecommendations(
  eventContext: string, 
  weatherContext: string, 
  targetCategory: string = "Any Missing Piece"
) {
  try {
    const { db } = getFirebaseAdmin();
    // Using publicWardrobeItems as requested
    const snapshot = await db.collection('publicWardrobeItems').limit(300).get();
    
    let currentWardrobe = "The closet is currently empty.";
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => doc.data());
      // Randomize to prevent the AI from fixating on the first few items
      const shuffledItems = items.sort(() => 0.5 - Math.random());
      currentWardrobe = shuffledItems.map(item => `- ${item.color || ''} ${item.itemType || ''} ${item.itemName || ''}`).join('\n');
    }

    const weatherPrompt = weatherContext ? `Weather context: ${weatherContext}.` : 'Provide versatile recommendations.';

    const prompt = `
      You are an elite personal shopper for a high-net-worth client. 
      Event: "${eventContext || 'General Wardrobe Update'}"
      ${weatherPrompt}

      The client specifically needs: "${targetCategory}".
      
      Here is what they ALREADY own:
      ${currentWardrobe}

      YOUR MISSION:
      Analyze their existing wardrobe above. Identify what is missing to complete a look for the event.
      Provide exactly 3 luxury recommendations that they DO NOT already own.
      
      CRITICAL:
      1. If they asked for a specific category (e.g., "Shorts"), ALL 3 items must be Shorts.
      2. If they asked for "Any Missing Piece", provide 3 different types of items that complete their current wardrobe.
      3. Suggest high-end, contemporary luxury brands (The Row, Bottega Veneta, Khaite, Marni, etc.).
    `;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: ShoppingRecommendationSchema,
      prompt: prompt,
      temperature: 0.8, 
    });

    if (!object || !object.recommendations || object.recommendations.length === 0) {
      throw new Error("AI returned empty recommendations.");
    }

    // Materialize the shopping links based on the specific search query
    const materializedLinks = object.recommendations.map(rec => ({
      ...rec,
      shopUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.searchQuery)}`
    }));

    return { success: true, recommendations: materializedLinks };

  } catch (error: any) {
    console.error("❌ Recommendation Engine Error:", error);
    return { success: false, error: "Failed to generate missing pieces." };
  }
}
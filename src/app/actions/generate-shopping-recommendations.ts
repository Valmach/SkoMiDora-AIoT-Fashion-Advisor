'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// 1. Use the exact same AI engine that works in get-daily-outfits
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
});

const ShoppingRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    suggestedBrand: z.string().describe("The specific designer brand recommended (e.g., The Row, Bottega Veneta, Khaite, Loewe, Jacquemus)"),
    itemType: z.string().describe("The category of the item (e.g., Outerwear, Footwear, Dress, Accessory)"),
    description: z.string().describe("A compelling, single-sentence description of why this piece works for the event and complements their existing wardrobe."),
    searchQuery: z.string().describe("A highly specific search phrase to find this item (e.g., 'Loewe camel wool tailored coat')")
  }))
});

export async function generateShoppingRecommendations(
  eventContext: string, 
  weatherContext: string, 
  targetCategory: string = "Any Missing Piece"
) {
  console.log(`[Server Action] Starting recommendation for: ${eventContext} | Weather: ${weatherContext} | Category: ${targetCategory}`);

  try {
    const { db } = getFirebaseAdmin();

    const snapshot = await db.collection('publicWardrobeItems').limit(500).get();
    
    let currentWardrobe = "The user's closet is currently empty.";
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => doc.data());
      const shuffledItems = items.sort(() => 0.5 - Math.random());
      currentWardrobe = shuffledItems.map(item => `- ${item.color || 'Unspecified'} ${item.itemType || 'Clothing item'} ${item.itemName || ''}`).join('\n');
      console.log(`[Server Action] Successfully loaded and shuffled ${items.length} items from wardrobe.`);
    }

    // Safely handle empty weather context so the AI doesn't panic
    const weatherRule = weatherContext 
      ? `1. CLIMATE ENFORCEMENT: You MUST strictly filter the inventory and recommendations based on the "${weatherContext}" weather.` 
      : `1. CLIMATE ENFORCEMENT: Provide versatile recommendations appropriate for the event context, as no specific weather was provided.`;

    const prompt = `
      You are an elite, avant-garde personal stylist for high-net-worth clients. 
      The user has an upcoming event: "${eventContext || 'General Wardrobe Refresh'}".

      Here is their entire current wardrobe inventory (${snapshot.size} items):
      ${currentWardrobe}

      CRITICAL STYLING RULES:
      ${weatherRule}
      2. TARGET CATEGORY ENFORCEMENT: The user is specifically looking for: "${targetCategory}".
         - If this says "Any Missing Piece", provide a mixed curation of completely different items (e.g., 1 top, 1 shoe, 1 bag).
         - If this specifies a distinct category (e.g., "Shorts", "Swimwear & Resort", "Shoes"), ALL 3 recommendations MUST be from that exact category. Do not mix and match.
      3. DIVERSITY ENFORCEMENT (CRITICAL): You MUST explore unique, unexpected luxury designers. DO NOT default to the most obvious choices. Provide fresh, high-end pairings (e.g., The Row, Khaite, Marni, Loewe) that the user might not have considered.
      4. Ensure the recommendations seamlessly complement the specific items they already own from the inventory list above.
    `;

    console.log("[Server Action] Sending prompt to Gemini via Vercel AI SDK...");
    
    // 2. Use generateObject instead of Genkit
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: ShoppingRecommendationSchema,
      prompt: prompt,
      temperature: 0.85,
    });

    if (!object || !object.recommendations) {
      return { success: false, error: "AI failed to generate recommendations." };
    }

    const materializedLinks = object.recommendations.map(rec => ({
      ...rec,
      shopUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.searchQuery)}`
    }));

    return { success: true, recommendations: materializedLinks };

  } catch (error: any) {
    console.error("❌ Recommendation Engine Error:", error);
    return { success: false, error: error.message || "Failed to generate shopping opportunities." };
  }
}
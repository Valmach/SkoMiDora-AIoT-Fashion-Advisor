'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  targetCategory: string = "Any Missing Piece", 
  userPreference: string = "high-end luxury"
) {
  console.log(`[Server Action] Starting recommendation for: ${eventContext} | Weather: ${weatherContext} | Category: ${targetCategory}`);

  try {
    const { db } = getFirebaseAdmin();

    const snapshot = await db.collection('publicWardrobeItems').limit(500).get();
    
    let currentWardrobe = "";
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => doc.data());
      
      // FIX 1: THE SHUFFLE - Mathematically scramble the array to prevent Top-Of-Pile Bias
      const shuffledItems = items.sort(() => 0.5 - Math.random());
      
      currentWardrobe = shuffledItems.map(item => `- ${item.color || 'Unspecified'} ${item.itemType || 'Clothing item'} ${item.itemName || ''}`).join('\n');
      console.log(`[Server Action] Successfully loaded and shuffled ${items.length} items from wardrobe.`);
    } else {
      currentWardrobe = "The user's closet is currently empty.";
    }

    // THE CATEGORY-AWARE & DIVERSITY-ENFORCED PROMPT
    const prompt = `
      You are an elite, avant-garde personal stylist for high-net-worth clients. 
      The user has an upcoming event: "${eventContext}".
      The exact weather conditions for this event are: "${weatherContext}".

      Here is their entire current wardrobe inventory (${snapshot.size} items):
      ${currentWardrobe}

      CRITICAL STYLING RULES:
      1. CLIMATE ENFORCEMENT: You MUST strictly filter the inventory and recommendations based on the ${weatherContext} weather. 
      2. TARGET CATEGORY ENFORCEMENT: The user is specifically looking for: "${targetCategory}".
         - If this says "Any Missing Piece", provide a mixed curation of completely different items (e.g., 1 top, 1 shoe, 1 bag).
         - If this specifies a distinct category (e.g., "Shoes", "Outerwear", "Dresses"), ALL 3 recommendations MUST be from that exact category. Do not mix and match.
      3. DIVERSITY ENFORCEMENT (CRITICAL): You MUST explore unique, unexpected luxury designers. DO NOT default to the most obvious choices (like only suggesting Chanel or Fendi). Provide fresh, high-end pairings (e.g., The Row, Khaite, Marni, Loewe) that the user might not have considered.
      4. Ensure the recommendations seamlessly complement the specific items they already own from the inventory list above.
    `;

    console.log("[Server Action] Sending prompt to Gemini via Genkit with High Temperature...");
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      // FIX 2: THE HEAT - Crank temperature to 0.85 to force creative, non-repetitive styling
      config: {
        temperature: 0.85,
        topP: 0.9,
      },
      prompt: prompt,
      output: { schema: ShoppingRecommendationSchema }
    });

    if (!output || !output.recommendations) {
      return { success: false, error: "AI failed to generate recommendations." };
    }

    const materializedLinks = output.recommendations.map(rec => ({
      ...rec,
      shopUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.searchQuery)}`
    }));

    return { success: true, recommendations: materializedLinks };

  } catch (error: any) {
    console.error("❌ Recommendation Engine Error:", error);
    return { success: false, error: error.message || "Failed to generate shopping opportunities." };
  }
}
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ShoppingRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    suggestedBrand: z.string().describe("The specific designer brand recommended (e.g., Burberry, Fendi, Gabriela Hearst, Chanel, Manolo Blahnik)"),
    itemType: z.string().describe("The category of the item (e.g., Outerwear, Footwear, Dress, Accessory)"),
    description: z.string().describe("A compelling, single-sentence description of why this piece works for the event and complements their existing wardrobe."),
    searchQuery: z.string().describe("A highly specific search phrase to find this item (e.g., 'Fendi black silk midi dress')")
  }))
});

// Notice we added weatherContext as a required parameter here
export async function generateShoppingRecommendations(eventContext: string, weatherContext: string, userPreference: string = "high-end luxury") {
  console.log(`[Server Action] Starting recommendation for: ${eventContext} | Weather: ${weatherContext}`);

  try {
    const { db } = getFirebaseAdmin();

    // Pull the massive wardrobe chunk
    const snapshot = await db.collection('publicWardrobeItems').limit(500).get();
    
    let currentWardrobe = "";
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => doc.data());
      currentWardrobe = items.map(item => `- ${item.color || 'Unspecified'} ${item.itemType || 'Clothing item'} ${item.itemName || ''}`).join('\n');
      console.log(`[Server Action] Successfully loaded ${items.length} items from wardrobe.`);
    } else {
      currentWardrobe = "The user's closet is currently empty.";
    }

    // THE UPGRADED PROMPT
    const prompt = `
      You are an elite personal stylist for high-net-worth clients. 
      The user has an upcoming event: "${eventContext}".
      The exact weather conditions for this event are: "${weatherContext}".

      Here is their entire current wardrobe inventory (${snapshot.size} items):
      ${currentWardrobe}

      CRITICAL STYLING RULES:
      1. CLIMATE ENFORCEMENT: You MUST strictly filter the inventory and recommendations based on the ${weatherContext} weather. 
         - If it is mild (e.g., 19°C/66°F), require light layers, appropriate footwear, and avoid extreme summer or extreme winter gear.
         - Do not suggest items that would make the user uncomfortably hot or uncomfortably cold.
      2. Based on their event, the strict weather parameters, and their preference for ${userPreference}, identify 3 specific shopping opportunities. 
      3. Focus heavily on integrating items from premier designers such as Gabriela Hearst, Manolo Blahnik, Burberry, Fendi, and Chanel.
      4. Ensure the recommendations complement what they already own (e.g., if they own a great Chanel dress, recommend a complementary Manolo Blahnik heel).
    `;

    console.log("[Server Action] Sending prompt to Gemini via Genkit...");
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: prompt,
      output: {
        schema: ShoppingRecommendationSchema
      }
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
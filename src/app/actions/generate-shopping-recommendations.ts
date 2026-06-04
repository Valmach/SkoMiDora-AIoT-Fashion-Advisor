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

export async function generateShoppingRecommendations(eventContext: string, userPreference: string = "high-end luxury") {
  console.log(`[Server Action] Starting recommendation generation for: ${eventContext}`);

  try {
    // LAZY LOAD: Initialize DB exactly when the action is called, bypassing Next.js bundle execution order
    const { db } = getFirebaseAdmin();

    console.log("[Server Action] Fetching wardrobe inventory from Firestore...");
    const snapshot = await db.collection('publicWardrobeItems').limit(30).get();
    
    let currentWardrobe = "";
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => doc.data());
      currentWardrobe = items.map(item => `- ${item.color || 'Unspecified'} ${item.itemType || 'Clothing item'} ${item.itemName || ''}`).join('\n');
      console.log(`[Server Action] Successfully loaded ${items.length} items from wardrobe.`);
    } else {
      currentWardrobe = "The user's closet is currently empty.";
      console.log("[Server Action] Wardrobe is empty.");
    }

    const prompt = `
      You are an elite personal stylist for high-net-worth clients. 
      The user has an upcoming event: "${eventContext}".
      They have stated they do not want to wear what they currently own, or they feel their current wardrobe is missing a key piece for this event.

      Here is their current wardrobe inventory:
      ${currentWardrobe}

      Based on their event, their current inventory, and their preference for ${userPreference}, identify 3 specific shopping opportunities. 
      Focus heavily on integrating items from premier designers such as Gabriela Hearst, Manolo Blahnik, Burberry, Fendi, and Chanel.
      Ensure the recommendations complement what they already own (e.g., if they own a great Chanel dress, recommend a complementary Manolo Blahnik heel).
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
      console.error("[Server Action] ❌ AI returned empty output.");
      return { success: false, error: "AI failed to generate recommendations." };
    }

    console.log("[Server Action] ✅ AI successfully generated recommendations.");

    const materializedLinks = output.recommendations.map(rec => ({
      ...rec,
      shopUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.searchQuery)}`
    }));

    return { 
      success: true, 
      recommendations: materializedLinks 
    };

  } catch (error: any) {
    console.error("❌ Recommendation Engine Error:", error);
    return { success: false, error: error.message || "Failed to generate shopping opportunities." };
  }
}
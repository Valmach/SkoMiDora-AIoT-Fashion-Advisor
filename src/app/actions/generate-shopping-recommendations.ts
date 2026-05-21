'use server';

import { db as adminDb } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// 1. Define the schema for the shopping opportunities
const ShoppingRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    suggestedBrand: z.string().describe("The specific designer brand recommended (e.g., Burberry, Fendi, Gabriela Hearst, Chanel, Manolo Blahnik)"),
    itemType: z.string().describe("The category of the item (e.g., Outerwear, Footwear, Dress, Accessory)"),
    description: z.string().describe("A compelling, single-sentence description of why this piece works for the event and complements their existing wardrobe."),
    searchQuery: z.string().describe("A highly specific search phrase to find this item (e.g., 'Fendi black silk midi dress')")
  }))
});

export async function generateShoppingRecommendations(eventContext: string, userPreference: string = "high-end luxury") {
  if (!adminDb) {
    throw new Error("Firebase Admin DB is not initialized. Check server logs.");
  }

  try {
    // 2. Retrieve the user's current digital closet
    // In a full production app, you would filter by the specific user's ID
    const snapshot = await adminDb.collection('wardrobeItems').limit(30).get();
    
    let currentWardrobe = "";
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => doc.data());
      // Map the DB items into a readable string for the AI
      currentWardrobe = items.map(item => `- ${item.color || 'Unspecified color'} ${item.brand || 'Unknown brand'} ${item.itemName || item.clothingType}`).join('\n');
    } else {
      currentWardrobe = "The user's closet is currently empty.";
    }

    // 3. Construct the prompt for the Gap Analysis
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

    // 4. Generate the structured shopping list
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

    // 5. Enhance the output with actionable shopping links (Google Shopping fallback)
    const materializedLinks = output.recommendations.map(rec => ({
      ...rec,
      // Create a direct outbound search link so the user can immediately shop the recommendation
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
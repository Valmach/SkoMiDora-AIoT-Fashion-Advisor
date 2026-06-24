'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI Fashion Analysis Engine
 * Takes an image URL, analyzes the garment, and returns structured data.
 * STRICTLY NO DATABASE WRITES HERE to prevent Cloud Functions 500 timeouts.
 */
export async function analyzeAndSaveClothingItem(data: { 
  imageUrl: string; 
  imagePath: string; 
  aiFriendlyName: string; 
}) {
  try {
    if (!data.imageUrl) throw new Error("No image URL provided");

    // 1. Initialize AI (Ensure GEMINI_API_KEY is in your .env file)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Fetch the image from Firebase Storage into a buffer
    const imageResponse = await fetch(data.imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 3. Prompt the AI for fashion intelligence
    const prompt = `Analyze this clothing item. Return ONLY a valid JSON object with these exact keys:
    - itemName (string, a creative name)
    - itemType (string, e.g., "Shoes", "Dress", "Jacket")
    - color (string)
    - narrativeDescription (string, a stylish fashion copywriter description)
    - styleKeywords (array of 3-5 strings)
    - generalMaterial (string)
    - designerName (string, if recognizable, otherwise "Unknown")`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageResponse.headers.get("content-type") || "image/png"
        }
      }
    ]);

    // 4. Parse the AI response cleanly
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json\n?|```/g, '').trim();
    const aiData = JSON.parse(jsonString);

    // 5. Send the rich metadata safely back to the client
    return {
      success: true,
      analyzedData: {
        itemName: aiData.itemName || data.aiFriendlyName,
        itemType: aiData.itemType || "Uncategorized",
        color: aiData.color || "Unknown",
        narrativeDescription: aiData.narrativeDescription || "A beautiful addition to your digital closet.",
        styleKeywords: aiData.styleKeywords || [],
        generalMaterial: aiData.generalMaterial || "Unknown",
        designerName: aiData.designerName || "Unknown",
        imagePath: data.imagePath,
        imageUrl: data.imageUrl,
      }
    };

  } catch (error: unknown) {
    console.error("AI Analysis Error:", error);
    // Graceful Fallback: If the AI times out, return basic data so the upload doesn't break
    return {
      success: false,
      analyzedData: {
        itemName: data.aiFriendlyName,
        itemType: "Uncategorized",
        imagePath: data.imagePath,
        imageUrl: data.imageUrl,
      }
    };
  }
}
'use server';
import { getAdmin } from "@/lib/firebase-admin-loader";



// FLOW IMPORTS
import type { AnalyzeClothingItemInput, AnalyzeClothingItemOutput } from "@/ai/flows/analyze-clothing-item";
import { analyzeClothingItem } from "@/ai/flows/analyze-clothing-item";

import { analyzeStyleDNA } from "@/ai/flows/analyze-style-dna";

import type {
  RecommendOutfitInput,
  SingleOutfitOutput as SingleOutfitOutputType,
  GoogleCalendarEvent,
  AnalyzedItem,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  UpcomingEventStyleAdvice
} from "@/types";

import { generateOutfitForEvent } from "@/ai/flows/recommend-outfit";

import type { ProcessOutfitFeedbackInput, ProcessOutfitFeedbackOutput } from "@/types";
import { processOutfitFeedback } from "@/ai/flows/process-outfit-feedback";

import { generateSpeechFromText } from "@/ai/flows/generate-speech-from-text";
import { mockAnalyzeStyleDNAInput } from "@/lib/mockData";


/* -------------------------------------------------------------------------- */
/*  ANALYZE & SAVE ITEM                                                       */
/* -------------------------------------------------------------------------- */
export async function analyzeAndSaveClothingItem(
  formData: FormData
): Promise<{ error: string } | AnalyzedItem> {

  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file found.");

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const imagePath = `public_wardrobe_items/${uniqueFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = (await getAdmin()).storage().bucket();
    const upload = bucket.file(imagePath);

    await upload.save(buffer, { metadata: { contentType: file.type } });
    await upload.makePublic();

    const downloadURL = upload.publicUrl();

    const aiInput: AnalyzeClothingItemInput = { imageUri: downloadURL };
    const analysisResult = await analyzeClothingItem(aiInput);

    const newItemData = {
      ...analysisResult,
      imageUrl: downloadURL,
      imagePath,
      createdAt: (await getAdmin()).firestore.FieldValue.serverTimestamp()
    };

    const docRef = await (await getAdmin()).firestore().collection("publicWardrobeItems").add(newItemData);

    return {
      ...(analysisResult as AnalyzeClothingItemOutput),
      id: docRef.id,
      imageUrl: downloadURL,
      imagePath,
      createdAt: Date.now(),
    };

  } catch (e: any) {
    return { error: e.message || "Server error." };
  }
}


/* -------------------------------------------------------------------------- */
/*  DELETE ITEM                                                               */
/* -------------------------------------------------------------------------- */
export async function deleteClothingItem(
  itemId: string,
  imagePath?: string
) {
  try {
    await (await getAdmin()).firestore().collection("publicWardrobeItems").doc(itemId).delete();

    if (imagePath) {
      await (await getAdmin()).storage().bucket().file(imagePath).delete().catch(() => null);
    }

    return { success: true };

  } catch (e: any) {
    return { error: e.message || "Delete failed." };
  }
}


/* -------------------------------------------------------------------------- */
/*  STYLE DNA                                                                 */
/* -------------------------------------------------------------------------- */
export async function analyzeStyleDNAAction() {
  try {
    const snapshot = await (await getAdmin()).firestore().collection("publicWardrobeItems").get();

    const items: AnalyzedItem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AnalyzedItem[];

    const clothingNames = items.map((i) => i.itemName).join(", ");

    const aiInput = {
      ...mockAnalyzeStyleDNAInput,
      wardrobeData: clothingNames,
      shoeCollectionData: clothingNames,
    };

    const result = await analyzeStyleDNA(aiInput);
    return { styleDNA: result.styleDNA };

  } catch (e: any) {
    return { error: e.message };
  }
}


/* -------------------------------------------------------------------------- */
/*  OUTFIT GENERATION                                                         */
/* -------------------------------------------------------------------------- */
export async function generateOutfitForEventAction(
  input: RecommendOutfitInput
) {
  try {
    return await generateOutfitForEvent(input);
  } catch (e: any) {
    return { error: e.message };
  }
}


/* -------------------------------------------------------------------------- */
/*  FEEDBACK PROCESSING                                                       */
/* -------------------------------------------------------------------------- */
export async function processOutfitFeedbackAction(
  input: ProcessOutfitFeedbackInput
): Promise<ProcessOutfitFeedbackOutput | { error: string }> {

  try {
    return await processOutfitFeedback(input);
  } catch (e: any) {
    return { error: e.message };
  }
}


/* -------------------------------------------------------------------------- */
/*  SPEECH GENERATION                                                         */
/* -------------------------------------------------------------------------- */
export async function generateSpeechFromTextAction(text: string) {
  try {
    const result = await generateSpeechFromText(text);
    return { media: result.media };
  } catch (e: any) {
    return { error: e.message };
  }
}
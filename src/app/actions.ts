'use server';
/**
 * @fileOverview Server actions for interacting with AI flows and Firestore.
 */

import { getAdmin } from '@/lib/firebase-admin-loader';
import { FieldValue } from 'firebase-admin/firestore';

// Import AI flow types and functions
import type {
  AnalyzeClothingItemInput,
  AnalyzeClothingItemOutput,
} from '@/ai/flows/analyze-clothing-item';
import { analyzeClothingItem } from '@/ai/flows/analyze-clothing-item';

// --- Style DNA flow (string-based Genkit flow under the hood) ---
import { analyzeStyleDNA as analyzeStyleDNAFlow } from '@/ai/flows/analyze-style-dna';

import type {
  RecommendOutfitInput,
  SingleOutfitOutput as SingleOutfitOutputType,
  GoogleCalendarEvent,
  AnalyzedItem,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  UpcomingEventStyleAdvice,
  AnalyzeStyleDNAInput,
} from '@/types';

import { generateOutfitForEvent } from '@/ai/flows/recommend-outfit';
import type { GenerateEventStyleAdviceInput } from '@/types';
import { generateEventStyleAdvice } from '@/ai/flows/generate-event-style-advice';
import type {
  ProcessOutfitFeedbackInput,
  ProcessOutfitFeedbackOutput,
} from '@/types';
import { processOutfitFeedback } from '@/ai/flows/process-outfit-feedback';
import { getCurrentWeather } from '@/services/accuweather';
import { mockAnalyzeStyleDNAInput } from '@/lib/mockData';
import { generateSpeechFromText } from '@/ai/flows/generate-speech-from-text';

// Re-exporting other types for client component use
export type {
  GoogleCalendarEvent as GoogleCalendarEventSchema,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  AnalyzedItem,
  UpcomingEventStyleAdvice,
};

// Re-export SingleOutfitOutput
export type SingleOutfitOutput = SingleOutfitOutputType;

export interface RecommendOutfitOutput {
  outfits: SingleOutfitOutputType[];
  eventsForOutfits: GoogleCalendarEvent[];
}

/**
 * Style DNA adapter:
 * We stringify so we don't break the Genkit schema (fixes TypeScript complaint).
 */
async function runAnalyzeStyleDNA(
  input: AnalyzeStyleDNAInput,
): Promise<any> {
  return analyzeStyleDNAFlow(JSON.stringify(input) as any);
}

/**
 * Upload → Analyze → Save clothing item.
 * Only changed: FIXED download URL to avoid GCS 404.
 */
export async function analyzeAndSaveClothingItem(
  formData: FormData,
): Promise<{ error: string } | AnalyzedItem> {
  console.log('ACTION: analyzeAndSaveClothingItem started.');

  try {
    const admin = await getAdmin();
    const db = admin.firestore();
    const storage = admin.storage();

    const file = formData.get('file') as File;
    if (!file) throw new Error('No file found in the form data.');

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const imagePath = `public_wardrobe_items/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = storage.bucket("styleai-footwear.appspot.com"); // ← explicit bucket
    const fileUpload = bucket.file(imagePath);

    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000",
      },
    });

    await fileUpload.makePublic();
    const downloadURL = `https://storage.googleapis.com/styleai-footwear.appspot.com/${imagePath}`;

    // 🔥 FIXED: reliable public URL (no signed link, no 404)


    // AI Analysis
    const analysisResult = await analyzeClothingItem({ imageUri: downloadURL });
    if (!analysisResult || typeof analysisResult.itemName !== 'string') {
      throw new Error('AI analysis failed.');
    }

    const newItemData = {
      ...analysisResult,
      imageUrl: downloadURL,
      imagePath,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('publicWardrobeItems').add(newItemData);

    return {
      ...(analysisResult as AnalyzeClothingItemOutput),
      id: docRef.id,
      imageUrl: downloadURL,
      imagePath,
      createdAt: Date.now(),
    };
  } catch (e: any) {
    return { error: `Action Error: ${e.message || 'Unknown error.'}` };
  }
}

/**
 * Delete clothing item & image
 */
export async function deleteClothingItem(
  itemId: string,
  imagePath: string | undefined,
): Promise<{ success: true } | { error: string }> {
  const admin = await getAdmin();
  const db = admin.firestore();
  const storage = admin.storage();

  try {
    await db.collection('publicWardrobeItems').doc(itemId).delete();
  } catch (e: any) {
    return { error: `Database error: ${e.code || e.message}` };
  }

  if (imagePath) {
    try {
      const bucket = storage.bucket();
      await bucket.file(imagePath).delete();
    } catch (e: any) {
      console.warn(`Non-critical: could not delete storage file ${imagePath}`);
    }
  }

  return { success: true };
}

/**
 * Style DNA analysis (combines mock calendar/weather + live wardrobe)
 */
export async function analyzeStyleDNAAction(): Promise<
  { styleDNA: string } | { error: string }
> {
  try {
    const admin = await getAdmin();
    const db = admin.firestore();
    const itemsCollectionRef = db.collection('publicWardrobeItems');
    const snapshot = await itemsCollectionRef.get();

    const items: AnalyzedItem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: 0,
    })) as AnalyzedItem[];

    const shoeItems = items.filter((i) => i.itemType === 'Shoes');
    const clothingItems = items.filter((i) => i.itemType !== 'Shoes');

    const wardrobeData =
      clothingItems.length > 0
        ? clothingItems.map((i) => i.itemName).join(', ')
        : mockAnalyzeStyleDNAInput.wardrobeData;

    const shoeCollectionData =
      shoeItems.length > 0
        ? shoeItems.map((i) => i.itemName).join(', ')
        : mockAnalyzeStyleDNAInput.shoeCollectionData;

    const aiInput: AnalyzeStyleDNAInput = {
      ...mockAnalyzeStyleDNAInput,
      wardrobeData,
      shoeCollectionData,
    };

    const result = await runAnalyzeStyleDNA(aiInput);
    if (!result?.styleDNA) throw new Error('Style DNA missing.');

    return { styleDNA: result.styleDNA };
  } catch (e: any) {
    return { error: e.message || 'Failed to analyze style DNA.' };
  }
}

/**
 * Outfit generation
 */
export async function generateOutfitForEventAction(
  input: RecommendOutfitInput,
): Promise<SingleOutfitOutputType | { error: string }> {
  try {
    return await generateOutfitForEvent(input);
  } catch (e: any) {
    return { error: e.message || 'Failed to generate outfit.' };
  }
}

/**
 * Feedback Processing
 */
export async function processOutfitFeedbackAction(
  input: ProcessOutfitFeedbackInput,
): Promise<ProcessOutfitFeedbackOutput | { error: string }> {
  try {
    return await processOutfitFeedback(input);
  } catch (e: any) {
    return { error: e.message || 'Failed to process outfit feedback.' };
  }
}

/**
 * Text → Speech
 */
export async function generateSpeechFromTextAction(
  text: string,
): Promise<{ media?: string; error?: string }> {
  try {
    const result = await generateSpeechFromText(text);
    return { media: result.media };
  } catch (e: any) {
    return { error: e.message || 'Failed to generate speech.' };
  }
}

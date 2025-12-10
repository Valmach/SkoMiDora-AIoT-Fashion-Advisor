'use server';
/**
 * @fileOverview Server actions for interacting with AI flows and Firestore.
 */

import { getAdmin } from '@/lib/firebase-admin-loader';
import { FieldValue } from 'firebase-admin/firestore';

// AI flow imports
import type {
  AnalyzeClothingItemInput,
  AnalyzeClothingItemOutput,
} from '@/ai/flows/analyze-clothing-item';
import { analyzeClothingItem } from '@/ai/flows/analyze-clothing-item';

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
import { mockAnalyzeStyleDNAInput } from '@/lib/mockData';
import { generateSpeechFromText } from '@/ai/flows/generate-speech-from-text';

// ------- Re-exports ----------
export type {
  GoogleCalendarEvent as GoogleCalendarEventSchema,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  AnalyzedItem,
  UpcomingEventStyleAdvice,
};
export type SingleOutfitOutput = SingleOutfitOutputType;

export interface RecommendOutfitOutput {
  outfits: SingleOutfitOutputType[];
  eventsForOutfits: GoogleCalendarEvent[];
}

// Helper for string-based Style DNA flow
async function runAnalyzeStyleDNA(input: AnalyzeStyleDNAInput) {
  return analyzeStyleDNAFlow(JSON.stringify(input) as any);
}

/* =======================================================
   1) UPLOAD → ANALYZE → SAVE CLOTHING ITEM
   ======================================================= */
export async function analyzeAndSaveClothingItem(
  formData: FormData,
): Promise<{ error: string } | AnalyzedItem> {
  try {
    const admin = getAdmin();
    if (!admin) return { error: 'Admin credentials missing.' };

    const db = admin.firestore();
    const storage = admin.storage();

    const file = formData.get('file') as File;
    if (!file) return { error: 'No file found in form data.' };

    const imagePath = `public_wardrobe_items/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = storage.bucket('styleai-footwear.appspot.com');
    const fileUpload = bucket.file(imagePath);

    await fileUpload.save(buffer, {
      metadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
    });
    await fileUpload.makePublic();

    const downloadURL = `https://storage.googleapis.com/styleai-footwear.appspot.com/${imagePath}`;

    const analysisResult = await analyzeClothingItem({ imageUri: downloadURL });
    if (!analysisResult?.itemName) return { error: 'AI analysis failed.' };

    const docRef = await db.collection('publicWardrobeItems').add({
      ...analysisResult,
      imageUrl: downloadURL,
      imagePath,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      ...(analysisResult as AnalyzeClothingItemOutput),
      id: docRef.id,
      imageUrl: downloadURL,
      imagePath,
      createdAt: Date.now(),
    };
  } catch (e: any) {
    return { error: e.message || 'Unknown upload error.' };
  }
}

/* =======================================================
   2) DELETE ITEM
   ======================================================= */
export async function deleteClothingItem(
  itemId: string,
  imagePath?: string,
) {
  const admin = getAdmin();
  if (!admin) return { error: 'Admin credentials missing.' };

  const db = admin.firestore();
  const storage = admin.storage();

  try {
    await db.collection('publicWardrobeItems').doc(itemId).delete();
  } catch (e: any) {
    return { error: `DB delete error: ${e.code || e.message}` };
  }

  if (imagePath) {
    try {
      await storage.bucket().file(imagePath).delete();
    } catch {
      console.warn(`⚠️ Cannot delete storage file ${imagePath}`);
    }
  }
  return { success: true };
}

/* =======================================================
   3) STYLE DNA + CLOSET → AI
   ======================================================= */
export async function analyzeStyleDNAAction() {
  const admin = getAdmin();
  if (!admin) return { error: 'Admin credentials missing for SSR.' };

  try {
    const db = admin.firestore();
    const snapshot = await db.collection('publicWardrobeItems').get();

    const items: AnalyzedItem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: 0,
    })) as AnalyzedItem[];

    const wardrobeData = items.filter(i => i.itemType !== 'Shoes').map(i => i.itemName).join(', ');
    const shoeCollectionData = items.filter(i => i.itemType === 'Shoes').map(i => i.itemName).join(', ');

    const aiInput: AnalyzeStyleDNAInput = {
      ...mockAnalyzeStyleDNAInput,
      wardrobeData: wardrobeData || mockAnalyzeStyleDNAInput.wardrobeData,
      shoeCollectionData: shoeCollectionData || mockAnalyzeStyleDNAInput.shoeCollectionData,
    };

    const result = await runAnalyzeStyleDNA(aiInput);
    return result?.styleDNA ? { styleDNA: result.styleDNA } : { error: 'Style DNA missing' };
  } catch (e: any) {
    return { error: e.message || 'Style DNA server error' };
  }
}

/* =======================================================
   4) OUTFIT GENERATION
   ======================================================= */
export async function generateOutfitForEventAction(input: RecommendOutfitInput) {
  try {
    return await generateOutfitForEvent(input);
  } catch (e: any) {
    return { error: e.message || 'Failed to generate outfit' };
  }
}

/* =======================================================
   5) FEEDBACK
   ======================================================= */
export async function processOutfitFeedbackAction(input: ProcessOutfitFeedbackInput) {
  try {
    return await processOutfitFeedback(input);
  } catch (e: any) {
    return { error: e.message || 'Failed to process feedback' };
  }
}

/* =======================================================
   6) SPEECH
   ======================================================= */
export async function generateSpeechFromTextAction(text: string) {
  try {
    const result = await generateSpeechFromText(text);
    return { media: result.media };
  } catch (e: any) {
    return { error: e.message || 'Speech synthesis failed' };
  }
}

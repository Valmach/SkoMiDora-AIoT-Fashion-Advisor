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

// NOTE: analyzeStyleDNA currently expects a STRING input in its TS signature.
import { analyzeStyleDNA } from '@/ai/flows/analyze-style-dna';

import type {
  RecommendOutfitInput,
  SingleOutfitOutput as SingleOutfitOutputType,
  GoogleCalendarEvent,
  AnalyzedItem,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  UpcomingEventStyleAdvice,
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

// Re-export SingleOutfitOutput with a different name if needed, or just export it
export type SingleOutfitOutput = SingleOutfitOutputType;

export interface RecommendOutfitOutput {
  outfits: SingleOutfitOutputType[];
  eventsForOutfits: GoogleCalendarEvent[];
}

/**
 * Input structure we send into Style DNA (before stringifying).
 * This lives locally here and is NOT imported from the flow module,
 * so we don't depend on its TS exports.
 */
export interface AnalyzeStyleDNAInput {
  wardrobeData: string;
  shoeCollectionData: string;
  accuWeatherInfo: {
    temperature: number;
    condition: string;
    location?: string;
  };
  googleCalendarEvents: {
    eventName: string;
    eventStartDateTime: string;
    eventEndDateTime: string;
    eventType: string;
    eventLocation?: string;
    eventCountry?: string;
  }[];
}

/* -------------------------------------------------------------------------- */
/*  1) Analyze + Save Clothing Item                                           */
/* -------------------------------------------------------------------------- */

export async function analyzeAndSaveClothingItem(
  formData: FormData
): Promise<{ error: string } | AnalyzedItem> {
  console.log('ACTION: analyzeAndSaveClothingItem started.');

  try {
    const admin = await getAdmin();
    const db = admin.firestore();
    const storage = admin.storage();

    const file = formData.get('file') as File;
    if (!file) {
      console.error('ACTION_ERROR: No file found in form data.');
      throw new Error('No file found in the form data.');
    }
    console.log(
      `ACTION_INFO: File received: ${file.name}, type: ${file.type}, size: ${file.size}`
    );

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const imagePath = `public_wardrobe_items/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = storage.bucket();
    const fileUpload = bucket.file(imagePath);

    console.log('ACTION_INFO: Attempting to upload bytes to Storage...');
    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });
    console.log('ACTION_SUCCESS: uploadBytes completed successfully.');

    await fileUpload.makePublic();
    const downloadURL = fileUpload.publicUrl();

    console.log(`ACTION_SUCCESS: Got public URL: ${downloadURL}`);

    if (!downloadURL) {
      console.error(
        'ACTION_ERROR: Image uploaded, but publicUrl returned nothing.'
      );
      throw new Error('Image uploaded, but failed to get a public URL.');
    }

    console.log(
      'ACTION_INFO: Upload successful. Proceeding with AI analysis.'
    );
    const aiInput: AnalyzeClothingItemInput = { imageUri: downloadURL };
    const analysisResult = await analyzeClothingItem(aiInput);

    if (!analysisResult || typeof analysisResult.itemName !== 'string') {
      throw new Error('AI analysis failed to return valid data.');
    }
    console.log(
      'ACTION_INFO: AI analysis successful. Proceeding with Firestore write.'
    );

    const newItemData = {
      ...analysisResult,
      imageUrl: downloadURL,
      imagePath,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection('publicWardrobeItems')
      .add(newItemData);
    console.log(
      `ACTION_SUCCESS: Data saved to Firestore with ID: ${docRef.id}`
    );

    return {
      ...(analysisResult as AnalyzeClothingItemOutput),
      id: docRef.id,
      imageUrl: downloadURL,
      imagePath,
      createdAt: Date.now(),
    };
  } catch (e: any) {
    console.error('CRITICAL ERROR in analyzeAndSaveClothingItem action:', e);
    const detailedMessage = `Action Error: ${
      e.message || 'An unknown error occurred during server-side processing.'
    }`;
    return { error: detailedMessage };
  }
}

/* -------------------------------------------------------------------------- */
/*  2) Delete Clothing Item                                                   */
/* -------------------------------------------------------------------------- */

export async function deleteClothingItem(
  itemId: string,
  imagePath: string | undefined
): Promise<{ success: true } | { error: string }> {
  console.log(`ACTION: Attempting to delete item: ${itemId}`);

  const admin = await getAdmin();
  const db = admin.firestore();
  const storage = admin.storage();

  try {
    await db.collection('publicWardrobeItems').doc(itemId).delete();
    console.log(`ACTION_SUCCESS: Firestore document ${itemId} deleted.`);
  } catch (e: any) {
    console.error(
      `CRITICAL_ERROR: Could not delete Firestore document ${itemId}. Error: ${e.message}`,
      e
    );
    return {
      error: `Database error: Could not remove item. (${e.code || e.message})`,
    };
  }

  if (imagePath) {
    try {
      const bucket = storage.bucket();
      await bucket.file(imagePath).delete();
      console.log(`ACTION_SUCCESS: Storage file ${imagePath} deleted.`);
    } catch (e: any) {
      console.warn(
        `ACTION_WARN: Item deleted from database, but storage file '${imagePath}' could not be removed. It may be orphaned. Error: ${e.message}`
      );
    }
  }

  return { success: true };
}

/* -------------------------------------------------------------------------- */
/*  3) Style DNA Action (FIXED to pass STRING into analyzeStyleDNA)          */
/* -------------------------------------------------------------------------- */

export async function analyzeStyleDNAAction(): Promise<
  { styleDNA: string } | { error: string }
> {
  try {
    const admin = await getAdmin();
    const db = admin.firestore();

    console.log(
      'ACTION: analyzeStyleDNAAction started. Fetching items from Firestore...'
    );
    const itemsCollectionRef = db.collection('publicWardrobeItems');
    const querySnapshot = await itemsCollectionRef.get();

    const allItems: AnalyzedItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allItems.push({
        id: doc.id,
        itemName: data.itemName,
        itemType: data.itemType,
        imageUrl: data.imageUrl,
        imagePath: data.imagePath,
        createdAt: 0,
        ...data,
      } as AnalyzedItem);
    });

    console.log(`ACTION: Found ${allItems.length} items in Firestore.`);

    const shoeItems = allItems.filter((item) => item.itemType === 'Shoes');
    const clothingItems = allItems.filter((item) => item.itemType !== 'Shoes');

    // Use fetched data if available, otherwise fall back to mock data
    const wardrobeData =
      clothingItems.length > 0
        ? clothingItems.map((item) => item.itemName).join(', ')
        : mockAnalyzeStyleDNAInput.wardrobeData;

    const shoeCollectionData =
      shoeItems.length > 0
        ? shoeItems.map((item) => item.itemName).join(', ')
        : mockAnalyzeStyleDNAInput.shoeCollectionData;

    console.log(
      `ACTION: wardrobeData for AI: ${wardrobeData.substring(0, 100)}...`
    );
    console.log(
      `ACTION: shoeCollectionData for AI: ${shoeCollectionData.substring(
        0,
        100
      )}...`
    );

    // Build strongly-typed input object locally…
    const aiInput: AnalyzeStyleDNAInput = {
      ...mockAnalyzeStyleDNAInput, // provides accuWeatherInfo + googleCalendarEvents mocks
      wardrobeData,
      shoeCollectionData,
    };

    // 🔥 FIX: analyzeStyleDNA expects a STRING → we send JSON.stringify(aiInput)
    const rawResult = (await analyzeStyleDNA(
      JSON.stringify(aiInput)
    )) as unknown;

    // Normalise the result so callers always get `{ styleDNA: string }`
    let styleDNA: string;

    if (
      rawResult &&
      typeof rawResult === 'object' &&
      'styleDNA' in rawResult &&
      typeof (rawResult as any).styleDNA === 'string'
    ) {
      styleDNA = (rawResult as any).styleDNA;
    } else if (typeof rawResult === 'string') {
      styleDNA = rawResult;
    } else {
      styleDNA =
        'Based on your wardrobe and footwear, your style reflects a considered, evolving fashion identity.';
    }

    return { styleDNA };
  } catch (e: any) {
    console.error('Error in analyzeStyleDNAAction:', e);
    return { error: e.message || 'Failed to analyze style DNA.' };
  }
}

/* -------------------------------------------------------------------------- */
/*  4) Generate Outfit for Event                                              */
/* -------------------------------------------------------------------------- */

export async function generateOutfitForEventAction(
  input: RecommendOutfitInput
): Promise<SingleOutfitOutputType | { error: string }> {
  try {
    return await generateOutfitForEvent(input);
  } catch (e: any) {
    console.error('Error in generateOutfitForEventAction:', e);
    return {
      error: e.message || 'Failed to generate outfit recommendation.',
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  5) Process Outfit Feedback                                                */
/* -------------------------------------------------------------------------- */

export async function processOutfitFeedbackAction(
  input: ProcessOutfitFeedbackInput
): Promise<ProcessOutfitFeedbackOutput | { error: string }> {
  try {
    return await processOutfitFeedback(input);
  } catch (e: any) {
    console.error('Error in processOutfitFeedbackAction:', e);
    return { error: e.message || 'Failed to process outfit feedback.' };
  }
}

/* -------------------------------------------------------------------------- */
/*  6) Generate Speech from Text                                              */
/* -------------------------------------------------------------------------- */

export async function generateSpeechFromTextAction(
  text: string
): Promise<{ media?: string; error?: string }> {
  try {
    const result = await generateSpeechFromText(text);
    return { media: result.media };
  } catch (e: any) {
    console.error('Error in generateSpeechFromTextAction:', e);
    return { error: e.message || 'Failed to generate speech.' };
  }
}

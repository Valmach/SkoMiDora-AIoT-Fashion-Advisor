
'use server';
/**
 * @fileOverview Server actions for interacting with AI flows and Firestore.
 */

import { firestore, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Import AI flow types and functions
import type { AnalyzeClothingItemInput, AnalyzeClothingItemOutput } from '@/ai/flows/analyze-clothing-item';
import { analyzeClothingItem } from '@/ai/flows/analyze-clothing-item';

// ... other action imports ...
import type { AnalyzeStyleDNAInput, AnalyzeStyleDNAOutput, GoogleCalendarEventSchema, AccuWeatherSchema as ImportedAccuWeatherSchema } from '@/ai/flows/analyze-style-dna';
import { analyzeStyleDNA } from '@/ai/flows/analyze-style-dna';
import type { RecommendOutfitInput, OutfitOutput as SingleOutfitOutput } from '@/ai/flows/recommend-outfit';
import { generateOutfitForEvent } from '@/ai/flows/recommend-outfit';
import type { GenerateEventStyleAdviceInput, GenerateEventStyleAdviceOutput } from '@/ai/flows/generate-event-style-advice';
import { generateEventStyleAdvice } from '@/ai/flows/generate-event-style-advice';
import type { ProcessOutfitFeedbackInput, ProcessOutfitFeedbackOutput, OutfitForFeedback as ImportedOutfitForFeedback, EventDetailsForFeedback as ImportedEventDetailsForFeedback } from '@/ai/flows/process-outfit-feedback';
import { processOutfitFeedback } from '@/ai/flows/process-outfit-feedback';
import { getCurrentWeather } from '@/services/accuweather';
import { mockAnalyzeStyleDNAInput } from '@/lib/mockData';


// This is the primary data structure for a clothing item in Firestore and the app.
export interface AnalyzedItem extends AnalyzeClothingItemOutput {
  id: string; // Firestore document ID
  imageUrl: string; // Firebase Storage download URL
  imagePath?: string; // Firebase Storage path
  createdAt?: number; // Timestamp in milliseconds for sorting/tracking
}

// Re-exporting other types for client component use
export type { GoogleCalendarEventSchema, ImportedAccuWeatherSchema as AccuWeatherSchema };
export type { ImportedOutfitForFeedback as OutfitForFeedbackAction, ImportedEventDetailsForFeedback as EventDetailsForFeedbackAction };
export interface UpcomingEventStyleAdvice {
  eventName: string;
  eventStartDateTime: string;
  eventEndDateTime: string;
  eventType: string;
  eventLocation?: string;
  temperature: number;
  weatherCondition: string;
  advice: string;
}
export interface RecommendOutfitOutput {
  outfits: SingleOutfitOutput[];
  eventsForOutfits: GoogleCalendarEventSchema[];
}

/**
 * Takes image file data via FormData, uploads it to Firebase Storage,
 * analyzes it with AI, and saves the result to Firestore.
 * This server-centric approach avoids client-side permission issues and payload limits.
 */
export async function analyzeAndSaveClothingItem(
  formData: FormData
): Promise<{ error: string } | AnalyzedItem> {
  console.log("ACTION: analyzeAndSaveClothingItem started.");
  try {
    const file = formData.get('file') as File;
    if (!file) {
      console.error("ACTION_ERROR: No file found in form data.");
      throw new Error("No file found in the form data.");
    }
    console.log(`ACTION_INFO: File received: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Step 1: Upload the image to Firebase Storage from the server action
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const imagePath = `public_wardrobe_items/${uniqueFileName}`;
    const imageFileRef = storageRef(storage, imagePath);
    console.log(`ACTION_INFO: Created storage ref with path: ${imageFileRef.fullPath}`);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log("ACTION_INFO: Attempting to upload bytes to Storage...");
    await uploadBytes(imageFileRef, buffer, { contentType: file.type });
    console.log("ACTION_SUCCESS: uploadBytes completed successfully.");

    console.log("ACTION_INFO: Attempting to get download URL...");
    const downloadURL = await getDownloadURL(imageFileRef);
    console.log(`ACTION_SUCCESS: Got download URL: ${downloadURL}`);

    if (!downloadURL) {
      console.error("ACTION_ERROR: Image uploaded, but getDownloadURL returned nothing.");
      throw new Error("Image uploaded, but failed to get a download URL.");
    }
    
    console.log("ACTION_INFO: Upload successful. Proceeding with AI analysis.");
    const aiInput: AnalyzeClothingItemInput = { imageUri: downloadURL };
    const analysisResult = await analyzeClothingItem(aiInput);

    if (!analysisResult || typeof analysisResult.itemName !== 'string') {
        throw new Error('AI analysis failed to return valid data.');
    }
    console.log("ACTION_INFO: AI analysis successful. Proceeding with Firestore write.");

    const newItemData = {
      ...analysisResult,
      imageUrl: downloadURL,
      imagePath: imagePath,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(firestore, 'publicWardrobeItems'), newItemData);
    console.log(`ACTION_SUCCESS: Data saved to Firestore with ID: ${docRef.id}`);
    
    return {
      ...(analysisResult as AnalyzeClothingItemOutput),
      id: docRef.id,
      imageUrl: downloadURL,
      imagePath: imagePath,
      createdAt: Date.now(),
    };
    
  } catch (e: any) {
    console.error("CRITICAL ERROR in analyzeAndSaveClothingItem action:", e);
    const detailedMessage = `Action Error: ${e.message || "An unknown error occurred during server-side processing."}`;
    return { error: detailedMessage };
  }
}


/**
 * Deletes a clothing item from Firestore and its corresponding image from Firebase Storage.
 * This function prioritizes deleting the Firestore document to ensure the UI updates correctly.
 */
export async function deleteClothingItem(
  itemId: string,
  imagePath: string | undefined
): Promise<{ success: true } | { error: string }> {
  console.log(`ACTION: Attempting to delete item: ${itemId}`);

  // First, delete the Firestore document. This is the source of truth for the UI.
  try {
    await deleteDoc(doc(firestore, 'publicWardrobeItems', itemId));
    console.log(`ACTION_SUCCESS: Firestore document ${itemId} deleted.`);
  } catch (e: any) {
    console.error(`CRITICAL_ERROR: Could not delete Firestore document ${itemId}. Error: ${e.message}`, e);
    return { error: `Database error: Could not remove item. (${e.code || e.message})` };
  }

  // If Firestore deletion was successful, then try to delete the storage file.
  if (imagePath) {
    try {
      const imageFileRef = storageRef(storage, imagePath);
      await deleteObject(imageFileRef);
      console.log(`ACTION_SUCCESS: Storage file ${imagePath} deleted.`);
    } catch (e: any) {
      // This is a non-critical error. The item is gone from the UI.
      // We log a warning that the file might be orphaned.
      console.warn(`ACTION_WARN: Item deleted from database, but storage file '${imagePath}' could not be removed. It may be orphaned. Error: ${e.message}`);
    }
  }

  return { success: true };
}


// --- Other existing actions (updated) ---

/**
 * Analyzes the user's style DNA.
 * This action now fetches wardrobe data directly from Firestore for accuracy and robustness.
 */
export async function analyzeStyleDNAAction(): Promise<AnalyzeStyleDNAOutput | { error:string }> {
  try {
    console.log("ACTION: analyzeStyleDNAAction started. Fetching items from Firestore...");
    const itemsCollectionRef = collection(firestore, 'publicWardrobeItems');
    const querySnapshot = await getDocs(itemsCollectionRef);
    
    const allItems: AnalyzedItem[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        allItems.push({
          id: doc.id,
          itemName: data.itemName,
          itemType: data.itemType,
          imageUrl: data.imageUrl,
          // Add other fields from AnalyzeClothingItemOutput if they exist
          ...data,
          color: '',
          generalMaterial: '',
          styleKeywords: [],
          narrativeDescription: ''
        });
    });

    console.log(`ACTION: Found ${allItems.length} items in Firestore.`);

    const shoeItems = allItems.filter(item => item.itemType === 'Shoes');
    const clothingItems = allItems.filter(item => item.itemType !== 'Shoes');

    // Use fetched data if available, otherwise fall back to mock data
    const wardrobeData = clothingItems.length > 0 
        ? clothingItems.map(item => item.itemName).join(', ')
        : mockAnalyzeStyleDNAInput.wardrobeData;
        
    const shoeCollectionData = shoeItems.length > 0
        ? shoeItems.map(item => item.itemName).join(', ')
        : mockAnalyzeStyleDNAInput.shoeCollectionData;

    console.log(`ACTION: wardrobeData for AI: ${wardrobeData.substring(0, 100)}...`);
    console.log(`ACTION: shoeCollectionData for AI: ${shoeCollectionData.substring(0, 100)}...`);

    const aiInput: AnalyzeStyleDNAInput = {
      ...mockAnalyzeStyleDNAInput, // This provides calendar and weather mocks
      wardrobeData,
      shoeCollectionData,
      accuWeatherInfo: undefined,
      googleCalendarEvents: []
    };

    return await analyzeStyleDNA(aiInput);
  } catch (e: any) {
    console.error("Error in analyzeStyleDNAAction:", e);
    return { error: e.message || "Failed to analyze style DNA." };
  }
}

export async function generateOutfitForEventAction(
  input: RecommendOutfitInput
): Promise<SingleOutfitOutput | { error: string }> {
  try {
    return await generateOutfitForEvent(input);
  } catch (e: any) {
    console.error("Error in generateOutfitForEventAction:", e);
    return { error: e.message || "Failed to generate outfit recommendation." };
  }
}

export async function getUpcomingEventsStyleAdviceAction(
  events: GoogleCalendarEventSchema[]
): Promise<UpcomingEventStyleAdvice[]> {
  try {
    const advicePromises = events.map(async (event) => {
      const eventWeather = await getCurrentWeather(event.eventLocation, event.eventStartDateTime);
      const { temperature, condition } = eventWeather || { temperature: 15, condition: "Weather data unavailable" };
      const adviceInput: GenerateEventStyleAdviceInput = {
        event,
        weather: { temperature, condition },
      };
      const adviceResult = await generateEventStyleAdvice(adviceInput);
      return { ...event, temperature, weatherCondition: condition, advice: adviceResult.advice };
    });
    return await Promise.all(advicePromises);
  } catch (e: any) {
    console.error("Error in getUpcomingEventsStyleAdviceAction:", e);
    return events.map(event => ({
      ...event,
      temperature: 0,
      weatherCondition: "Style advice system error.",
      advice: "Style advice temporarily unavailable due to a system error.",
    }));
  }
}

export async function processOutfitFeedbackAction(
  input: ProcessOutfitFeedbackInput
): Promise<ProcessOutfitFeedbackOutput | { error: string }> {
  try {
    return await processOutfitFeedback(input);
  } catch (e: any) {
    console.error("Error in processOutfitFeedbackAction:", e);
    return { error: e.message || "Failed to process outfit feedback." };
  }
}
#!/bin/bash
set -e

echo "====================================================="
echo "🛠  SkoMiDora – Full Backend Repair Suite"
echo "====================================================="
echo

ROOT_DIR="$(pwd)"
echo "📂 Project root: $ROOT_DIR"
echo

# ------------------------------------------------------
# 1. Rewrite src/lib/firebase-admin.ts
# ------------------------------------------------------
echo "📄 Repairing src/lib/firebase-admin.ts ..."

mkdir -p src/lib

cat > src/lib/firebase-admin.ts << 'TSEOF'
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

const privateKey = rawPrivateKey
  ? rawPrivateKey.replace(/\\n/g, "\n")
  : undefined;

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Missing FIREBASE_ADMIN_* env vars.");
    console.error("FIREBASE_ADMIN_PROJECT_ID:", projectId ? "[set]" : "[MISSING]");
    console.error("FIREBASE_ADMIN_CLIENT_EMAIL:", clientEmail ? "[set]" : "[MISSING]");
    console.error(
      "FIREBASE_ADMIN_PRIVATE_KEY:",
      privateKey ? "[set (length " + privateKey.length + ")]" : "[MISSING]"
    );
    throw new Error("Firebase Admin env vars are not correctly configured.");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  console.log("✅ Firebase Admin SDK initialized successfully");
}

const db = admin.firestore();
const storage = admin.storage();

export { admin, db, storage };
TSEOF

echo "✅ src/lib/firebase-admin.ts rewritten."
echo

# ------------------------------------------------------
# 2. Rewrite src/app/actions.ts
# ------------------------------------------------------
echo "📄 Repairing src/app/actions.ts ..."

mkdir -p src/app

cat > src/app/actions.ts << 'TSEOF'
'use server';
/**
 * @fileOverview Server actions for interacting with AI flows and Firestore.
 */

import { db, storage } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Import AI flow types and functions
import type {
  AnalyzeClothingItemInput,
  AnalyzeClothingItemOutput,
} from "@/ai/flows/analyze-clothing-item";
import { analyzeClothingItem } from "@/ai/flows/analyze-clothing-item";

// Other action imports
import { analyzeStyleDNA } from "@/ai/flows/analyze-style-dna";
import type {
  RecommendOutfitInput,
  SingleOutfitOutput as SingleOutfitOutputType,
  GoogleCalendarEvent,
  AnalyzedItem,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  UpcomingEventStyleAdvice,
  ProcessOutfitFeedbackInput,
  ProcessOutfitFeedbackOutput,
  GenerateEventStyleAdviceInput,
} from "@/types";

import { generateOutfitForEvent } from "@/ai/flows/recommend-outfit";
import { generateEventStyleAdvice } from "@/ai/flows/generate-event-style-advice";
import { getCurrentWeather } from "@/services/accuweather";
import { mockAnalyzeStyleDNAInput } from "@/lib/mockData";
import { generateSpeechFromText } from "@/ai/flows/generate-speech-from-text";

// Re-exporting other types for client component use
export type {
  GoogleCalendarEvent as GoogleCalendarEventSchema,
  AccuWeatherSchema,
  OutfitForFeedbackAction,
  EventDetailsForFeedbackAction,
  AnalyzedItem,
  UpcomingEventStyleAdvice,
};

// Re-export SingleOutfitOutput with a different name if needed
export type SingleOutfitOutput = SingleOutfitOutputType;

export interface RecommendOutfitOutput {
  outfits: SingleOutfitOutputType[];
  eventsForOutfits: GoogleCalendarEvent[];
}

/**
 * Takes image file data via FormData, uploads it to Firebase Storage,
 * analyzes it with AI, and saves the result to Firestore.
 */
export async function analyzeAndSaveClothingItem(
  formData: FormData
): Promise<{ error: string } | AnalyzedItem> {
  console.log("ACTION: analyzeAndSaveClothingItem started.");

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      console.error("ACTION_ERROR: No file found in form data.");
      throw new Error("No file found in the form data.");
    }

    console.log(
      `ACTION_INFO: File received: ${file.name}, type: ${file.type}, size: ${file.size}`
    );

    // Step 1: Upload the image to Firebase Storage from the server action
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const imagePath = `public_wardrobe_items/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = storage.bucket();
    const fileUpload = bucket.file(imagePath);

    console.log("ACTION_INFO: Attempting to upload bytes to Storage...");
    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });
    console.log("ACTION_SUCCESS: uploadBytes completed successfully.");

    await fileUpload.makePublic();
    const downloadURL = fileUpload.publicUrl();

    console.log(`ACTION_SUCCESS: Got public URL: ${downloadURL}`);

    if (!downloadURL) {
      console.error(
        "ACTION_ERROR: Image uploaded, but publicUrl returned nothing."
      );
      throw new Error("Image uploaded, but failed to get a download URL.");
    }

    console.log("ACTION_INFO: Upload successful. Proceeding with AI analysis.");
    const aiInput: AnalyzeClothingItemInput = { imageUri: downloadURL };
    const analysisResult = await analyzeClothingItem(aiInput);

    if (!analysisResult || typeof analysisResult.itemName !== "string") {
      throw new Error("AI analysis failed to return valid data.");
    }
    console.log(
      "ACTION_INFO: AI analysis successful. Proceeding with Firestore write."
    );

    const newItemData = {
      ...analysisResult,
      imageUrl: downloadURL,
      imagePath,
      createdAt: Timestamp.now(),
    };

    const docRef = await db.collection("publicWardrobeItems").add(newItemData);
    console.log(
      `ACTION_SUCCESS: Data saved to Firestore with ID: ${docRef.id}`
    );

    return {
      ...(analysisResult as AnalyzeClothingItemOutput),
      id: docRef.id,
      imageUrl: downloadURL,
      imagePath,
      createdAt: Date.now(), // For immediate client-side display
    } as unknown as AnalyzedItem;
  } catch (e: any) {
    console.error("CRITICAL ERROR in analyzeAndSaveClothingItem action:", e);
    const detailedMessage = `Action Error: ${
      e?.message || "An unknown error occurred during server-side processing."
    }`;
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
    await db.collection("publicWardrobeItems").doc(itemId).delete();
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

  // If Firestore deletion was successful, then try to delete the storage file.
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

/**
 * Analyzes the user's style DNA using Firestore wardrobe items and mock data.
 */
export async function analyzeStyleDNAAction(): Promise<
  { styleDNA: string } | { error: string }
> {
  try {
    console.log(
      "ACTION: analyzeStyleDNAAction started. Fetching items from Firestore..."
    );
    const itemsCollectionRef = db.collection("publicWardrobeItems");
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
        createdAt: 0, // Placeholder, not used in this action
        ...data,
      } as AnalyzedItem);
    });

    console.log(`ACTION: Found ${allItems.length} items in Firestore.`);

    const shoeItems = allItems.filter((item) => item.itemType === "Shoes");
    const clothingItems = allItems.filter((item) => item.itemType !== "Shoes");

    const wardrobeData =
      clothingItems.length > 0
        ? clothingItems.map((item) => item.itemName).join(", ")
        : mockAnalyzeStyleDNAInput.wardrobeData;

    const shoeCollectionData =
      shoeItems.length > 0
        ? shoeItems.map((item) => item.itemName).join(", ")
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

    const aiInput = {
      ...mockAnalyzeStyleDNAInput,
      wardrobeData,
      shoeCollectionData,
    };

    const result = await analyzeStyleDNA(aiInput);

    if (result && typeof result.styleDNA === "string") {
      return { styleDNA: result.styleDNA };
    } else {
      throw new Error("AI analysis did not return the expected styleDNA.");
    }
  } catch (e: any) {
    console.error("Error in analyzeStyleDNAAction:", e);
    return { error: e.message || "Failed to analyze style DNA." };
  }
}

/**
 * Wrapper for outfit recommendation for an event.
 */
export async function generateOutfitForEventAction(
  input: RecommendOutfitInput
): Promise<SingleOutfitOutputType | { error: string }> {
  try {
    return await generateOutfitForEvent(input);
  } catch (e: any) {
    console.error("Error in generateOutfitForEventAction:", e);
    return { error: e.message || "Failed to generate outfit recommendation." };
  }
}

/**
 * Wrapper for processing outfit feedback.
 */
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

/**
 * Wrapper for generating speech from text.
 */
export async function generateSpeechFromTextAction(
  text: string
): Promise<{ media?: string; error?: string }> {
  try {
    const result = await generateSpeechFromText(text);
    return { media: result.media };
  } catch (e: any) {
    console.error("Error in generateSpeechFromTextAction:", e);
    return { error: e.message || "Failed to generate speech." };
  }
}
TSEOF

echo "✅ src/app/actions.ts rewritten."
echo

# ------------------------------------------------------
# 3. Clean build output and rebuild
# ------------------------------------------------------
echo "🧹 Cleaning .next..."
rm -rf .next

echo "🏗  Running npm run build..."
npm run build

echo
echo "✅ Backend repair suite completed."
echo "   - firebase-admin.ts reset"
echo "   - actions.ts reset"
echo "   - .next rebuilt"
echo "====================================================="

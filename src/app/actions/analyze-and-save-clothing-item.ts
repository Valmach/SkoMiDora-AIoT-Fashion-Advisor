'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

/**
 * Analyzes an image (Vision logic placeholder) and saves metadata to Firestore.
 */
export async function analyzeAndSaveClothingItem(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file uploaded");

    // Placeholder for your Smart Shoebox AI Vision logic
    const newItem = {
      itemName: file.name.replace(/\.[^/.]+$/, ""), // Use filename as default name
      itemType: "Uncategorized", 
      imagePath: `public_wardrobe_items/${file.name}`,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, 'publicWardrobeItems'), newItem);

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Upload Action Error:", error);
    throw new Error(error.message || "Failed to analyze item");
  }
}
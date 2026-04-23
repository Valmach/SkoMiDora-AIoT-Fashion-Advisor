'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

/**
 * Saves the verified image metadata to the digital closet.
 * THE FIX: Notice the parameter is now a typed object, NOT FormData.
 */
export async function analyzeAndSaveClothingItem(data: { 
  imageUrl: string; 
  imagePath: string; 
  aiFriendlyName: string; 
}) {
  try {
    if (!data.imageUrl) throw new Error("No image URL provided");

    // Write the clean, verified data to Firestore
    const newItem = {
      itemName: data.aiFriendlyName, 
      itemType: "Uncategorized", 
      imagePath: data.imagePath,
      imageUrl: data.imageUrl,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, 'publicWardrobeItems'), newItem);

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Database Write Error:", error);
    throw new Error("Failed to save item metadata");
  }
}
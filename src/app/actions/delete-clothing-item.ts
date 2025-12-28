'use server';

import { doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { firestore, storage } from '@/lib/firebase';

/**
 * Deletes a clothing item from Firestore and its image from Storage.
 */
export async function deleteClothingItem(itemId: string, imagePath?: string) {
  try {
    // 1. Delete Firestore Document
    const docRef = doc(firestore, 'publicWardrobeItems', itemId);
    await deleteDoc(docRef);

    // 2. Delete Image from Firebase Storage if path exists
    if (imagePath) {
      const storageRef = ref(storage, imagePath);
      await deleteObject(storageRef).catch((err) => {
        console.warn("Storage delete failed (item may not exist):", err);
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Delete Action Error:", error);
    throw new Error(error.message || "Failed to delete item");
  }
}
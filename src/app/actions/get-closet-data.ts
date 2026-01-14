'use server';

import { db } from "@/lib/firebase-admin";

export async function getClosetDataAdmin() {
  try {
    // Assuming your collection is 'wardrobe' based on your RFID sync setup
    const snapshot = await db.collection('wardrobe').get();
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[Admin] Synced ${items.length} items from Smart Shoebox.`);
    return items;
  } catch (error) {
    console.error("Firebase Admin Sync Error:", error);
    return [];
  }
}
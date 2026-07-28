'use server';

import { adminDb as db } from "@/lib/firebase-admin";

export async function getClosetDataAdmin() {
  // 1. SAFETY CHECK: Stop if database didn't connect
  if (!db) {
    console.error("❌ Database connection failed. Check server logs for missing keys.");
    return [];
  }

  try {
    // 2. FETCH DATA
    // We use 'publicWardrobeItems' to match the collection used in your frontend
    const snapshot = await db.collection('publicWardrobeItems').get();
    
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
'use server';

import { getAdmin } from "@/lib/firebase-admin";

export async function getClosetDataAdmin() {
  const admin = getAdmin();
  const db = admin.firestore();
  
  // Use specific bucket or default
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = admin.storage().bucket(bucketName);

  try {
    const snapshot = await db.collection('publicWardrobeItems')
      .orderBy('createdAt', 'desc')
      .get();

    // Parallel processing for speed
    const items = await Promise.all(snapshot.docs.map(async (doc: { data: () => any; id: any; }) => {
      const data = doc.data();
      let finalImageUrl = data.imageUrl;

      // 🔍 SAFETY CHECK: Only sign if it looks like a storage path
      if (data.imageUrl && !data.imageUrl.startsWith('http')) {
        try {
          // Generate a public URL valid for 7 days
          const [signedUrl] = await bucket.file(data.imageUrl).getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, 
          });
          finalImageUrl = signedUrl;
        } catch (err) {
          console.warn(`Server Signing Failed for ${data.imageUrl}:`, err);
          // ⚠️ FALLBACK: Use a generic placeholder if signing fails
          // This prevents the "StorageError: 400" on the client
          finalImageUrl = "https://placehold.co/400x600/e2e8f0/1e293b?text=Image+Unavailable"; 
        }
      }

      return {
        id: doc.id,
        ...data,
        imageUrl: finalImageUrl, // Guaranteed to be a valid HTTP URL
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now(),
      };
    }));

    return items;
  } catch (error) {
    console.error("Admin SDK Error:", error);
    return [];
  }
}
// ✅ NO 'export { getAdmin }' HERE - This fixes the circular dependency
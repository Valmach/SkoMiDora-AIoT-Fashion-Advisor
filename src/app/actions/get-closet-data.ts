'use server';

import { getAdmin } from "@/lib/firebase-admin";

export async function getClosetDataAdmin() {
  const admin = getAdmin();
  const db = admin.firestore();
  
  // 🏆 CRITICAL FIX: Explicitly target your specific bucket
  // This ensures signed URLs are generated for the correct project
  const bucketName = "styleai-footwear.appspot.com";
  const bucket = admin.storage().bucket(bucketName);

  try {
    const snapshot = await db.collection('publicWardrobeItems')
      .orderBy('createdAt', 'desc')
      .get();

    // Parallel processing to sign URLs
    const items = await Promise.all(snapshot.docs.map(async (doc: { data: () => any; id: any; }) => {
      const data = doc.data();
      let finalImageUrl = data.imageUrl;

      // 🔍 SIGNED URL LOGIC
      // Bypasses "Security Rules 400" by generating a secure server token
      if (data.imageUrl && !data.imageUrl.startsWith('http')) {
        try {
          const [signedUrl] = await bucket.file(data.imageUrl).getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // Valid for 7 days
          });
          finalImageUrl = signedUrl;
        } catch (err) {
          console.warn(`Signing failed for ${data.imageUrl}:`, err);
        }
      }

      return {
        id: doc.id,
        ...data,
        imageUrl: finalImageUrl,
        // Safe timestamp conversion
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now(),
      };
    }));

    return items;
  } catch (error) {
    console.error("Admin SDK Error:", error);
    return [];
  }
}

// ✅ FIXED: I removed "export { getAdmin }" from here to stop the crash.
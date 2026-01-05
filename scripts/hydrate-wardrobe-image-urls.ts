/**
 * One-time migration:
 * - Converts imagePath -> imageUrl
 * - Uses Firebase Studio Application Default Credentials (ADC)
 * - SAFE: no service account files
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function hydrateImages() {
  const snap = await db.collection('publicWardrobeItems').get();
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    // Skip if already hydrated or missing path
    if (data.imageUrl || !data.imagePath) continue;

    try {
      const file = bucket.file(data.imagePath);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2035',
      });

      await doc.ref.update({ imageUrl: url });
      updated++;

      console.log(`✅ Updated ${doc.id}`);
    } catch (err) {
      console.error(`❌ Failed for ${doc.id}`, err.message);
    }
  }

  console.log(`\n🎉 Done. Updated ${updated} wardrobe items.`);
}

hydrateImages()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

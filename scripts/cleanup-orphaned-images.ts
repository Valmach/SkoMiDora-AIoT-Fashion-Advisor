import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const bucket = getStorage().bucket('styleai-footwear.firebasestorage.app');

async function cleanupOrphanedImages() {
  console.log('Starting live database purge...');
  
  const snapshot = await db.collection('publicWardrobeItems').get(); 
  let deletedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const imageUrl = data.imageUrl;

    if (imageUrl && imageUrl.includes('public_wardrobe_items')) {
      const urlObj = new URL(imageUrl);
      const filePath = decodeURIComponent(urlObj.pathname.split('/').slice(2).join('/')); 

      const file = bucket.file(filePath);
      const [exists] = await file.exists();

      if (!exists) {
        console.log(`Permanently deleting orphaned document: [${doc.id}]`);
        // This is the active deletion command
        await db.collection('publicWardrobeItems').doc(doc.id).delete();
        deletedCount++;
      }
    }
  }

  console.log(`Purge complete. Successfully deleted ${deletedCount} broken records.`);
}

cleanupOrphanedImages().catch(console.error);
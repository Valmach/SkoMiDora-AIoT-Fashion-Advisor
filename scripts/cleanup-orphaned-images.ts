import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize using the modular approach
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const bucket = getStorage().bucket('styleai-footwear.firebasestorage.app');

async function cleanupOrphanedImages() {
  console.log('Starting orphaned image scan...');
  
  const snapshot = await db.collection('wardrobe').get(); 
  let orphanedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const imageUrl = data.imageUrl;

    if (imageUrl && imageUrl.includes('public_wardrobe_items')) {
      const urlObj = new URL(imageUrl);
      const filePath = decodeURIComponent(urlObj.pathname.split('/').slice(2).join('/')); 

      const file = bucket.file(filePath);
      const [exists] = await file.exists();

      if (!exists) {
        console.log(`Missing file found for document [${doc.id}]: ${filePath}`);
        
        // Uncomment the line below when you are ready to actually delete the records
        // await db.collection('wardrobe').doc(doc.id).delete();
        
        console.log(`Action: Document ${doc.id} flagged for deletion.`);
        orphanedCount++;
      }
    }
  }

  console.log(`Scan complete. Found ${orphanedCount} orphaned records.`);
}

cleanupOrphanedImages().catch(console.error);
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket('styleai-footwear.firebasestorage.app');

async function run() {
  console.log('Starting live database purge...');
  const snapshot = await db.collection('publicWardrobeItems').get(); 
  let count = 0;

  for (const doc of snapshot.docs) {
    const url = doc.data().imageUrl;
    if (url && url.includes('public_wardrobe_items')) {
      const path = decodeURIComponent(new URL(url).pathname.split('/').slice(2).join('/')); 
      const [exists] = await bucket.file(path).exists();
      
      if (exists === false) {
        await doc.ref.delete();
        console.log(`Permanently deleted record: ${doc.id}`);
        count++;
      }
    }
  }
  
  console.log(`Purge complete! Successfully deleted ${count} broken records.`);
}

run().catch(console.error);
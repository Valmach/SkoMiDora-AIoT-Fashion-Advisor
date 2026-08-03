import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function restoreWardrobe() {
  console.log('🔍 Searching for backup collections in Firestore...');
  const collections = await db.listCollections();
  
  // Find a collection that contains your wardrobe backup data
  const backupCollectionRef = collections.find(col => 
    col.id.includes('rollbackSafety_publicWardrobeItems') || 
    col.id.includes('migrationBackups_publicWardrobeItems')
  );

  if (!backupCollectionRef) {
    console.error('❌ No backup collection found. Please check your Firestore console for the exact backup name.');
    return;
  }

  console.log(`📦 Found backup collection: [${backupCollectionRef.id}]`);
  const snapshot = await backupCollectionRef.get();
  console.log(`📥 Found ${snapshot.docs.length} documents in backup. Restoring to 'publicWardrobeItems'...`);

  let restoredCount = 0;
  const batchSize = 400; // Firestore batch limit is 500
  let batch = db.batch();

  for (const doc of snapshot.docs) {
    const targetRef = db.collection('publicWardrobeItems').doc(doc.id);
    batch.set(targetRef, doc.data());
    restoredCount++;

    if (restoredCount % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`🔄 Committed batch... Restored ${restoredCount} items so far.`);
    }
  }

  // Commit any remaining documents
  if (restoredCount % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Restoration complete! Successfully restored ${restoredCount} items to 'publicWardrobeItems'.`);
}

restoreWardrobe().catch(console.error);
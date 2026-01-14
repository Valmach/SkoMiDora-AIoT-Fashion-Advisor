/**
 * CANONICAL WARDROBE IMAGE RE-INGESTION
 *
 * PURPOSE:
 * - Upload missing images into the canonical bucket layout
 *
 * TARGET:
 * gs://styleai-footwear.appspot.com/public/<filename>
 *
 * SAFE:
 * - Uploads only
 * - Does not overwrite existing files
 * - Firestore already prepared
 */

const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------

const LOCAL_IMAGE_DIR = './reingest-images'; // <-- put images here
const TARGET_PREFIX = 'public/';
const BUCKET_NAME = 'styleai-footwear.appspot.com';

// ------------------------------------------------------
// INIT
// ------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'styleai-footwear',
    storageBucket: BUCKET_NAME,
  });
}

const bucket = getStorage().bucket(BUCKET_NAME);

// ------------------------------------------------------
// MAIN
// ------------------------------------------------------

async function reingest() {
  if (!fs.existsSync(LOCAL_IMAGE_DIR)) {
    console.error(`❌ Directory not found: ${LOCAL_IMAGE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(LOCAL_IMAGE_DIR);
  console.log(`📦 Found ${files.length} local images`);

  let uploaded = 0;
  let skipped = 0;

  for (const filename of files) {
    const localPath = path.join(LOCAL_IMAGE_DIR, filename);
    const remotePath = TARGET_PREFIX + filename;

    const remoteFile = bucket.file(remotePath);
    const [exists] = await remoteFile.exists();

    if (exists) {
      skipped++;
      continue;
    }

    await bucket.upload(localPath, {
      destination: remotePath,
      contentType: 'image/png',
      resumable: false,
    });

    uploaded++;
    console.log(`⬆ Uploaded: ${remotePath}`);
  }

  console.log('✅ RE-INGESTION COMPLETE');
  console.log(`⬆ Uploaded: ${uploaded}`);
  console.log(`⚠ Skipped (already exists): ${skipped}`);
}

reingest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Re-ingestion failed', err);
    process.exit(1);
  });

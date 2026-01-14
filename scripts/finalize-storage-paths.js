/**
 * FINAL STORAGE PATH FIX
 *
 * PURPOSE:
 * - Canonicalize Firestore storagePath to match real Storage layout
 *
 * FACT:
 * - Images live in gs://styleai-footwear.appspot.com/public/*
 * - Firestore incorrectly references public_wardrobe_items/*
 *
 * ACTION:
 * - Rewrite storagePath → public/<filename>
 * - Verify existence
 *
 * SAFE:
 * - No uploads
 * - No deletes
 * - Firestore metadata only
 */

const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");

// ------------------------------------------------------
// INIT ADMIN SDK (ADC SAFE)
// ------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "styleai-footwear",
    storageBucket: "styleai-footwear.appspot.com",
  });
}

const db = admin.firestore();
const bucket = getStorage().bucket("styleai-footwear.appspot.com");

// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------

const COLLECTION = "publicWardrobeItems";
const REAL_PREFIX = "public/";

// ------------------------------------------------------
// MAIN
// ------------------------------------------------------

async function finalizeStoragePaths() {
  console.log("🧠 Finalizing storage paths…");

  const snapshot = await db.collection(COLLECTION).get();
  console.log(`📦 Found ${snapshot.size} Firestore items`);

  let fixed = 0;
  let stillMissing = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const oldPath = data.storagePath;

    if (!oldPath || typeof oldPath !== "string") continue;

    const filename = path.basename(oldPath);
    const newPath = REAL_PREFIX + filename;

    const file = bucket.file(newPath);
    const [exists] = await file.exists();

    if (!exists) {
      stillMissing++;
      continue;
    }

    await doc.ref.update({
      storagePath: newPath,
      imageStatus: "ok",
      imageCanonicalizedFrom: oldPath,
      imageError: admin.firestore.FieldValue.delete(),
    });

    fixed++;
  }

  console.log("✅ FINAL FIX COMPLETE");
  console.log(`🔗 Fixed: ${fixed}`);
  console.log(`❌ Still missing: ${stillMissing}`);
}

// ------------------------------------------------------
// RUN
// ------------------------------------------------------

finalizeStoragePaths()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("💥 Final fix failed", err);
    process.exit(1);
  });

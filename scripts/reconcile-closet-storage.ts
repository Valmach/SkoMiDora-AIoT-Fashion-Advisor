/**
 * Firestore → Storage Reconciliation Script
 *
 * SAFE:
 * - Reads Storage
 * - Updates Firestore metadata only
 * - No deletes, no uploads
 */

const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");

// ------------------------------------------------------
// INIT ADMIN SDK — REAL BUCKET
// ------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "styleai-footwear",
    storageBucket: "styleai-footwear.appspot.com", // ✅ CONFIRMED BUCKET
  });
}

const db = admin.firestore();
const bucket = getStorage().bucket("styleai-footwear.appspot.com");

// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------

const COLLECTION = "publicWardrobeItems";

// ------------------------------------------------------
// MAIN
// ------------------------------------------------------

async function reconcileClosetImages() {
  console.log("🔍 Starting Firestore → Storage reconciliation...");
  console.log("🪣 Bucket:", bucket.name);

  const snapshot = await db.collection(COLLECTION).get();
  console.log(`📦 Found ${snapshot.size} closet items`);

  let ok = 0;
  let missing = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const storagePath = data.storagePath;

    if (!storagePath || typeof storagePath !== "string") {
      skipped++;
      await doc.ref.update({
        imageStatus: "missing",
        imageError: "No storagePath field",
      });
      continue;
    }

    try {
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (!exists) {
        missing++;
        console.warn(`❌ Missing: ${storagePath}`);

        await doc.ref.update({
          imageStatus: "missing",
          imageError: "Storage object not found",
        });
      } else {
        ok++;
        await doc.ref.update({
          imageStatus: "ok",
          imageError: admin.firestore.FieldValue.delete(),
        });
      }
    } catch (err) {
      missing++;
      console.error(`🔥 Error checking ${storagePath}`, err.message);

      await doc.ref.update({
        imageStatus: "missing",
        imageError: err.message,
      });
    }
  }

  console.log("✅ Reconciliation complete");
  console.log(`✔ OK: ${ok}`);
  console.log(`❌ Missing: ${missing}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

// ------------------------------------------------------
// RUN
// ------------------------------------------------------

reconcileClosetImages()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("💥 Script failed", err);
    process.exit(1);
  });

/**
 * Firestore → Storage Reconciliation Script
 *
 * PURPOSE:
 * - Detect Firestore closet items pointing to missing Storage files
 * - Prevent UI crashes + XML NoSuchKey errors
 *
 * SAFE:
 * - Reads Storage
 * - Updates Firestore metadata ONLY
 * - Does NOT delete or upload files
 *
 * AUTH:
 * - Uses Application Default Credentials (ADC)
 * - No service account JSON required
 */

const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");

// ------------------------------------------------------
// INIT ADMIN SDK — ADC SAFE (NO CREDENTIAL FILE)
// ------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "styleai-footwear",
    storageBucket: "styleai-footwear.firebasestorage.app",
    // Uses Application Default Credentials automatically
  });
}

// Firestore (Admin SDK)
const db = admin.firestore();

// Storage bucket (explicit binding, defensive)
const bucket = getStorage().bucket("styleai-footwear.firebasestorage.app");

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

    // --------------------------------------------------
    // Validate storagePath
    // --------------------------------------------------
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

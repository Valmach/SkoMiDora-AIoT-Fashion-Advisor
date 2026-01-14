/**
 * Firestore Image Path Hydration Script
 *
 * PURPOSE:
 * - Derive storagePath from existing image URLs
 * - Prepare Firestore for reconciliation + validation
 *
 * SAFE:
 * - READS Firestore
 * - UPDATES Firestore metadata ONLY
 * - DOES NOT touch Storage binaries
 */

const admin = require("firebase-admin");

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

// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------

const COLLECTION = "publicWardrobeItems";
const STORAGE_PREFIX = "public_wardrobe_items/";

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

function extractStoragePath(url) {
  if (!url || typeof url !== "string") return null;

  // Handle Firebase download URLs
  // Example:
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/public_wardrobe_items%2Ffile.png?alt=media
  try {
    const decoded = decodeURIComponent(url);

    const match = decoded.match(/\/o\/(.+?)\?/);
    if (match && match[1].startsWith(STORAGE_PREFIX)) {
      return match[1];
    }

    // Fallback: filename only
    const filename = decoded.split("/").pop()?.split("?")[0];
    if (filename) {
      return STORAGE_PREFIX + filename;
    }
  } catch {
    return null;
  }

  return null;
}

// ------------------------------------------------------
// MAIN
// ------------------------------------------------------

async function hydrateStoragePaths() {
  console.log("💧 Hydrating Firestore storagePath fields…");

  const snapshot = await db.collection(COLLECTION).get();
  console.log(`📦 Found ${snapshot.size} closet items`);

  let hydrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already hydrated
    if (typeof data.storagePath === "string") {
      skipped++;
      continue;
    }

    const sourceUrl =
      data.imageUrl ||
      data.image ||
      data.url ||
      data.downloadUrl ||
      null;

    const storagePath = extractStoragePath(sourceUrl);

    if (!storagePath) {
      skipped++;
      await doc.ref.update({
        imageStatus: "unresolved",
        imageError: "Could not derive storagePath",
      });
      continue;
    }

    await doc.ref.update({
      storagePath,
      imageStatus: "hydrated",
      imageError: admin.firestore.FieldValue.delete(),
    });

    hydrated++;
  }

  console.log("✅ Hydration complete");
  console.log(`💧 Hydrated: ${hydrated}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

// ------------------------------------------------------
// RUN
// ------------------------------------------------------

hydrateStoragePaths()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("💥 Hydration failed", err);
    process.exit(1);
  });

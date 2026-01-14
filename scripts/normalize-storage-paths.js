/**
 * STORAGE PATH NORMALIZATION SCRIPT
 *
 * PURPOSE:
 * - Recover missing Firestore image references
 * - Match against real Storage objects
 *
 * SAFE:
 * - Reads Storage
 * - Updates Firestore metadata ONLY
 * - Does NOT upload, delete, or overwrite files
 *
 * STRATEGY:
 * - Filename normalization
 * - Exact + fuzzy matching
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

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[–—]/g, "-")          // normalize unicode dashes
    .replace(/[^a-z0-9.\-_]/g, "")  // remove symbols/spaces
    .trim();
}

// ------------------------------------------------------
// MAIN
// ------------------------------------------------------

async function normalizeStoragePaths() {
  console.log("🔍 Scanning storage bucket…");

  const [files] = await bucket.getFiles();
  console.log(`🗂️ Found ${files.length} objects in storage`);

  // Build filename → path index
  const fileIndex = new Map();

  for (const file of files) {
    const filename = normalizeName(path.basename(file.name));
    fileIndex.set(filename, file.name);
  }

  console.log("🧠 Built filename index");

  const snapshot = await db.collection(COLLECTION).get();
  console.log(`📦 Found ${snapshot.size} Firestore items`);

  let fixed = 0;
  let unresolved = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.imageStatus !== "missing") continue;

    const originalPath = data.storagePath;
    const filename = normalizeName(path.basename(originalPath || ""));

    if (!filename) {
      unresolved++;
      continue;
    }

    const match = fileIndex.get(filename);

    if (!match) {
      unresolved++;
      continue;
    }

    await doc.ref.update({
      storagePath: match,
      imageStatus: "normalized",
      imageFixedFrom: originalPath,
      imageError: admin.firestore.FieldValue.delete(),
    });

    fixed++;
    console.log(`🔗 Fixed: ${filename} → ${match}`);
  }

  console.log("✅ NORMALIZATION COMPLETE");
  console.log(`🔗 Fixed: ${fixed}`);
  console.log(`❌ Unresolved: ${unresolved}`);
}

// ------------------------------------------------------
// RUN
// ------------------------------------------------------

normalizeStoragePaths()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("💥 Normalization failed", err);
    process.exit(1);
  });

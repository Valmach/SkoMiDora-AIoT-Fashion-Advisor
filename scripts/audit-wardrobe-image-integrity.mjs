#!/usr/bin/env node
/**
 * audit-wardrobe-image-integrity.mjs
 *
 * READ-ONLY. This script never writes to Firestore or Storage, under any
 * flag or condition. It only reads, compares, and reports. There is no
 * --apply mode. Fixing anything it finds is a deliberate, separate,
 * human decision - not something this script does automatically.
 *
 * What it does:
 *   1. Lists every object actually present in Storage under
 *      public_wardrobe_items/ (one bucket listing, not per-item checks).
 *   2. Reads every document in the publicWardrobeItems Firestore
 *      collection.
 *   3. For each document, computes the "expected" Storage path using the
 *      *exact* same normalizeImagePath() logic as the live app
 *      (src/app/closet/page.tsx), so this checks against precisely what
 *      the real page actually tries to load - not a reimplementation
 *      that could drift from what's really running.
 *   4. Classifies each item as:
 *        OK               - expected path exists in Storage, verbatim
 *        LIKELY_MISMATCH   - doesn't exist verbatim, but a
 *                            character-normalized version of the
 *                            filename matches something that does exist
 *                            (e.g. a dash-encoding difference)
 *        LIKELY_MISSING    - doesn't exist verbatim, and nothing similar
 *                            was found either - most likely genuinely
 *                            deleted from Storage
 *        NO_IMAGE_PATH     - the Firestore doc has no imagePath and no
 *                            usable imageUrl at all (a different,
 *                            already-handled case in the live app - not
 *                            counted as a Storage integrity problem)
 *
 * Usage:
 *   node scripts/audit-wardrobe-image-integrity.mjs
 *
 * Requires Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS
 * pointing at a service account with Firestore read + Storage read access.
 * This cannot run in a sandbox with no live credentials - it's meant to be
 * run from an environment that actually has them (e.g. Firebase Studio,
 * Cloud Shell, or locally with `gcloud auth application-default login`).
 *
 * Output:
 *   - A summary printed to the console.
 *   - A full JSON report written to
 *     wardrobe-image-integrity-report.json in the current directory.
 */

import admin from "firebase-admin";
import { writeFileSync } from "node:fs";

const PROJECT_ID = "styleai-footwear";
const BUCKET_NAME = "styleai-footwear.firebasestorage.app";
const STORAGE_PREFIX = "public_wardrobe_items/";
const REPORT_PATH = "wardrobe-image-integrity-report.json";

// --- Exact copy of src/app/closet/page.tsx's normalizeImagePath(). ---
// Kept byte-for-byte identical on purpose - if that function changes in
// the app, this script's results will silently stop matching reality
// unless this copy is updated too. Do not "improve" this independently.
function normalizeImagePath(path) {
  let p = path;
  if (!p.includes("/") && !p.startsWith("http")) p = `public_wardrobe_items/${p}`;
  if (p.startsWith("public/")) p = p.replace(/^public\//, "public_wardrobe_items/");
  return p.replace(/â€“/g, "–");
}

// Loose normalization used ONLY for fuzzy-matching candidates, never for
// deciding the "real" expected path. Strips anything that commonly
// differs between encoding variants of the same intended filename.
function looseNormalize(path) {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function initFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
      storageBucket: BUCKET_NAME,
    });
  }
  return {
    db: admin.firestore(),
    bucket: admin.storage().bucket(BUCKET_NAME),
  };
}

async function listAllStorageFiles(bucket) {
  console.log(`Listing all objects under ${STORAGE_PREFIX} ...`);
  const [files] = await bucket.getFiles({ prefix: STORAGE_PREFIX });
  const realPaths = new Set(files.map((f) => f.name));
  console.log(`Found ${realPaths.size} real objects in Storage.\n`);
  return realPaths;
}

function findLooseMatch(expectedPath, realPaths, looseIndex) {
  const target = looseNormalize(expectedPath);
  const match = looseIndex.get(target);
  return match || null;
}

async function run() {
  const { db, bucket } = initFirebase();

  const realPaths = await listAllStorageFiles(bucket);

  // Build a loose-match index once, up front - O(n), not per-item.
  const looseIndex = new Map();
  for (const realPath of realPaths) {
    looseIndex.set(looseNormalize(realPath), realPath);
  }

  console.log("Reading publicWardrobeItems collection ...");
  const snap = await db.collection("publicWardrobeItems").get();
  console.log(`Found ${snap.size} documents.\n`);

  const results = {
    ok: [],
    likelyMismatch: [],
    likelyMissing: [],
    noImagePath: [],
  };

  for (const doc of snap.docs) {
    const data = doc.data();
    const itemName = data.itemName || "(no name)";
    const imagePath = data.imagePath;
    const imageUrl = data.imageUrl;

    // Mirrors the live app: an external http(s) imageUrl bypasses Storage
    // entirely and isn't something this script can verify (it's not our
    // bucket). Not counted as a Storage integrity issue either way.
    if (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http") && !imagePath) {
      results.noImagePath.push({
        id: doc.id,
        itemName,
        reason: "external imageUrl, no imagePath - not a Storage-bucket item",
        imageUrl,
      });
      continue;
    }

    if (!imagePath || typeof imagePath !== "string") {
      results.noImagePath.push({
        id: doc.id,
        itemName,
        reason: "no imagePath field at all",
      });
      continue;
    }

    const expectedPath = normalizeImagePath(imagePath);

    if (realPaths.has(expectedPath)) {
      results.ok.push({ id: doc.id, itemName, expectedPath });
      continue;
    }

    const closeMatch = findLooseMatch(expectedPath, realPaths, looseIndex);
    if (closeMatch) {
      results.likelyMismatch.push({
        id: doc.id,
        itemName,
        storedImagePath: imagePath,
        expectedPath,
        closeMatchFoundInStorage: closeMatch,
      });
    } else {
      results.likelyMissing.push({
        id: doc.id,
        itemName,
        storedImagePath: imagePath,
        expectedPath,
      });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalDocumentsScanned: snap.size,
    totalStorageObjectsFound: realPaths.size,
    counts: {
      ok: results.ok.length,
      likelyMismatch: results.likelyMismatch.length,
      likelyMissing: results.likelyMissing.length,
      noImagePath: results.noImagePath.length,
    },
  };

  console.log("=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");

  if (results.likelyMismatch.length > 0) {
    console.log(`--- ${results.likelyMismatch.length} LIKELY_MISMATCH items (path encoding differs from a real file) ---`);
    for (const item of results.likelyMismatch) {
      console.log(`  [${item.id}] "${item.itemName}"`);
      console.log(`      stored:   ${item.storedImagePath}`);
      console.log(`      expected: ${item.expectedPath}`);
      console.log(`      close match in Storage: ${item.closeMatchFoundInStorage}`);
    }
    console.log("");
  }

  if (results.likelyMissing.length > 0) {
    console.log(`--- ${results.likelyMissing.length} LIKELY_MISSING items (no similar file found in Storage at all) ---`);
    for (const item of results.likelyMissing) {
      console.log(`  [${item.id}] "${item.itemName}"`);
      console.log(`      expected: ${item.expectedPath}`);
    }
    console.log("");
  }

  writeFileSync(
    REPORT_PATH,
    JSON.stringify({ summary, results }, null, 2),
  );
  console.log(`Full report written to ${REPORT_PATH}`);
  console.log("\nThis script made zero writes to Firestore or Storage. Nothing was changed.");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});

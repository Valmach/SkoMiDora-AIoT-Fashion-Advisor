import * as admin from "firebase-admin";

/*
 One-time Firestore cleanup for wardrobe image paths
 Fixes:
 - public/... -> public_wardrobe_items/...
 - corrupted unicode dash sequences
*/

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "styleai-footwear",
  });
}

const db = admin.firestore();

function normalizeImagePath(path: unknown): string | null {
  if (typeof path !== "string") return null;

  let p = path.trim();

  // FIX: Use forward slash correctly in regex without unnecessary escaping
  if (p.startsWith("public/")) {
    p = p.replace(/^public\//, "public_wardrobe_items/");
  }

  // Fix corrupted UTF-8 dash sequences
  p = p.replace(/â€“/g, "-");
  p = p.replace(/â/g, "-");

  return p;
}

async function run() {
  console.log("Starting Firestore imagePath cleanup");

  const snap = await db.collection("publicWardrobeItems").get();

  let scanned = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    scanned++;
    // Use 'as any' or define an interface to access 'imagePath' safely
    const data = doc.data() as { imagePath?: unknown };

    if (!data.imagePath) continue;

    const fixed = normalizeImagePath(data.imagePath);
    
    // Ensure we only update if it actually changed
    if (fixed && fixed !== data.imagePath) {
      await doc.ref.update({ imagePath: fixed });
      updated++;
      console.log(`Updated ${doc.id} -> ${fixed}`);
    }
  }

  console.log("DONE");
  console.log(`scanned: ${scanned}`);
  console.log(`updated: ${updated}`);
}

run().catch((err) => {
  console.error("FAILED", err);
  process.exit(1);
});
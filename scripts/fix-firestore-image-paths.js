const admin = require("firebase-admin");

/*
 One-time Firestore cleanup for wardrobe image paths and URLs
 Fixes:
 - public/... -> public_wardrobe_items/...
 - corrupted unicode dash sequences
 - resets imageUrl to standard Google Storage format
*/

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "styleai-footwear",
  });
}

const db = admin.firestore();

function normalizeImagePath(path) {
  if (typeof path !== "string") return null;

  let p = path.trim();

  if (p.startsWith("public/")) {
    p = p.replace(/^public\//, "public_wardrobe_items/");
  }

  // Fix corrupted UTF-8 dash sequences
  p = p.replace(/â€“/g, "-");
  p = p.replace(/â/g, "-");

  return p;
}

function publicStorageUrl(path) {
  const bucket = "styleai-footwear.firebasestorage.app";
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${bucket}/${encodedPath}`;
}

async function run() {
  console.log("Starting Firestore imagePath and imageUrl rollback to standard storage format");

  const snap = await db.collection("publicWardrobeItems").get();

  let scanned = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    scanned++;
    const data = doc.data();
    const currentPath = data.imagePath || "";
    const currentUrl = data.imageUrl || "";

    const fixedPath = normalizeImagePath(currentPath) || currentPath;
    const newUrl = fixedPath ? publicStorageUrl(fixedPath) : "";
    
    if (fixedPath !== currentPath || newUrl !== currentUrl) {
      await doc.ref.update({ 
        imagePath: fixedPath,
        imageUrl: newUrl
      });
      updated++;
      console.log(`Updated ${doc.id}: Path(${fixedPath}), URL(${newUrl})`);
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
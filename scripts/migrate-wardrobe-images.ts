import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp({
  storageBucket: "styleai-footwear.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

function extractImagePathFromUrl(url: string): string | null {
  const match = url.match(/\/o\/(.+?)\?/);
  if (!match || !match[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

async function migrate(): Promise<void> {
  const snapshot = await db
    .collection("public_wardrobe_items")
    .get();

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.imagePath && !data.imageUrl) {
      skipped++;
      continue;
    }

    if (!data.imageUrl || typeof data.imageUrl !== "string") {
      skipped++;
      continue;
    }

    const imagePath = extractImagePathFromUrl(data.imageUrl);
    if (!imagePath) {
      skipped++;
      continue;
    }

    const exists = await bucket.file(imagePath).exists();
    if (!exists[0]) {
      skipped++;
      continue;
    }

    await doc.ref.update({
      imagePath,
      imageUrl: FieldValue.delete(),
      migratedAt: FieldValue.serverTimestamp(),
    });

    updated++;
  }

  console.log("Migration complete");
  console.log("Updated:", updated);
  console.log("Skipped:", skipped);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

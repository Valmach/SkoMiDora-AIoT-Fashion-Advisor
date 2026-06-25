const admin = require("firebase-admin");
admin.initializeApp({
  storageBucket: "styleai-footwear.firebasestorage.app"
});

async function run() {
  const db = admin.firestore();
  const col = db.collection("publicWardrobeItems");
  const snap = await col.get();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.imagePath) continue;
    const correctUrl = `https://storage.googleapis.com/styleai-footwear.firebasestorage.app/${data.imagePath}`;

    if (data.imageUrl !== correctUrl) {
      console.log("Fixing:", doc.id);
      await doc.ref.update({ imageUrl: correctUrl });
    }
  }

  console.log("DONE 👍");
}
run();

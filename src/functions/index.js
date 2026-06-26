import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const syncWardrobeImageToFirestore = onObjectFinalized(async (event) => {
  const fileData = event.data;
  if (!fileData) {
    console.error("No file data present in the event.");
    return;
  }

  const filePath = fileData.name;
  const contentType = fileData.contentType;

  if (!contentType || !contentType.startsWith("image/")) {
    console.log("File is not an image. Skipping sync.");
    return;
  }

  try {
    const pathSegments = filePath.split("/");
    if (pathSegments[0] !== "users" || !pathSegments[1]) {
      console.log("File path does not match expected structure. Skipping.");
      return;
    }

    const userId = pathSegments[1];
    const bucketName = fileData.bucket;
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    const downloadUrl = `https://storage.googleapis.com/${bucketName}/${encodedPath}`;

    const itemPayload = {
      storagePath: filePath,
      imageUrl: downloadUrl,
      contentType: contentType,
      sizeBytes: fileData.size || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      aiAnalyzed: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("wardrobeItems")
      .add(itemPayload);

    console.log(`Synced asset successfully. Doc ID: ${docRef.id}`);
  } catch (error) {
    console.error("Error executing Firestore sync workflow:", error);
  }
});
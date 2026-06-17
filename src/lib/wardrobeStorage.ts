import { getStorage, ref, uploadBytes } from "firebase/storage";

interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Handles uploading a raw image file from the browser client to Firebase Storage.
 * The corresponding Firestore entry is created autonomously via backend Cloud Functions.
 * * @param file - The raw File object obtained from an HTML input element or drag-and-drop zone.
 * @param userId - The active user's unique identification string (UID) string from Firebase Auth.
 * @returns Promise<string> - Resolves with the storage path if successful.
 */
export async function uploadWardrobeImage(file: File, userId: string): Promise<string> {
  // Validate that a file and userId exist before initiating network requests
  if (!file) {
    throw new Error("No file object provided to uploadWardrobeImage.");
  }
  if (!userId) {
    throw new Error("User must be authenticated to upload wardrobe items.");
  }

  const storage = getStorage();
  
  // Establish a clean, deterministic file path layout matching the Cloud Function structure
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `users/${userId}/wardrobe/${Date.now()}_${sanitizedName}`;
  
  const storageRef = ref(storage, storagePath);

  try {
    console.log(`Initiating file transfer to storage path: ${storagePath}`);
    
    // Perform standard binary upload block
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedVia: "SkoMiDoraNextJSClient"
      }
    });

    console.log("File transfer complete. Firestore sync will execute asynchronously.");
    return storagePath;
  } catch (error) {
    console.error("Critical failure during client-side asset upload:", error);
    throw error;
  }
}
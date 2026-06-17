import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadToCloset(file: File, userId: string) {
  // Use a unique name to prevent collisions and ensure path compatibility
  const storagePath = `users/${userId}/wardrobe/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload progress: ${progress}%`);
      },
      (error) => {
        console.error("SDK Upload Error (Check Storage Rules):", error);
        reject(error);
      },
      async () => {
        // Once complete, the Gen 2 function will trigger automatically
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        console.log("Upload complete. Triggering Cloud Function...");
        resolve(downloadURL);
      }
    );
  });
}
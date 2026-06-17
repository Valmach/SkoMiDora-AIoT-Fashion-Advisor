import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase"; // Your initialized Firebase app

async function uploadToCloset(file: File, userId: string) {
  // 1. Define the correct, protected path
  const storageRef = ref(storage, `users/${userId}/wardrobe/${file.name}`);

  // 2. Use the SDK - it handles the Auth tokens and metadata automatically
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed', 
    (snapshot) => { /* Handle progress */ },
    (error) => { console.error("Upload failed:", error); },
    () => { console.log("Upload complete - trigger will fire automatically!"); }
  );
}
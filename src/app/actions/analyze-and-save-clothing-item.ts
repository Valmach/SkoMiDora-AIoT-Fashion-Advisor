'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '@/lib/firebase';

/**
 * Analyzes an image, handles physical Storage upload, and saves clean metadata to Firestore.
 */
export async function analyzeAndSaveClothingItem(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file uploaded");

    // 1. Sanitize the filename to prevent URL/Storage breaking
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
    const uniqueFileName = `${Date.now()}-${cleanFileName}`;
    const imagePath = `public_wardrobe_items/${uniqueFileName}`;

    // 2. Convert File to a Uint8Array buffer so the Next.js server can upload it
    const buffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(buffer);

    // 3. STRICT UPLOAD: Send the physical file to Google Cloud Storage
    const storageRef = ref(storage, imagePath);
    await uploadBytes(storageRef, fileBytes, {
      contentType: file.type,
    });

    // 4. Verify Upload & Get URL: We must have this before touching the database
    const imageUrl = await getDownloadURL(storageRef);

    // 5. Clean the Item Name for the AI: 
    // We strip out extensions and dashes so Gemini sees "Blue Denim Jacket", not "Blue-Denim-Jacket.png"
    const aiFriendlyName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');

    // 6. THE DATABASE WRITE: Only executes because steps 1-5 succeeded
    const newItem = {
      itemName: aiFriendlyName, 
      itemType: "Uncategorized", 
      imagePath: imagePath,
      imageUrl: imageUrl, // Explicitly saving the real URL prevents broken images on the frontend
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, 'publicWardrobeItems'), newItem);

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Upload Action Error:", error);
    throw new Error(error.message || "Failed to upload and analyze item");
  }
}
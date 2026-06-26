import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log("Removing GOOGLE_APPLICATION_CREDENTIALS to use Firebase Studio managed credentials.");
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "styleai-footwear",
      storageBucket:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        "styleai-footwear.firebasestorage.app",
    });

const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);

export { adminApp, adminDb, adminStorage };

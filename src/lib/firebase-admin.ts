import { initializeApp, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app;

// Safely initialize the Firebase Admin app exactly once
if (getApps().length === 0) {
  console.log("[Firebase Admin] Bootstrapping new instance...");
  app = initializeApp({
    credential: applicationDefault(),
    projectId: 'styleai-footwear', // Explicitly bound to your GCP environment
  });
} else {
  console.log("[Firebase Admin] Utilizing existing instance...");
  app = getApp();
}

// Export pre-bound, safe instances of your required services
export const db = getFirestore(app);
export const auth = getAuth(app);
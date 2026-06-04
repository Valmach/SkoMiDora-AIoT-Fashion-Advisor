import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: App;

// Safely initialize the Firebase Admin app exactly once
if (getApps().length === 0) {
  // Automatically uses Google Cloud Application Default Credentials in production
  app = initializeApp(); 
} else {
  app = getApp();
}

// Export pre-bound, safe instances of your required services
export const db = getFirestore(app);
export const auth = getAuth(app);
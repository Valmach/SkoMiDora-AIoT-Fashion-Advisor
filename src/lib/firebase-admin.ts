import { initializeApp, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    console.log("[Firebase Admin] Bootstrapping new instance...");
    const app = initializeApp({
      credential: applicationDefault(),
      projectId: 'styleai-footwear', 
    });
    return {
      db: getFirestore(app),
      auth: getAuth(app)
    };
  } else {
    console.log("[Firebase Admin] Utilizing existing instance...");
    const app = getApp();
    return {
      db: getFirestore(app),
      auth: getAuth(app)
    };
  }
}
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

let app: FirebaseApp | undefined;

export function initFirebaseClient() {
  if (!getApps().length) {
    app = initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    });

    initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }

  return {
    app: app!,
    auth: getAuth(app!),
    firestore: getFirestore(app!),
    storage: getStorage(app!),
  };
}

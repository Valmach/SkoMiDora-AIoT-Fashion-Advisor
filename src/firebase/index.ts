// src/firebase/index.ts

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export function initializeFirebase() {
  const app: FirebaseApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId:
            process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });

  // 🔥 Critical fix for App Hosting / Listen 404 errors
  const firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),

    // Must use ONLY ONE:
    experimentalForceLongPolling: true,  // ✅ THE FIX
  });

  const auth = getAuth(app);
  const storage = getStorage(app);

  return { app, auth, firestore, storage };
}

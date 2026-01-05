'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/* ============================================================
   FIREBASE CONFIG
============================================================ */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: 'styleai-footwear.firebaseapp.com',
  projectId: 'styleai-footwear',
  storageBucket: 'styleai-footwear.firebasestorage.app',
};

/* ============================================================
   APP (SINGLETON)
============================================================ */

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

/* ============================================================
   SERVICES
============================================================ */

// Auth (required for onAuthStateChanged)
export const auth = getAuth(app);

// Firestore (Firebase Studio–safe)
export const firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Storage
export const storage = getStorage(app);
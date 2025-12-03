"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function initializeFirebase(): FirebaseServices | null {
  if (cachedApp && cachedAuth && cachedFirestore && cachedStorage) {
    return {
      app: cachedApp,
      auth: cachedAuth,
      firestore: cachedFirestore,
      storage: cachedStorage,
    };
  }

  if (typeof window === "undefined") {
    console.error("initializeFirebase() must be called in a browser environment.");
    return null;
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      "Missing NEXT_PUBLIC_FIREBASE_* env vars. Check your .env.local configuration."
    );
    return null;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  const firestore = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);

  cachedApp = app;
  cachedAuth = auth;
  cachedFirestore = firestore;
  cachedStorage = storage;

  return { app, auth, firestore, storage };
}

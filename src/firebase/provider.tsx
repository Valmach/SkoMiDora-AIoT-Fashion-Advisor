"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const FirebaseContext = createContext<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
} | null>(null);

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (ctx === null) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return ctx;
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<any>(null);

  useEffect(() => {
    const app = initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    });

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);

    setServices({ app, auth, firestore, storage });

    onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
    });
  }, []);

  if (!services) return <div>Connecting to Firebase…</div>;

  return (
    <FirebaseContext.Provider value={services}>
      {children}
    </FirebaseContext.Provider>
  );
}

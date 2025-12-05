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
      authDomain: "styleai-footwear.firebaseapp.com",
      projectId: "styleai-footwear",
      storageBucket: "styleai-footwear.appspot.com",
      messagingSenderId: "855662411333",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!, // only this stays dynamic
    });
  
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
  
    setServices({ app, auth, firestore, storage });
  
    onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth).catch((err) =>
          console.error("Anonymous Login Error:", err)
        );
      }
    });
  }, []);
  

  if (!services) return <div>Connecting to Firebase…</div>;

  return (
    <FirebaseContext.Provider value={services}>
      {children}
    </FirebaseContext.Provider>
  );
}

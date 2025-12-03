"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { FirebaseApp } from "firebase/app";
import type { Auth, User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

import { initializeFirebase, type FirebaseServices } from "./client";

interface FirebaseContextValue extends FirebaseServices {}

export const FirebaseContext = createContext<FirebaseContextValue | null>(null);

/**
 * Hook to access Firebase services (app, auth, firestore, storage).
 * Must be used inside <FirebaseProvider>.
 */
export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (ctx === null) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return ctx;
}

/**
 * Hook to access the current Firebase User.
 * Returns:
 *   - undefined while auth state is loading
 *   - null if no user or auth is unavailable
 *   - User object when signed in
 */
export function useUser(): User | null | undefined {
  const firebase = useFirebase();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!firebase?.auth) {
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebase.auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        // auto anonymous sign-in
        signInAnonymously(firebase.auth).catch((err) => {
          console.error("Anonymous sign-in failed:", err);
          setUser(null);
        });
      }
    });

    return () => unsubscribe();
  }, [firebase]);

  return user;
}

/**
 * FirebaseProvider:
 * - Initializes Firebase services on the client
 * - Shows a friendly error screen if config is missing
 * - Shows a small "Connecting..." screen while initializing
 */
export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseContextValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const result = initializeFirebase();
    if (!result) {
      setError(
        "Firebase configuration is missing or invalid. Check NEXT_PUBLIC_FIREBASE_* env vars."
      );
      return;
    }
    setServices(result);
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          textAlign: "center",
          backgroundColor: "#1a0000",
          color: "#ffcccc",
          fontFamily: "monospace",
          padding: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Connection Error
          </h1>
          <p>{error}</p>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "#ff8080",
            }}
          >
            This app requires a connection to Firebase to function.
          </p>
        </div>
      </div>
    );
  }

  if (!services) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#111",
          color: "#888",
        }}
      >
        Connecting to services...
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={services}>{children}</FirebaseContext.Provider>
  );
}

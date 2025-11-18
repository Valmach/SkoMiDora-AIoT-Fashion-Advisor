"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { FirebaseApp } from "firebase/app";
import { Auth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";

import { initializeFirebase } from ".";

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

/**
 * The context for the Firebase app.
 *
 * This is used to provide the Firebase app, Auth, and Firestore services to
 * the rest of the application.
 */
export const FirebaseContext = createContext<FirebaseContextValue | null>(null);

/**
 * A hook to get the Firebase context.
 *
 * @returns The Firebase context, or null if Firebase is not initialized.
 * @throws An error if the hook is not used within a `FirebaseProvider` component.
 */
export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}

/**
 * A hook to get the currently authenticated user.
 *
 * This hook can only be used in components that are children of
 * `FirebaseProvider`.
 *
 * @returns The currently authenticated user, or `null` if there is no user, or `undefined` if auth state is loading.
 */
export function useUser() {
  const firebase = useFirebase();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!firebase?.auth) {
      setUser(null); // Firebase not available, so no user
      return;
    }

    const unsubscribe = onAuthStateChanged(firebase.auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        // If no user, sign in anonymously
        signInAnonymously(firebase.auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setUser(null); // Set to null on failure
        });
      }
    });

    return () => unsubscribe();
  }, [firebase]);

  return user;
}


export function FirebaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseContextValue | null>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    const services = initializeFirebase();
    if (services) {
      setFirebaseServices(services);
    } else {
      setError("Firebase configuration is missing or invalid. Please check your NEXT_PUBLIC_FIREBASE_* environment variables.");
    }
  }, []);

  if (error) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center',
            backgroundColor: '#1a0000',
            color: '#ffcccc',
            fontFamily: 'monospace',
            padding: '2rem'
        }}>
            <div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Connection Error</h1>
                <p>{error}</p>
                 <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#ff8080' }}>
                    This app requires a connection to Firebase to function.
                 </p>
            </div>
        </div>
    );
  }

  if (!firebaseServices) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#111',
            color: '#888'
        }}>
            Connecting to services...
        </div>
    );
  }
  
  return (
    <FirebaseContext.Provider value={firebaseServices}>
      {children}
    </FirebaseContext.Provider>
  );
}

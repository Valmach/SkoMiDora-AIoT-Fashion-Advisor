'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import { auth, firestore, storage } from '@/lib/firebase';

type FirebaseContextValue = {
  user: User | null;
  loading: boolean;
  auth: typeof auth;
  firestore: typeof firestore;
  storage: typeof storage;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined,
);

export function FirebaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <FirebaseContext.Provider
      value={{ user, loading, auth, firestore, storage }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used within FirebaseProvider');
  }
  return ctx;
}

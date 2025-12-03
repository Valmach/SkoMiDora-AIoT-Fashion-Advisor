"use client";

import { useState, useEffect } from "react";
import { FirebaseProvider } from "@/firebase/provider";

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  // Prevent Firebase from initializing on the server
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null; // avoid SSR mismatch

  return <FirebaseProvider>{children}</FirebaseProvider>;
}

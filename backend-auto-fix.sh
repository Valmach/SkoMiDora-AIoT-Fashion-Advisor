#!/usr/bin/env bash
set -euo pipefail

echo "====================================================="
echo "🛠  SkoMiDora – Backend Auto-Fix Suite"
echo "====================================================="
ROOT_DIR="$(pwd)"
echo "📂 Project root: $ROOT_DIR"
echo ""

mkdir -p src/firebase src/ai/flows

# -------------------------------------------------------
# 1) Firebase CLIENT initializer (src/firebase/client.ts)
# -------------------------------------------------------
echo "📄 Writing src/firebase/client.ts ..."
cat << 'TS' > src/firebase/client.ts
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
TS

# -------------------------------------------------------
# 2) Firebase Provider (src/firebase/provider.tsx)
#    - React context
#    - useFirebase / useUser hooks
#    - no more bad 'initializeFirebase from "."'
# -------------------------------------------------------
echo "📄 Writing src/firebase/provider.tsx ..."
cat << 'TSX' > src/firebase/provider.tsx
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
TSX

# -------------------------------------------------------
# 3) Upcoming Events Page – fix outfitRecommendation + eventCountry
#    File: src/app/upcoming-events/page.tsx
# -------------------------------------------------------
if [ -f "src/app/upcoming-events/page.tsx" ]; then
  echo "📄 Patching src/app/upcoming-events/page.tsx ..."
  cat << 'TSX' > src/app/upcoming-events/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import CalendarConnectButton from "@/components/ui/CalendarConnectButton";
import UpcomingEventAdviceCard from "@/components/UpcomingEventAdviceCard";
import { useFirebase } from "@/firebase/provider";
import { collection, query, onSnapshot } from "firebase/firestore";
import type { UpcomingEventStyleAdvice } from "@/types";

const DUMMY_EVENTS_DATA: UpcomingEventStyleAdvice[] = [
  {
    id: "dummy-1",
    eventName: "Paris Fashion Week - Chanel Show",
    eventStartDateTime: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    eventEndDateTime: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
    ).toISOString(),
    eventType: "Fashion Show",
    eventLocation: "Grand Palais, Paris, France",
    temperature: 18,
    weatherCondition: "Cloudy with a chance of rain",
    advice:
      "For Paris Fashion Week, channel timeless elegance. A classic tweed jacket paired with tailored trousers or a silk midi skirt is effortlessly chic. Complement with slingbacks and a quilted leather bag.",
    eventCountry: "France",
    outfitRecommendation: null,
  },
  {
    id: "dummy-2",
    eventName: "The Met Gala",
    eventStartDateTime: new Date(
      Date.now() + 12 * 24 * 60 * 60 * 1000
    ).toISOString(),
    eventEndDateTime: new Date(
      Date.now() + 12 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000
    ).toISOString(),
    eventType: "Gala",
    eventLocation: "The Metropolitan Museum of Art, New York, USA",
    temperature: 22,
    weatherCondition: "Clear",
    advice:
      "The Met Gala demands avant-garde glamour. Embrace the theme with a sculptural gown or dramatic, custom piece. Statement jewellery and artistic make-up are essential.",
    eventCountry: "USA",
    outfitRecommendation: null,
  },
  {
    id: "dummy-3",
    eventName: "Milan Fashion Week - Fendi Show",
    eventStartDateTime: new Date(
      Date.now() + 20 * 24 * 60 * 60 * 1000
    ).toISOString(),
    eventEndDateTime: new Date(
      Date.now() + 20 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
    ).toISOString(),
    eventType: "Fashion Show",
    eventLocation: "Fendi HQ, Milan, Italy",
    temperature: 25,
    weatherCondition: "Sunny",
    advice:
      "Embody Italian luxury in Milan. A structured leather dress or sharply tailored suit showcases craftsmanship. Pair with sculptural heels and a hint of silk for a powerful statement.",
    eventCountry: "Italy",
    outfitRecommendation: null,
  },
];

export default function UpcomingEventsPage() {
  const firebase = useFirebase();
  const [events, setEvents] =
    useState<UpcomingEventStyleAdvice[]>(DUMMY_EVENTS_DATA);

  useEffect(() => {
    if (!firebase) {
      setEvents(DUMMY_EVENTS_DATA);
      return;
    }

    const eventsCollectionRef = collection(firebase.firestore, "upcomingEvents");
    const q = query(eventsCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsData: UpcomingEventStyleAdvice[] = snapshot.docs.map(
          (doc) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              eventName: data.eventName ?? "",
              eventStartDateTime: data.eventStartDateTime ?? "",
              eventEndDateTime: data.eventEndDateTime ?? "",
              eventType: data.eventType ?? "",
              eventLocation: data.eventLocation ?? "",
              temperature: data.temperature ?? 0,
              weatherCondition: data.weatherCondition ?? "",
              advice: data.advice ?? "",
              eventCountry: data.eventCountry ?? "",
              outfitRecommendation: data.outfitRecommendation ?? null,
            };
          }
        );

        setEvents(eventsData.length > 0 ? eventsData : DUMMY_EVENTS_DATA);
      },
      (err) => {
        console.error("Error fetching upcoming events:", err);
        setEvents(DUMMY_EVENTS_DATA);
      }
    );

    return () => unsubscribe();
  }, [firebase]);

  return (
    <div className="container mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-accent" />
          Upcoming Events
        </h1>
        <CalendarConnectButton />
      </div>

      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            Your Event Style Guidance
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Synced from Google Calendar or from your saved events.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event, index) => (
            <UpcomingEventAdviceCard
              key={event.id ?? index}
              eventAdvice={event}
              cardIndex={index}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
TSX
else
  echo "⚠️  src/app/upcoming-events/page.tsx not found, skipping."
fi

# -------------------------------------------------------
# 4) Genkit config stub (src/genkit.config.ts)
#    to satisfy: import { ai } from "../../genkit.config";
# -------------------------------------------------------
echo "📄 Writing src/genkit.config.ts (Genkit stub) ..."
cat << 'TS' > src/genkit.config.ts
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

export const ai = genkit({
  plugins: [googleAI()],
  model: {
    default: "googleai/gemini-1.5-flash-latest",
  },
});

export default ai;
TS

# -------------------------------------------------------
# 5) Minimal analyze-style-dna flow for type imports
#    File: src/ai/flows/analyze-style-dna.ts
# -------------------------------------------------------
echo "📄 Writing src/ai/flows/analyze-style-dna.ts (type stub) ..."
cat << 'TS' > src/ai/flows/analyze-style-dna.ts
import { z } from "zod";

export const AccuWeatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  location: z.string().optional(),
});

export type AccuWeatherSchema = z.infer<typeof AccuWeatherSchema>;

export const GoogleCalendarEventSchema = z.object({
  eventName: z.string(),
  eventStartDateTime: z.string(),
  eventEndDateTime: z.string(),
  eventType: z.string(),
  eventLocation: z.string().optional(),
  eventCountry: z.string().optional(),
});

export type GoogleCalendarEventSchema = z.infer<typeof GoogleCalendarEventSchema>;
TS

echo ""
echo "✅ Auto-fix complete."
echo "Now run:"
echo "  chmod +x backend-auto-fix.sh"
echo "  ./backend-auto-fix.sh"
echo "then:"
echo "  npm run lint"
echo "  npm run build"

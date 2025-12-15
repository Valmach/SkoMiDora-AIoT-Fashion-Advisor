"use client";

// Declare the global constant for secure path construction
declare const __app_id: string | undefined;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
// ✅ FIX: Changed to a default import to resolve TS2724 ("no exported member named...")
import UpcomingEventAdviceCard from "@/components/UpcomingEventAdviceCard";
import { useFirebase } from "@/firebase/provider";
import { collection, query, onSnapshot } from "firebase/firestore";

// ✅ Type imported from global types
import type { UpcomingEventStyleAdvice } from "@/types";

/* ============================================================
   FALLBACK / DEMO DATA
============================================================ */

const DUMMY_EVENTS_DATA: UpcomingEventStyleAdvice[] = [
  {
    id: "dummy-1",
    eventName: "Paris Fashion Week – Chanel Show",
    eventStartDateTime: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    eventEndDateTime: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
    ).toISOString(),
    eventType: "Fashion Show",
    eventLocation: "Grand Palais, Paris, France",
    temperature: 18,
    weatherCondition: "Cloudy with light rain",
    advice:
      "For Paris Fashion Week, lean into timeless elegance. A tailored tweed jacket with silk trousers or a midi skirt feels refined and appropriate. Complete the look with slingbacks and a structured leather bag.",
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
    eventLocation: "Metropolitan Museum of Art, New York, USA",
    temperature: 22,
    weatherCondition: "Clear",
    advice:
      "The Met Gala calls for theatrical glamour. Opt for a sculptural silhouette or custom couture-inspired piece. Statement jewellery and bold styling are essential.",
    eventCountry: "USA",
    outfitRecommendation: null,
  },
  {
    id: "dummy-3",
    eventName: "Milan Fashion Week – Fendi Show",
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
      "In Milan, embrace sharp Italian tailoring. A structured leather dress or a crisply cut suit showcases confidence and craftsmanship. Finish with sculptural heels.",
    eventCountry: "Italy",
    outfitRecommendation: null,
  },
];

/* ============================================================
   PAGE
============================================================ */

export default function EventsPage() {
  const firebase = useFirebase();
  const [events, setEvents] =
    useState<UpcomingEventStyleAdvice[]>(DUMMY_EVENTS_DATA);

  useEffect(() => {
    // If Firebase is not initialized or the user's auth status is not yet known,
    // use dummy data and exit the effect.
    if (!firebase || !firebase.auth.currentUser) {
      setEvents(DUMMY_EVENTS_DATA);
      return;
    }

    // 🔥 Using the provided __app_id and userId for secure Firestore path construction (MANDATORY)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // Use the current authenticated user's ID
    const userId = firebase.auth.currentUser.uid;
    // Collection path: /artifacts/{appId}/users/{userId}/upcomingEvents
    const collectionPath = `/artifacts/${appId}/users/${userId}/upcomingEvents`;

    const eventsCollectionRef = collection(
      firebase.firestore,
      collectionPath
    );
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

        // Sort events by start date
        eventsData.sort((a, b) => new Date(a.eventStartDateTime).getTime() - new Date(b.eventStartDateTime).getTime());

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
          <CardTitle className="text-2xl font-bold">
            Your Event Style Guidance
          </CardTitle>
          <CardDescription>
            Synced from Google Calendar or your saved events.
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
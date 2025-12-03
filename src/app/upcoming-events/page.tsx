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

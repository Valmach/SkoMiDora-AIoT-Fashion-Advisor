'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UpcomingEventAdviceCard from "@/components/UpcomingEventAdviceCard";
import { useFirebase } from "@/firebase/provider";
import { collection, query, onSnapshot } from "firebase/firestore";
import type { UpcomingEventStyleAdvice } from '@/types';

const DUMMY_EVENTS_DATA: UpcomingEventStyleAdvice[] = [
  {
    eventName: "Paris Fashion Week - Chanel Show",
    eventStartDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    eventEndDateTime: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000)).toISOString(),
    eventType: "Fashion Show",
    eventLocation: "Grand Palais, Paris",
    temperature: 18,
    weatherCondition: "Cloudy with a chance of rain",
    advice: "For Paris Fashion Week, channel timeless elegance. A classic tweed jacket paired with tailored trousers or a silk midi skirt is effortlessly chic. Complement with Chanel slingbacks and a quilted leather bag for a nod to the iconic host."
  },
  {
    eventName: "The Met Gala",
    eventStartDateTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    eventEndDateTime: new Date(Date.now() + (12 * 24 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000)).toISOString(),
    eventType: "Gala",
    eventLocation: "The Metropolitan Museum of Art, New York",
    temperature: 22,
    weatherCondition: "Clear",
    advice: "The Met Gala demands avant-garde glamour. Embrace the theme with a sculptural gown from a designer like Iris van Herpen or a dramatic, custom creation. Statement jewellery and artistic make-up are essential to complete this high-fashion look."
  },
  {
    eventName: "Milan Fashion Week - Fendi Show",
    eventStartDateTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    eventEndDateTime: new Date(Date.now() + (20 * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000)).toISOString(),
    eventType: "Fashion Show",
    eventLocation: "Fendi HQ, Milan",
    temperature: 25,
    weatherCondition: "Sunny",
    advice: "Embody Italian luxury for Milan. A sophisticated leather dress or a sharply tailored suit from Fendi showcases craftsmanship. Pair with bold, architectural heels and a peek of a colourful silk blouse for a modern, powerful statement."
  }
];

export default function UpcomingEventsPage() {
  const firebase = useFirebase();
  const [events, setEvents] = useState<UpcomingEventStyleAdvice[]>(DUMMY_EVENTS_DATA);

  useEffect(() => {
    if (!firebase) {
      setEvents(DUMMY_EVENTS_DATA);
      return;
    }
    const eventsCollectionRef = collection(firebase.firestore, "upcomingEvents");
    const q = query(eventsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: UpcomingEventStyleAdvice[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          eventName: data.eventName || "",
          eventStartDateTime: data.eventStartDateTime || "",
          eventEndDateTime: data.eventEndDateTime || "",
          eventType: data.eventType || "",
          eventLocation: data.eventLocation || "",
          temperature: data.temperature || 0,
          weatherCondition: data.weatherCondition || "",
          advice: data.advice || ""
        };
      });
      setEvents(eventsData.length > 0 ? eventsData : DUMMY_EVENTS_DATA);
    }, (err) => {
      console.error("Error fetching upcoming events:", err);
      setEvents(DUMMY_EVENTS_DATA);
    });

    return () => unsubscribe();
  }, [firebase]);

  return (
    <div className="container mx-auto space-y-8">
      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-foreground font-calligraphy">
            Upcoming Events
          </CardTitle>
          <CardDescription className="text-muted-foreground font-sans">
            Here are your upcoming events and style advice for each.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event, index) => (
            <UpcomingEventAdviceCard key={index} eventAdvice={event} cardIndex={index} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

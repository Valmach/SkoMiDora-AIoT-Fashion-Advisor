'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UpcomingEventAdviceCard from "@/components/UpcomingEventAdviceCard";
import { useFirebase } from "@/firebase/provider";
import { collection, query, onSnapshot } from "firebase/firestore";
import type { UpcomingEventStyleAdvice } from '@/types';

const DUMMY_EVENTS_DATA: UpcomingEventStyleAdvice[] = [
  {
    eventName: "Fallback Event: AI Fashion Summit",
    eventStartDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    eventEndDateTime: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000)).toISOString(),
    eventType: "Tech Conference",
    eventLocation: "Virtual",
    temperature: 21,
    weatherCondition: "Data not available",
    advice: "When data is unavailable, a classic and versatile outfit is your best bet. Consider a well-fitted blazer, a simple top, and dark trousers or a skirt."
  },
  {
    eventName: "Placeholder: Weekend Brunch",
    eventStartDateTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    eventEndDateTime: new Date(Date.now() + (4 * 24 * 60 * 60 * 1000) + (3 * 60 * 60 * 1000)).toISOString(),
    eventType: "Social Gathering",
    eventLocation: "The Breakfast Club, Soho",
    temperature: 18,
    weatherCondition: "Partly Cloudy",
    advice: "For a stylish weekend brunch, opt for smart-casual. A chic knit jumper paired with tailored trousers and stylish trainers would be perfect."
  },
  {
    eventName: "Placeholder: Charity Gala",
    eventStartDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    eventEndDateTime: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000) + (4 * 60 * 60 * 1000)).toISOString(),
    eventType: "Formal Event",
    eventLocation: "The Savoy, London",
    temperature: 15,
    weatherCondition: "Clear Night",
    advice: "A formal event calls for elegance. A floor-length gown or a sophisticated cocktail dress from a designer like Stella McCartney would be appropriate. Complement with statement jewellery."
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

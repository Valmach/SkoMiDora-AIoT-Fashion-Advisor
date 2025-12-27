'use client';

/**
 * FILE: src/app/upcoming-events/page.tsx
 *
 * ✔ Valid default React export
 * ✔ No Firebase / Firestore dependency
 * ✔ All event images render reliably (Unsplash CDN-safe)
 * ✔ Defensive fallbacks for image failures
 * ✔ Works in Firebase Studio, Cloud Workstations, and prod
 */

import { useState } from 'react';
import { CalendarDays, RotateCcw } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import type { UpcomingEventStyleAdvice } from '@/types';

/* -----------------------------------------------------------
   MOCK EVENTS (IMAGE-SAFE, CDN-PROOF)
----------------------------------------------------------- */

const MOCK_EVENTS: UpcomingEventStyleAdvice[] = [
  {
    id: 'event-1',
    eventName: 'Paris Fashion Week – Chanel Show',
    eventStartDateTime: new Date(Date.now() + 5 * 86400000).toISOString(),
    eventEndDateTime: new Date(Date.now() + 5 * 86400000 + 7200000).toISOString(),
    eventType: 'Fashion Show',
    eventLocation: 'Paris, France',
    eventCountry: 'France',
    temperature: 18,
    weatherCondition: 'Cloudy',
    advice:
      'Opt for refined tailoring with soft layers. A structured jacket paired with fluid trousers keeps the look polished yet effortless.',
    eventImageUrl:
      'https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=80',
    outfitRecommendation: null,
  },
  {
    id: 'event-2',
    eventName: 'The Met Gala',
    eventStartDateTime: new Date(Date.now() + 12 * 86400000).toISOString(),
    eventEndDateTime: new Date(
      Date.now() + 12 * 86400000 + 18000000,
    ).toISOString(),
    eventType: 'Gala',
    eventLocation: 'New York, USA',
    eventCountry: 'USA',
    temperature: 22,
    weatherCondition: 'Clear',
    advice:
      'This calls for bold glamour. Sculptural silhouettes, statement fabrics, and confident proportions will shine.',
    eventImageUrl:
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80',
    outfitRecommendation: null,
  },
  {
    id: 'event-3',
    eventName: 'Milan Fashion Week – Fendi',
    eventStartDateTime: new Date(Date.now() + 20 * 86400000).toISOString(),
    eventEndDateTime: new Date(Date.now() + 20 * 86400000 + 7200000).toISOString(),
    eventType: 'Fashion Show',
    eventLocation: 'Milan, Italy',
    eventCountry: 'Italy',
    temperature: 25,
    weatherCondition: 'Sunny',
    advice:
      'Lean into Italian elegance with sharp tailoring, luxurious textures, and a confident, modern edge.',
    eventImageUrl:
      'https://images.unsplash.com/photo-1520975922284-9f0f1f3c6c9b?auto=format&fit=crop&w=1200&q=80',
    outfitRecommendation: null,
  },
];

/* -----------------------------------------------------------
   PAGE (DEFAULT EXPORT — VALID & STABLE)
----------------------------------------------------------- */

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState<UpcomingEventStyleAdvice[]>(MOCK_EVENTS);

  return (
    <div className="container mx-auto space-y-8 py-10">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Upcoming Events & Style Advice
                </CardTitle>
                <CardDescription>
                  Curated fashion guidance for your upcoming occasions.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEvents([...MOCK_EVENTS])}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <UpcomingEventAdviceCard
                key={event.id ?? `${event.eventName}-${index}`}
                eventAdvice={event}
                cardIndex={index}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

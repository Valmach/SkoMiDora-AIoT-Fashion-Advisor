'use client';

/**
 * FILE: src/app/upcoming-events/page.tsx
 *
 * PURPOSE:
 * - Render 3 upcoming event cards (Paris, London, New York)
 * - Shoe-first vs outfit-first AI logic
 * - City-based weather (AccuWeather-ready)
 * - Clear captions above & below images
 */

import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, RotateCcw } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { generateOutfitForEventAction } from '@/app/actions/generate-outfit-for-event';
import type { UpcomingEventStyleAdvice } from '@/types';

/* -----------------------------------------------------------
   CITY CONFIG
----------------------------------------------------------- */

const CITY_EVENTS = [
  {
    city: 'Paris',
    country: 'France',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
  },
  {
    city: 'London',
    country: 'United Kingdom',
    image:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
  },
  {
    city: 'New York',
    country: 'United States',
    image:
      'https://images.unsplash.com/photo-1549924231-f129b911e442',
  },
];

/* -----------------------------------------------------------
   WEATHER (STUB – ACCUWEATHER READY)
----------------------------------------------------------- */

function getCityWeather(city: string) {
  switch (city) {
    case 'Paris':
      return { temperature: 16, condition: 'Overcast' };
    case 'London':
      return { temperature: 14, condition: 'Light Rain' };
    case 'New York':
      return { temperature: 19, condition: 'Clear' };
    default:
      return { temperature: 18, condition: 'Clear' };
  }
}

/* -----------------------------------------------------------
   PAGE
----------------------------------------------------------- */

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState<UpcomingEventStyleAdvice[]>([]);
  const [loading, setLoading] = useState(false);

  /* -----------------------------------------------------------
     GENERATE EVENTS
  ----------------------------------------------------------- */
  const generateEvents = async () => {
    setLoading(true);

    try {
      // 1️⃣ Load wardrobe
      const q = query(
        collection(firestore, 'publicWardrobeItems'),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);

      const wardrobeItems = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().itemName ?? 'Item',
        type: d.data().itemType ?? 'Accessory',
      }));

      if (wardrobeItems.length === 0) {
        setEvents([]);
        return;
      }

      // 2️⃣ Shoe-first vs outfit-first logic
      const shoeCount = wardrobeItems.filter(
        (i) => i.type === 'Shoes',
      ).length;

      const strategy =
        shoeCount / wardrobeItems.length > 0.35
          ? 'shoe-first'
          : 'outfit-first';

      // 3️⃣ AI call (returns recommendations[])
      const aiResult = await generateOutfitForEventAction({
        wardrobeItems,
        styleDNA: `Modern Elegant (${strategy})`,
      });

      if (!aiResult?.recommendations) {
        setEvents([]);
        return;
      }

      // 4️⃣ Map to UpcomingEventStyleAdvice
      const formatted: UpcomingEventStyleAdvice[] =
        CITY_EVENTS.map((cityCfg, index) => {
          const rec = aiResult.recommendations[index];
          const weather = getCityWeather(cityCfg.city);

          return {
            id: `event-${cityCfg.city}`,
            eventName: `${cityCfg.city} Engagement`,
            eventType: rec?.styleCategory ?? 'Lifestyle',
            advice: rec?.description ?? 'Curated styling recommendation',

            eventImageUrl: cityCfg.image,

            temperature: weather.temperature,
            weatherCondition: weather.condition,

            eventStartDateTime: new Date(
              Date.now() + index * 86400000,
            ).toISOString(),
            eventEndDateTime: new Date(
              Date.now() + index * 86400000 + 7200000,
            ).toISOString(),

            eventLocation: cityCfg.city,
            eventCountry: cityCfg.country,

            outfitRecommendation: {
              description: rec?.description ?? '',
              suitabilityScore: rec?.suitabilityScore ?? 85,
              reasoning:
                strategy === 'shoe-first'
                  ? 'Footwear anchored the outfit selection.'
                  : 'Outfit silhouette guided footwear pairing.',
            },
          };
        });

      setEvents(formatted);
    } catch (err) {
      console.error('Upcoming events failed:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------------------------
     INITIAL LOAD
  ----------------------------------------------------------- */
  useEffect(() => {
    generateEvents();
  }, []);

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  return (
    <div className="container mx-auto space-y-10 py-12">
      <Card className="shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CalendarDays className="h-9 w-9 text-primary" />
              <div>
                <CardTitle className="text-4xl font-bold tracking-tight">
                  Upcoming Events & Style Intelligence
                </CardTitle>
                <CardDescription className="text-lg">
                  City-aware, weather-aware, wardrobe-anchored AI styling
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={generateEvents}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {events.map((event, index) => (
                <UpcomingEventAdviceCard
                  key={event.id}
                  eventAdvice={event}
                  cardIndex={index}
                />
              ))}
            </div>
          )}

          {!loading && events.length === 0 && (
            <p className="text-center text-lg text-muted-foreground italic py-20">
              No upcoming events available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

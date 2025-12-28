'use client';

/**
 * FILE: src/app/upcoming-events/page.tsx
 *
 * PURPOSE:
 * - Render 3 upcoming event cards
 * - Consume AI recommendations[] correctly
 * - Anchor styling to the user's Digital Closet
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

      // 2️⃣ Call AI (returns recommendations[])
      const aiResult = await generateOutfitForEventAction({
        wardrobeItems,
        styleDNA: 'Modern Elegant',
      });

      if (!aiResult?.recommendations) {
        setEvents([]);
        return;
      }

      // 3️⃣ Map recommendations → UpcomingEventStyleAdvice
      const formatted: UpcomingEventStyleAdvice[] =
        aiResult.recommendations.slice(0, 3).map((rec, index) => ({
          id: `event-${index}`,
          eventName: rec.eventName,
          eventType: rec.styleCategory,
          advice: rec.description,

          eventImageUrl:
            rec.imageUrl ??
            'https://images.unsplash.com/photo-1521334884684-d80222895322',

          temperature: 18 + index * 2,
          weatherCondition: 'Partly Cloudy',

          eventStartDateTime: new Date(
            Date.now() + index * 86400000,
          ).toISOString(),
          eventEndDateTime: new Date(
            Date.now() + index * 86400000 + 7200000,
          ).toISOString(),

          eventLocation: 'Global',
          eventCountry: 'Global',

          outfitRecommendation: {
            description: rec.description,
            suitabilityScore: rec.suitabilityScore,
            reasoning:
              'Generated from your Digital Closet and event context.',
          },
        }));

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
    <div className="container mx-auto space-y-8 py-10">
      <Card className="shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold">
                  Upcoming Events & Style Advice
                </CardTitle>
                <CardDescription>
                  AI styling synced to your calendar and Smart Closet
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
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <p className="text-center text-muted-foreground italic py-16">
              No upcoming events available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

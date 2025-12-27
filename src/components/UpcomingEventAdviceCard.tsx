'use client';

/**
 * src/components/UpcomingEventAdviceCard.tsx
 *
 * Bullet-proof event card:
 * - Works with mock data
 * - Works with real Genkit output
 * - Never crashes if images are missing
 * - No Firebase dependencies
 */

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Thermometer, MapPin } from 'lucide-react';
import type { UpcomingEventStyleAdvice } from '@/types';

/* -----------------------------------------------------------
   PROPS
----------------------------------------------------------- */
type Props = {
  eventAdvice: UpcomingEventStyleAdvice;
  cardIndex?: number;
};

/* -----------------------------------------------------------
   FALLBACK IMAGES (SAFE + STATIC)
----------------------------------------------------------- */
const FALLBACK_EVENT_IMAGES = [
  'https://images.unsplash.com/photo-1521334884684-d80222895322',
  'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb',
  'https://images.unsplash.com/photo-1520975922284-9f0f1f3c6c9b',
];

/* -----------------------------------------------------------
   COMPONENT
----------------------------------------------------------- */
export default function UpcomingEventAdviceCard({
  eventAdvice,
  cardIndex = 0,
}: Props) {
  const imageUrl =
    eventAdvice.eventImageUrl ||
    FALLBACK_EVENT_IMAGES[cardIndex % FALLBACK_EVENT_IMAGES.length];

  return (
    <Card className="overflow-hidden shadow-lg">
      {/* IMAGE */}
      <div className="relative h-56 w-full bg-muted">
        <Image
          src={imageUrl}
          alt={eventAdvice.eventName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized
        />
      </div>

      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          {eventAdvice.eventName}
        </CardTitle>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{eventAdvice.eventType}</Badge>

          {eventAdvice.eventCountry && (
            <Badge variant="secondary">
              <MapPin className="h-3 w-3 mr-1" />
              {eventAdvice.eventCountry}
            </Badge>
          )}

          <Badge variant="outline">
            <Thermometer className="h-3 w-3 mr-1" />
            {eventAdvice.temperature}°C · {eventAdvice.weatherCondition}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {eventAdvice.advice}
        </p>
      </CardContent>
    </Card>
  );
}

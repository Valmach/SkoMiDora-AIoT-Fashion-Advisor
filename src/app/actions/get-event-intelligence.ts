'use server';

/**
 * ============================================================
 * Event Intelligence Layer
 * ------------------------------------------------------------
 * PURPOSE:
 * - Produce clean, stable event intelligence
 * - NO outfits
 * - NO images
 * - NO UI assumptions
 * - Safe to consume by AI + UI independently
 *
 * This file is a HARD BOUNDARY (firewall).
 * ============================================================
 */

import { z } from 'zod';
import type { EventIntelligence } from '@/domains/events/types';

/* ------------------------------------------------------------------
   INPUT SCHEMA (future: Google Calendar API)
------------------------------------------------------------------ */
const RawEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startDateTime: z.string(),
  city: z.string(),
  country: z.string(),
  eventType: z.enum(['work', 'social', 'travel', 'formal']),
});

/* ------------------------------------------------------------------
   WEATHER LOOKUP (mock for now, pluggable later)
------------------------------------------------------------------ */
function resolveWeather(city: string): EventIntelligence['weather'] {
  // 🔁 Replace later with real API (AccuWeather / Open-Meteo)
  switch (city.toLowerCase()) {
    case 'paris':
      return { temperatureC: 18, condition: 'Cloudy' };
    case 'oslo':
      return { temperatureC: 9, condition: 'Cold & Clear' };
    case 'london':
      return { temperatureC: 14, condition: 'Rainy' };
    default:
      return { temperatureC: 20, condition: 'Mild' };
  }
}

/* ------------------------------------------------------------------
   NIGHT / DAY INFERENCE
------------------------------------------------------------------ */
function isNightEvent(startDateTime: string): boolean {
  const hour = new Date(startDateTime).getHours();
  return hour >= 18 || hour < 6;
}

/* ------------------------------------------------------------------
   MAIN ACTION
------------------------------------------------------------------ */
export async function getUpcomingEvents(): Promise<EventIntelligence[]> {
  /**
   * TEMP: Simulated calendar events
   * ------------------------------------------------------------
   * This will later be replaced with:
   * - Google Calendar API
   * - User OAuth tokens
   * - Timezone-aware parsing
   */
  const simulatedEvents = [
    {
      id: 'evt_paris_001',
      title: 'Fashion Week Mixer',
      startDateTime: new Date(Date.now() + 86400000).toISOString(),
      city: 'Paris',
      country: 'France',
      eventType: 'social',
    },
    {
      id: 'evt_oslo_002',
      title: 'Nordic Design Summit',
      startDateTime: new Date(Date.now() + 2 * 86400000).toISOString(),
      city: 'Oslo',
      country: 'Norway',
      eventType: 'work',
    },
    {
      id: 'evt_london_003',
      title: 'Tech Innovation Gala',
      startDateTime: new Date(Date.now() + 3 * 86400000).toISOString(),
      city: 'London',
      country: 'United Kingdom',
      eventType: 'formal',
    },
  ];

  /* ------------------------------------------------------------
     VALIDATE + NORMALIZE
  ------------------------------------------------------------ */
  return simulatedEvents.map((raw) => {
    const parsed = RawEventSchema.parse(raw);

    const eventIntelligence: EventIntelligence = {
      eventId: parsed.id,

      city: parsed.city,
      country: parsed.country,

      eventType: parsed.eventType,
      isNight: isNightEvent(parsed.startDateTime),

      startDateTime: parsed.startDateTime,

      weather: resolveWeather(parsed.city),
    };

    return eventIntelligence;
  });
}

/**
 * ============================================================
 * EVENT INTELLIGENCE CONTRACT
 * ------------------------------------------------------------
 * This file defines the ONLY data shape that may flow from:
 *
 *   Upcoming Events  →  Outfit AI  →  Outfit Rendering
 *
 * 🚫 NO UI imports
 * 🚫 NO React
 * 🚫 NO images
 * 🚫 NO footwear / clothing
 *
 * This is a HARD FIREWALL between Events and Outfits.
 * ============================================================
 */

export type EventType =
  | 'work'
  | 'social'
  | 'travel'
  | 'formal';

export type EventWeather = {
  /** Temperature in Celsius (normalized) */
  temperatureC: number;

  /** Short condition summary: Clear, Rain, Snow, etc */
  condition: string;
};

export type EventIntelligence = {
  /** Stable ID (Calendar ID or generated UUID) */
  eventId: string;

  /** City name only (Paris, London, Oslo) */
  city: string;

  /** Country name only (France, UK, Norway) */
  country: string;

  /** Normalized event classification */
  eventType: EventType;

  /** Derived flag used by Outfit AI (heels vs flats, etc) */
  isNight: boolean;

  /** ISO timestamp */
  startDateTime: string;

  /** Normalized weather snapshot at event time */
  weather: EventWeather;
};

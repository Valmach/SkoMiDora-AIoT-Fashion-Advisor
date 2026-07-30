'use server';

import {
  calendarEventAllowsSwimwear,
  formatCalendarEventDate,
  normalizeCalendarEvent,
  SWIMWEAR_KEYWORDS,
  type CalendarEventInput,
} from '@/lib/calendar-event-style';

import {
  getWeatherForLocation,
} from './get-weather';

function findBestItems(
  items: any[],
  keywords: string[],
  excludedKeywords: readonly string[],
  limit = 1,
) {
  return items
    .filter(item => {
      const text =
        JSON.stringify(item).toLowerCase();

      return !excludedKeywords.some(
        keyword =>
          text.includes(
            keyword.toLowerCase(),
          ),
      );
    })
    .map(item => {
      const text =
        JSON.stringify(item).toLowerCase();

      const score = keywords.reduce(
        (total, keyword) =>
          total +
          (text.includes(
            keyword.toLowerCase(),
          )
            ? 1
            : 0),
        0,
      );

      return {
        ...item,
        score,
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getUpcomingEventsStyleAdviceAction(
  closetItems: any[],
  calendarEvents: CalendarEventInput[] = [],
) {
  const events = calendarEvents
    .map(normalizeCalendarEvent)
    .filter(
      (
        event,
      ): event is NonNullable<
        ReturnType<
          typeof normalizeCalendarEvent
        >
      > => event !== null,
    );

  if (events.length === 0) {
    return [];
  }

  return Promise.all(
    events.map(async event => {
      const originalEvent =
        calendarEvents.find(
          candidate =>
            candidate.eventId ===
              event.id ||
            candidate.id === event.id,
        );

      const excludedKeywords =
        originalEvent &&
        calendarEventAllowsSwimwear(
          originalEvent,
        )
          ? []
          : SWIMWEAR_KEYWORDS;

      const topItem = findBestItems(
        closetItems,
        event.keywords,
        excludedKeywords,
      )[0];

      let weatherForecast =
        'Weather data unavailable';

      let reasoning =
        'This recommendation is based on the Calendar event date, location, and event context. Event-specific weather will be synchronized separately.';

      if (event.location) {
        const weather =
          await getWeatherForLocation(
            event.location,
          );

        if (
          weather.success &&
          weather.current
        ) {
          weatherForecast =
            `${weather.current.temp_c}°C ` +
            `(${weather.current.temp_f}°F) | ` +
            weather.current.condition;

          reasoning =
            `Current conditions in ${event.location} are ` +
            `${weatherForecast}. The Calendar event date and location are preserved; event-date forecast selection is handled by the separate weather synchronization gate.`;
        }
      }

      return {
        id: event.id,
        eventName: event.name,
        summary: event.name,
        title: event.name,
        location: event.location,
        date:
          formatCalendarEventDate(
            event.eventDate,
          ),
        startDateTime:
          event.eventDate.toISOString(),
        weatherForecast,
        reasoning,
        styleKeywords:
          event.keywords.slice(0, 5),
        suggestedItemName:
          topItem?.itemName ||
          'Curated Wardrobe Item',
        suggestedItemImage:
          topItem?.imageUrl || null,
        cityBg: event.cityBg,
      };
    }),
  );
}

'use server';

import {
  calendarEventAllowsSwimwear,
  formatCalendarEventDate,
  formatEventMonthYear,
  getSeasonForLatitude,
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

function weatherAdjustedKeywords(
  originalKeywords: string[],
  tempC: number,
  condition: string,
): string[] {
  const keywords = [
    ...originalKeywords,
  ];

  if (tempC >= 27) {
    keywords.push(
      'linen',
      'cotton',
      'silk',
      'sleeveless',
      'lightweight',
      'sandal',
      'mule',
    );
  } else if (tempC >= 19) {
    keywords.push(
      'lightweight',
      'shirt',
      'blouse',
      'dress',
      'loafer',
      'flat',
      'mule',
    );
  } else if (tempC >= 12) {
    keywords.push(
      'blazer',
      'cardigan',
      'trousers',
      'loafer',
      'closed-toe',
      'layering',
    );
  } else {
    keywords.push(
      'coat',
      'sweater',
      'boots',
      'warm',
      'layering',
    );
  }

  if (
    /\b(rain|drizzle|storm)\b/i.test(
      condition,
    )
  ) {
    keywords.push(
      'raincoat',
      'water-resistant',
      'closed-toe',
    );
  }

  return Array.from(
    new Set(keywords),
  );
}

function buildForecastReasoning(input: {
  location: string;
  eventDate: Date;
  season: string;
  tempC: number;
  tempF: number;
  feelsLikeC: number;
  condition: string;
  precipitation: number;
  windKph: number;
}): string {
  let clothingAdvice: string;

  if (input.tempC >= 27) {
    clothingAdvice =
      'Prioritize breathable linen, cotton, silk, lightweight dresses, refined separates, sandals, mules, and warm-weather footwear.';
  } else if (input.tempC >= 19) {
    clothingAdvice =
      'Prioritize breathable tailoring, lightweight shirts, dresses, refined trousers or skirts, loafers, flats, mules, or polished sneakers.';
  } else if (input.tempC >= 12) {
    clothingAdvice =
      'Use light layering, tailored trousers, shirts, knitwear, a blazer or light jacket, and practical closed-toe footwear.';
  } else {
    clothingAdvice =
      'Use warm structured layers, insulated outerwear, knitwear, trousers, and weather-appropriate closed footwear.';
  }

  const adjustments: string[] = [];

  if (
    /\b(rain|drizzle|storm)\b/i.test(
      input.condition,
    ) ||
    input.precipitation >= 45
  ) {
    adjustments.push(
      'Add a water-resistant layer and weather-tolerant footwear.',
    );
  }

  if (input.windKph >= 25) {
    adjustments.push(
      'Use secure layers and garments that retain their shape in the wind.',
    );
  }

  if (input.tempC >= 24) {
    adjustments.push(
      'Avoid heavy coats, thermal layers, cashmere wraps, and winter-weight fabrics.',
    );
  }

  const locationLabel =
    input.location || 'This event';

  return (
    `${locationLabel} is being styled for ` +
    `${formatEventMonthYear(input.eventDate)} ` +
    `${input.season.toLowerCase()} conditions. ` +
    `The event forecast is ${input.tempC}°C ` +
    `(${input.tempF}°F), feels like ` +
    `${input.feelsLikeC}°C, with ` +
    `${input.condition} and a ` +
    `${input.precipitation}% chance of precipitation. ` +
    clothingAdvice +
    (adjustments.length
      ? ` ${adjustments.join(' ')}`
      : '')
  );
}

function buildSeasonalReasoning(input: {
  location: string;
  eventDate: Date;
  season: string;
  forecastUnavailableForDate: boolean;
}): string {
  const locationLabel =
    input.location || 'This event';

  const forecastMessage =
    input.forecastUnavailableForDate
      ? 'The event is outside the available short-range weather forecast window.'
      : input.location
        ? 'Live weather data is temporarily unavailable for this event.'
        : 'The Calendar event does not include a location, so a destination forecast cannot be requested.';

  return (
    `${locationLabel} is being prepared for ` +
    `${formatEventMonthYear(input.eventDate)} ` +
    `${input.season.toLowerCase()} conditions. ` +
    `${forecastMessage} Styling is based on the event date, location, season, and event context rather than an invented forecast.`
  );
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

      const allowsSwimwear =
        originalEvent
          ? calendarEventAllowsSwimwear(
              originalEvent,
            )
          : false;

      const excludedKeywords =
        allowsSwimwear
          ? []
          : SWIMWEAR_KEYWORDS;

      const weather =
        await getWeatherForLocation(
          event.location,
          event.eventDate,
        );

      if (!weather.success) {
        const season =
          getSeasonForLatitude(
            event.eventDate,
            null,
          );

        const topItem = findBestItems(
          closetItems,
          event.keywords,
          excludedKeywords,
        )[0];

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
          weatherForecast:
            weather.forecastUnavailableForDate
              ? 'Forecast unavailable for this event date'
              : 'Weather data unavailable',
          reasoning:
            buildSeasonalReasoning({
              location: event.location,
              eventDate:
                event.eventDate,
              season,
              forecastUnavailableForDate:
                Boolean(
                  weather.forecastUnavailableForDate,
                ),
            }),
          season,
          eventMonthYear:
            formatEventMonthYear(
              event.eventDate,
            ),
          styleKeywords:
            event.keywords.slice(0, 5),
          suggestedItemName:
            topItem?.itemName ||
            'Curated Wardrobe Item',
          suggestedItemImage:
            topItem?.imageUrl || null,
          cityBg: event.cityBg,
        };
      }

      const forecast =
        weather.forecast;

      const season =
        getSeasonForLatitude(
          event.eventDate,
          weather.location.latitude,
        );

      const keywords =
        weatherAdjustedKeywords(
          event.keywords,
          forecast.temp_c,
          forecast.condition,
        );

      const topItem = findBestItems(
        closetItems,
        keywords,
        excludedKeywords,
      )[0];

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
        weatherForecast:
          `${forecast.temp_c}°C ` +
          `(${forecast.temp_f}°F) | ` +
          forecast.condition,
        reasoning:
          buildForecastReasoning({
            location: event.location,
            eventDate:
              event.eventDate,
            season,
            tempC:
              forecast.temp_c,
            tempF:
              forecast.temp_f,
            feelsLikeC:
              forecast.feels_like_c,
            condition:
              forecast.condition,
            precipitation:
              forecast.precipitation_probability,
            windKph:
              forecast.wind_kph,
          }),
        season,
        eventMonthYear:
          formatEventMonthYear(
            event.eventDate,
          ),
        styleKeywords:
          keywords.slice(0, 5),
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

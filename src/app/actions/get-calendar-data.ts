'use server';

import { getWeatherForLocation } from './get-weather';

type CalendarEventInput = {
  id?: string;
  summary?: string;
  title?: string;
  name?: string;
  description?: string;
  location?: string;
  city?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  startDateTime?: string;
  date?: string;
  eventType?: string;
  cityBg?: string;
};

type NormalizedEvent = {
  id: string;
  name: string;
  description: string;
  city: string;
  eventDate: Date;
  eventType: string;
  keywords: string[];
  cityBg: string;
};

const CITY_EVENT_EXCLUSIONS = [
  'bikini',
  'swimwear',
  'swimsuit',
  'swim suit',
  'bathing suit',
  'beachwear',
  'poolwear',
  'pool wear',
  'cover-up',
  'coverup',
];

const DEFAULT_KEYWORDS = [
  'linen',
  'cotton',
  'silk',
  'dress',
  'shirt',
  'blouse',
  'trousers',
  'skirt',
  'tailored',
  'loafer',
  'flat',
  'mule',
  'sandal',
  'sneaker',
  'lightweight',
];

function findBestItems(
  items: any[],
  keywords: string[],
  limit: number = 3,
  excludedKeywords: string[] = [],
) {
  return items
    .filter(item => {
      const text =
        JSON.stringify(item).toLowerCase();

      return !excludedKeywords.some(keyword =>
        text.includes(keyword.toLowerCase()),
      );
    })
    .map(item => {
      const text =
        JSON.stringify(item).toLowerCase();

      const score = keywords.reduce(
        (total, keyword) =>
          total +
          (text.includes(keyword.toLowerCase())
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

function createEventDate(
  sourceDate: Date,
  hour: number,
  minute: number,
): Date {
  const eventDate = new Date(sourceDate);
  eventDate.setHours(hour, minute, 0, 0);
  return eventDate;
}

function fallbackEvents(): NormalizedEvent[] {
  const now = new Date();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekend = new Date(now);
  weekend.setDate(weekend.getDate() + 3);

  return [
    {
      id: 'fallback-paris',
      name: 'Paris Summer Fashion Event',
      description: '',
      city: 'Paris, France',
      eventDate: createEventDate(now, 9, 0),
      eventType: 'fashion',
      keywords: [
        'silk',
        'linen',
        'wide-leg',
        'chic',
        'tailored',
        'loafer',
        'flat',
        'mule',
      ],
      cityBg:
        'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'fallback-oslo',
      name: 'Oslo Summer Summit',
      description: '',
      city: 'Oslo, Norway',
      eventDate: createEventDate(
        tomorrow,
        11,
        30,
      ),
      eventType: 'business',
      keywords: [
        'linen',
        'cotton',
        'silk',
        'shirt',
        'blouse',
        'trousers',
        'skirt',
        'loafer',
        'mule',
        'lightweight',
        'tailored',
      ],
      cityBg:
        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'fallback-rome',
      name: 'Rome Cultural Tour',
      description: '',
      city: 'Rome, Italy',
      eventDate: createEventDate(
        weekend,
        18,
        0,
      ),
      eventType: 'cultural',
      keywords: [
        'linen',
        'silk',
        'dress',
        'skirt',
        'tailored',
        'sandal',
        'mule',
        'loafer',
        'flat',
        'sleeveless',
      ],
      cityBg:
        'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop',
    },
  ];
}

function eventDateFromCalendar(
  event: CalendarEventInput,
): Date | null {
  const rawDate =
    event.start?.dateTime ||
    event.startDateTime ||
    event.start?.date ||
    event.date;

  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function deriveKeywords(
  event: CalendarEventInput,
): string[] {
  const text = [
    event.summary,
    event.title,
    event.name,
    event.description,
    event.eventType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const keywords = [...DEFAULT_KEYWORDS];

  if (
    /\b(conference|meeting|summit|business|office|client)\b/.test(
      text,
    )
  ) {
    keywords.push(
      'blazer',
      'tailored',
      'trousers',
      'loafer',
      'pump',
    );
  }

  if (
    /\b(tour|walking|museum|sightseeing|travel)\b/.test(
      text,
    )
  ) {
    keywords.push(
      'sneaker',
      'loafer',
      'flat',
      'comfortable',
    );
  }

  if (
    /\b(dinner|gala|formal|wedding|reception|cocktail)\b/.test(
      text,
    )
  ) {
    keywords.push(
      'dress',
      'silk',
      'tailored',
      'pump',
      'heel',
    );
  }

  return Array.from(new Set(keywords));
}

function backgroundForLocation(
  location: string,
): string {
  const text = location.toLowerCase();

  if (text.includes('paris')) {
    return 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop';
  }

  if (text.includes('oslo')) {
    return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop';
  }

  if (text.includes('rome')) {
    return 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop';
  }

  return '';
}

function normalizeCalendarEvent(
  event: CalendarEventInput,
  index: number,
): NormalizedEvent | null {
  const eventDate =
    eventDateFromCalendar(event);

  if (!eventDate) {
    return null;
  }

  const name =
    event.summary ||
    event.title ||
    event.name ||
    'Upcoming Event';

  const city = String(
    event.location || event.city || '',
  ).trim();

  return {
    id: event.id || 'calendar-event-' + index,
    name,
    description:
      String(event.description || ''),
    city,
    eventDate,
    eventType:
      String(event.eventType || 'general'),
    keywords: deriveKeywords(event),
    cityBg:
      event.cityBg ||
      backgroundForLocation(city),
  };
}

function getSeason(
  date: Date,
  latitude: number | null,
): string {
  const month = date.getMonth() + 1;
  const northern =
    latitude === null || latitude >= 0;

  if (northern) {
    if ([12, 1, 2].includes(month)) {
      return 'Winter';
    }

    if ([3, 4, 5].includes(month)) {
      return 'Spring';
    }

    if ([6, 7, 8].includes(month)) {
      return 'Summer';
    }

    return 'Fall';
  }

  if ([12, 1, 2].includes(month)) {
    return 'Summer';
  }

  if ([3, 4, 5].includes(month)) {
    return 'Fall';
  }

  if ([6, 7, 8].includes(month)) {
    return 'Winter';
  }

  return 'Spring';
}

function formatEventDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function weatherKeywords(
  originalKeywords: string[],
  tempC: number,
  condition: string,
): string[] {
  const keywords = [...originalKeywords];
  const conditionText = condition.toLowerCase();

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
    conditionText.includes('rain') ||
    conditionText.includes('drizzle') ||
    conditionText.includes('storm')
  ) {
    keywords.push(
      'raincoat',
      'water-resistant',
      'closed-toe',
    );
  }

  return Array.from(new Set(keywords));
}

function buildWeatherReasoning(input: {
  city: string;
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
  const conditionText =
    input.condition.toLowerCase();

  if (
    conditionText.includes('rain') ||
    conditionText.includes('drizzle') ||
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
    input.city || 'This event';

  return (
    locationLabel +
    ' is being styled for ' +
    formatMonthYear(input.eventDate) +
    ' ' +
    input.season.toLowerCase() +
    ' conditions. The event forecast is ' +
    input.tempC +
    '°C (' +
    input.tempF +
    '°F), feels like ' +
    input.feelsLikeC +
    '°C, with ' +
    input.condition +
    ' and a ' +
    input.precipitation +
    '% chance of precipitation. ' +
    clothingAdvice +
    (adjustments.length
      ? ' ' + adjustments.join(' ')
      : '')
  );
}

function seasonalFallbackReasoning(
  event: NormalizedEvent,
  season: string,
  forecastUnavailableForDate: boolean,
): string {
  const locationLabel =
    event.city || 'This event';

  const forecastMessage =
    forecastUnavailableForDate
      ? 'The event is outside the available short-range weather forecast window.'
      : 'Live weather data is temporarily unavailable for this event.';

  return (
    locationLabel +
    ' is being prepared for ' +
    formatMonthYear(event.eventDate) +
    ' ' +
    season.toLowerCase() +
    ' conditions. ' +
    forecastMessage +
    ' Styling is therefore based on the event date, location, season, and event type rather than an invented forecast.'
  );
}

export async function getUpcomingEventsStyleAdviceAction(
  closetItems: any[],
  calendarEvents: CalendarEventInput[] = [],
) {
  const normalizedCalendarEvents =
    calendarEvents
      .map(normalizeCalendarEvent)
      .filter(
        (
          event,
        ): event is NormalizedEvent =>
          event !== null,
      );

  const sourceEvents =
    normalizedCalendarEvents.length > 0
      ? normalizedCalendarEvents
      : fallbackEvents();

  return Promise.all(
    sourceEvents.map(async event => {
      const weather =
        await getWeatherForLocation(
          event.city,
          event.eventDate,
        );

      if (!weather.success) {
        const season = getSeason(
          event.eventDate,
          null,
        );

        const recommendations = findBestItems(
          closetItems,
          event.keywords,
          1,
          CITY_EVENT_EXCLUSIONS,
        );

        const topItem = recommendations[0];

        return {
          id: event.id,
          eventName: event.name,
          summary: event.name,
          title: event.name,
          location: event.city,
          date:
            formatEventDate(event.eventDate) +
            ' • ' +
            formatEventTime(event.eventDate),
          startDateTime:
            event.eventDate.toISOString(),
          weatherForecast:
            weather.forecastUnavailableForDate
              ? 'Forecast unavailable for this event date'
              : 'Weather data unavailable',
          reasoning:
            seasonalFallbackReasoning(
              event,
              season,
              Boolean(
                weather.forecastUnavailableForDate,
              ),
            ),
          season,
          eventMonthYear:
            formatMonthYear(event.eventDate),
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

      const forecast = weather.forecast;
      const season = getSeason(
        event.eventDate,
        weather.location.latitude,
      );

      const synchronizedKeywords =
        weatherKeywords(
          event.keywords,
          forecast.temp_c,
          forecast.condition,
        );

      const recommendations = findBestItems(
        closetItems,
        synchronizedKeywords,
        1,
        CITY_EVENT_EXCLUSIONS,
      );

      const topItem = recommendations[0];

      return {
        id: event.id,
        eventName: event.name,
        summary: event.name,
        title: event.name,
        location: event.city,
        date:
          formatEventDate(event.eventDate) +
          ' • ' +
          formatEventTime(event.eventDate),
        startDateTime:
          event.eventDate.toISOString(),
        weatherForecast:
          forecast.temp_c +
          '°C (' +
          forecast.temp_f +
          '°F) | ' +
          forecast.condition +
          ' | ' +
          forecast.precipitation_probability +
          '% precipitation',
        reasoning: buildWeatherReasoning({
          city:
            weather.location.city ||
            event.city,
          eventDate: event.eventDate,
          season,
          tempC: forecast.temp_c,
          tempF: forecast.temp_f,
          feelsLikeC:
            forecast.feels_like_c,
          condition: forecast.condition,
          precipitation:
            forecast.precipitation_probability,
          windKph: forecast.wind_kph,
        }),
        season,
        eventMonthYear:
          formatMonthYear(event.eventDate),
        weatherForecastTime:
          forecast.forecast_time,
        styleKeywords:
          synchronizedKeywords.slice(0, 5),
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

/**
 * SkoMiDora Event/Weather Synchronization Repair
 *
 * Updates exactly three files:
 *   1. src/app/actions/get-weather.ts
 *   2. src/app/actions/get-calendar-data.ts
 *   3. src/app/upcoming-events/page.tsx
 *
 * Safety:
 *   - Requires a clean Git working tree.
 *   - Creates a backup branch.
 *   - Copies original files to /tmp.
 *   - Runs npm build.
 *   - Restores all three files automatically if the build fails.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = process.cwd();

const weatherPath = path.join(
  root,
  'src/app/actions/get-weather.ts',
);

const calendarPath = path.join(
  root,
  'src/app/actions/get-calendar-data.ts',
);

const pagePath = path.join(
  root,
  'src/app/upcoming-events/page.tsx',
);

const requiredFiles = [
  weatherPath,
  calendarPath,
  pagePath,
];

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  });
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    fail(`Required file does not exist: ${file}`);
  }
}

const gitStatus = run('git', [
  'status',
  '--porcelain',
]).trim();

if (gitStatus) {
  console.error(
    'The Git working tree is not clean:\n',
  );
  console.error(gitStatus);
  fail(
    'Commit, stash, or restore existing changes before running this script.',
  );
}

const originalFiles = new Map(
  requiredFiles.map(file => [
    file,
    fs.readFileSync(file, 'utf8'),
  ]),
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const backupDirectory =
  `/tmp/skomidora-weather-sync-${timestamp}`;

fs.mkdirSync(backupDirectory, {
  recursive: true,
});

for (const file of requiredFiles) {
  fs.copyFileSync(
    file,
    path.join(backupDirectory, path.basename(file)),
  );
}

const backupBranch =
  `backup/pre-event-weather-sync-${timestamp}`;

run('git', ['branch', backupBranch]);

console.log(`Backup branch: ${backupBranch}`);
console.log(`File backup: ${backupDirectory}`);

const weatherFile = String.raw`'use server';

type ForecastEntry = {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    description: string;
  }>;
  wind?: {
    speed?: number;
  };
  pop?: number;
};

type ForecastApiResponse = {
  list?: ForecastEntry[];
  city?: {
    name?: string;
    country?: string;
    timezone?: number;
    coord?: {
      lat?: number;
      lon?: number;
    };
  };
};

type ForecastResult =
  | {
      success: true;
      forecast: {
        temp_c: number;
        temp_f: number;
        feels_like_c: number;
        feels_like_f: number;
        condition: string;
        humidity: number;
        wind_kph: number;
        precipitation_probability: number;
        forecast_time: string;
      };
      location: {
        city: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        timezone_offset_seconds: number;
      };
    }
  | {
      success: false;
      error: string;
      forecastUnavailableForDate?: boolean;
    };

function toFahrenheit(tempC: number): number {
  return Math.round((tempC * 9) / 5 + 32);
}

function closestForecast(
  entries: ForecastEntry[],
  targetDate: Date,
): ForecastEntry {
  const targetTime = targetDate.getTime();

  return entries.reduce((closest, entry) => {
    const entryDifference = Math.abs(
      entry.dt * 1000 - targetTime,
    );

    const closestDifference = Math.abs(
      closest.dt * 1000 - targetTime,
    );

    return entryDifference < closestDifference
      ? entry
      : closest;
  });
}

function targetIsInsideForecastWindow(
  entries: ForecastEntry[],
  targetDate: Date,
): boolean {
  const forecastTimes = entries
    .map(entry => entry.dt * 1000)
    .sort((a, b) => a - b);

  const firstForecast = forecastTimes[0];
  const lastForecast =
    forecastTimes[forecastTimes.length - 1];

  const allowance = 6 * 60 * 60 * 1000;
  const targetTime = targetDate.getTime();

  return (
    targetTime >= firstForecast - allowance &&
    targetTime <= lastForecast + allowance
  );
}

export async function getWeatherForLocation(
  location: string,
  targetDate: Date | string = new Date(),
): Promise<ForecastResult> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'OpenWeather API key is missing',
    };
  }

  const normalizedLocation = String(location || '').trim();

  if (!normalizedLocation) {
    return {
      success: false,
      error: 'Event location is missing',
    };
  }

  const eventDate =
    targetDate instanceof Date
      ? targetDate
      : new Date(targetDate);

  if (Number.isNaN(eventDate.getTime())) {
    return {
      success: false,
      error: 'Event date is invalid',
    };
  }

  try {
    const url =
      'https://api.openweathermap.org/data/2.5/forecast' +
      '?q=' +
      encodeURIComponent(normalizedLocation) +
      '&appid=' +
      encodeURIComponent(apiKey) +
      '&units=metric';

    const response = await fetch(url, {
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(
        'OpenWeather forecast returned status ' +
          response.status,
      );
    }

    const data =
      (await response.json()) as ForecastApiResponse;

    if (
      !Array.isArray(data.list) ||
      data.list.length === 0
    ) {
      throw new Error(
        'OpenWeather returned no forecast entries',
      );
    }

    if (
      !targetIsInsideForecastWindow(
        data.list,
        eventDate,
      )
    ) {
      return {
        success: false,
        error:
          'The event is outside the available OpenWeather forecast window',
        forecastUnavailableForDate: true,
      };
    }

    const selected = closestForecast(
      data.list,
      eventDate,
    );

    const tempC = Math.round(selected.main.temp);
    const feelsLikeC = Math.round(
      selected.main.feels_like,
    );

    return {
      success: true,
      forecast: {
        temp_c: tempC,
        temp_f: toFahrenheit(tempC),
        feels_like_c: feelsLikeC,
        feels_like_f:
          toFahrenheit(feelsLikeC),
        condition:
          selected.weather?.[0]?.description ||
          'conditions unavailable',
        humidity:
          Math.round(selected.main.humidity || 0),
        wind_kph: Math.round(
          (selected.wind?.speed || 0) * 3.6,
        ),
        precipitation_probability:
          Math.round((selected.pop || 0) * 100),
        forecast_time: new Date(
          selected.dt * 1000,
        ).toISOString(),
      },
      location: {
        city:
          data.city?.name || normalizedLocation,
        country: data.city?.country || '',
        latitude:
          data.city?.coord?.lat ?? null,
        longitude:
          data.city?.coord?.lon ?? null,
        timezone_offset_seconds:
          data.city?.timezone ?? 0,
      },
    };
  } catch (error) {
    console.error(
      'Failed to fetch OpenWeather forecast:',
      error,
    );

    return {
      success: false,
      error: 'Weather forecast unavailable',
    };
  }
}
`;

const calendarFile = String.raw`'use server';

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
`;

const oldPageBlock = `      if (calendarEvents.length > 0) {
        setEvents(calendarEvents);
      } else {
        const advice = await getUpcomingEventsStyleAdviceAction(items);
        setEvents(advice || []);
      }`;

const newPageBlock = `      const advice =
        await getUpcomingEventsStyleAdviceAction(
          items,
          calendarEvents,
        );

      setEvents(advice || []);`;

function restoreOriginalFiles() {
  for (const [file, contents] of originalFiles) {
    fs.writeFileSync(file, contents);
  }
}

try {
  const currentPage =
    fs.readFileSync(pagePath, 'utf8');

  if (!currentPage.includes(oldPageBlock)) {
    throw new Error(
      'The expected Calendar bypass block was not found in upcoming-events/page.tsx. No files were changed.',
    );
  }

  const updatedPage = currentPage.replace(
    oldPageBlock,
    newPageBlock,
  );

  fs.writeFileSync(weatherPath, weatherFile);
  fs.writeFileSync(calendarPath, calendarFile);
  fs.writeFileSync(pagePath, updatedPage);

  console.log('\nWrote synchronized weather service.');
  console.log('Wrote event enrichment action.');
  console.log('Wired Calendar events through enrichment.');

  const obsoleteCheck = spawnSync(
    'grep',
    [
      '-nE',
      'data/2\\.5/weather|live June|config\\.reasoning',
      weatherPath,
      calendarPath,
    ],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  if (obsoleteCheck.status === 0) {
    throw new Error(
      'Obsolete hardcoded logic remains:\n' +
        (obsoleteCheck.stdout || ''),
    );
  }

  if (obsoleteCheck.status !== 1) {
    throw new Error(
      'Unable to verify obsolete weather logic:\n' +
        (obsoleteCheck.stderr || ''),
    );
  }
} catch (error) {
  restoreOriginalFiles();
  fail(
    error instanceof Error
      ? error.message
      : String(error),
  );
}

const diffCheck = spawnSync(
  'git',
  ['diff', '--check'],
  {
    cwd: root,
    encoding: 'utf8',
  },
);

if (diffCheck.status !== 0) {
  restoreOriginalFiles();

  console.error(diffCheck.stdout || '');
  console.error(diffCheck.stderr || '');

  fail(
    'git diff --check failed. Original files restored.',
  );
}

console.log('\nRunning production build...\n');

const build = spawnSync(
  'npm',
  ['run', 'build'],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  },
);

if (build.status !== 0) {
  restoreOriginalFiles();

  console.error(
    '\nBuild failed. All three source files were restored.',
  );

  process.exit(build.status || 1);
}

console.log('\n======================================');
console.log('EVENT/WEATHER SYNC PATCH SUCCEEDED');
console.log('======================================');
console.log('');
console.log('Changed files:');
console.log('  src/app/actions/get-weather.ts');
console.log('  src/app/actions/get-calendar-data.ts');
console.log('  src/app/upcoming-events/page.tsx');
console.log('');
console.log('Backup branch:');
console.log(`  ${backupBranch}`);
console.log('');
console.log('File backups:');
console.log(`  ${backupDirectory}`);
console.log('');
console.log('Next: preview /upcoming-events.');
console.log('Do not commit until the cards are verified.');


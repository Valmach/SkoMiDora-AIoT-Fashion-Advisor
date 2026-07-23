'use server';

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

function destinationDateKey(
  timestampMs: number,
  timezoneOffsetSeconds: number,
): string {
  return new Date(
    timestampMs + timezoneOffsetSeconds * 1000,
  )
    .toISOString()
    .slice(0, 10);
}

function targetIsInsideForecastWindow(
  entries: ForecastEntry[],
  targetDate: Date,
  timezoneOffsetSeconds: number,
): boolean {
  const forecastTimes = entries
    .map(entry => entry.dt * 1000)
    .sort((a, b) => a - b);

  const firstForecast = forecastTimes[0];
  const lastForecast =
    forecastTimes[forecastTimes.length - 1];

  const allowance = 6 * 60 * 60 * 1000;
  const targetTime = targetDate.getTime();

  const exactTimestampIsAvailable =
    targetTime >= firstForecast - allowance &&
    targetTime <= lastForecast + allowance;

  const targetDay = destinationDateKey(
    targetTime,
    timezoneOffsetSeconds,
  );

  const firstForecastDay = destinationDateKey(
    firstForecast,
    timezoneOffsetSeconds,
  );

  const lastForecastDay = destinationDateKey(
    lastForecast,
    timezoneOffsetSeconds,
  );

  const destinationDayIsAvailable =
    targetDay >= firstForecastDay &&
    targetDay <= lastForecastDay;

  return (
    exactTimestampIsAvailable ||
    destinationDayIsAvailable
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
      cache: 'no-store',
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
        data.city?.timezone ?? 0,
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

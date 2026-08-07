'use server';

export type WeatherForecastResult =
  | {
      success: true;
      forecast: {
        temp_c: number;
        temp_f: number;
        feels_like_c: number;
        condition: string;
        wind_kph: number;
        precipitation_probability: number;
      };
      location: {
        latitude: number | null;
        longitude: number | null;
      };
    }
  | {
      success: false;
      error: string;
    };

function toFahrenheit(tempC: number): number {
  return Math.round((tempC * 9) / 5 + 32);
}

// Picks the forecast entry closest to the actual event date/time,
// instead of always returning "right now".
function closestForecastEntry(entries: any[], targetDate: Date) {
  const targetTime = targetDate.getTime();
  return entries.reduce((closest, entry) => {
    const entryDiff = Math.abs(entry.dt * 1000 - targetTime);
    const closestDiff = Math.abs(closest.dt * 1000 - targetTime);
    return entryDiff < closestDiff ? entry : closest;
  });
}

export async function getWeatherForLocation(
  location: string,
  targetDate: Date | string = new Date()
): Promise<WeatherForecastResult> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'OpenWeather API key is missing' };
  }

  const eventDate = targetDate instanceof Date ? targetDate : new Date(targetDate);
  if (Number.isNaN(eventDate.getTime())) {
    return { success: false, error: 'Event date is invalid' };
  }

  try {
    // Forecast endpoint (5 day / 3 hour steps) so we can match the actual
    // event date instead of only ever returning current conditions.
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`,
      {
        // Cache for 1 hour (3600 seconds) to protect your free tier limits
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenWeather responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.list) || data.list.length === 0) {
      throw new Error('OpenWeather returned no forecast entries');
    }

    const selected = closestForecastEntry(data.list, eventDate);
    const tempC = Math.round(selected.main.temp);
    const feelsLikeC = Math.round(selected.main.feels_like);

    return {
      success: true,
      forecast: {
        temp_c: tempC,
        temp_f: toFahrenheit(tempC),
        feels_like_c: feelsLikeC,
        condition: selected.weather?.[0]?.description || 'conditions unavailable',
        wind_kph: Math.round((selected.wind?.speed || 0) * 3.6),
        precipitation_probability: Math.round((selected.pop || 0) * 100),
      },
      location: {
        latitude: data.city?.coord?.lat ?? null,
        longitude: data.city?.coord?.lon ?? null,
      },
    };
  } catch (error) {
    console.error('Failed to fetch OpenWeather forecast:', error);
    return { success: false, error: 'Weather data unavailable' };
  }
}
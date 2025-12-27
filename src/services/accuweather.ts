"use server";

import axios from "axios";
import { parseISO, isSameDay } from "date-fns";

/**
 * ✅ INTERNAL TYPE DEFINITION
 * Defining this here avoids the 'Cannot find module' error (ts2307)
 * and satisfies the 'AccuWeatherSchema refers to a value' error (ts2749).
 */
export interface AccuWeatherType {
  temperature: number;
  condition: string;
  location?: string;
}

interface AccuWeatherLocationResponse {
  Key: string;
}

interface DailyForecast {
  Date: string;
  Temperature: {
    Maximum: {
      Value: number;
    };
  };
  Day: {
    IconPhrase: string;
  };
}

interface AccuWeatherForecastResponse {
  DailyForecasts: DailyForecast[];
}

const ACCUWEATHER_API_KEY = process.env.NEXT_PUBLIC_ACCUWEATHER_API_KEY;
const ACCUWEATHER_BASE_URL =
  process.env.NEXT_PUBLIC_ACCUWEATHER_API_BASE_URL ||
  "https://dataservice.accuweather.com";

/**
 * Fetches the current weather for a given location query.
 * @returns A promise that resolves to AccuWeatherType.
 */
export async function getCurrentWeather(
  locationQuery: string = "New York",
  eventDate?: string,
): Promise<AccuWeatherType> {
  console.warn(
    "ACCUWEATHER_INFO: The getCurrentWeather service was called. Returning data.",
  );

  const fallbackWeather: AccuWeatherType = {
    temperature: 18,
    condition: "Partly Cloudy (Mock Data)",
  };

  if (!ACCUWEATHER_API_KEY) {
    return fallbackWeather;
  }

  if (process.env.NODE_ENV !== "development" && !process.env.NEXT_PUBLIC_FORCE_WEATHER) {
    return { temperature: 18, condition: "Service Inactive" };
  }

  const locationParts = locationQuery.split(",").map((part) => part.trim());
  const simplifiedLocationQuery = locationParts[locationParts.length - 1];

  let locationKey = "";
  try {
    const locationResponse = await axios.get<AccuWeatherLocationResponse[]>(
      `${ACCUWEATHER_BASE_URL}/locations/v1/cities/search`,
      {
        params: {
          apikey: ACCUWEATHER_API_KEY,
          q: simplifiedLocationQuery,
        },
      },
    );

    if (locationResponse.data && locationResponse.data.length > 0) {
      locationKey = locationResponse.data[0].Key;
    } else {
      return {
        temperature: 0,
        condition: `Location "${simplifiedLocationQuery}" not found.`,
      };
    }
  } catch (error: any) {
    return fallbackWeather;
  }

  try {
    const forecastResponse = await axios.get<AccuWeatherForecastResponse>(
      `${ACCUWEATHER_BASE_URL}/forecasts/v1/daily/5day/${locationKey}`,
      {
        params: {
          apikey: ACCUWEATHER_API_KEY,
          metric: true, 
        },
      },
    );

    const forecasts = forecastResponse.data.DailyForecasts;
    if (!forecasts || forecasts.length === 0) {
      return { temperature: 0, condition: "Forecast data not available." };
    }

    let targetForecast = forecasts[0];

    if (eventDate) {
      try {
        const parsedEventDate = parseISO(eventDate);
        const matchedForecast = forecasts.find((f) =>
          isSameDay(parseISO(f.Date), parsedEventDate),
        );
        if (matchedForecast) targetForecast = matchedForecast;
      } catch (dateError) {
        console.error("Error parsing date", dateError);
      }
    }

    const finalWeather: AccuWeatherType = {
      temperature: Math.round(targetForecast.Temperature.Maximum.Value),
      condition: targetForecast.Day.IconPhrase,
    };

    return finalWeather;
  } catch (error: any) {
    return {
      temperature: 15,
      condition: `Weather data unavailable for ${locationQuery}`,
    };
  }
}
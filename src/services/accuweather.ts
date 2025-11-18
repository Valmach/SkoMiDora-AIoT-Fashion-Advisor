"use server";

/**
 * @fileOverview AccuWeather service for fetching current weather conditions.
 * @note This service is currently not in active use in the application as of the latest refactor.
 * The AI now infers weather conditions based on event location and date, reducing external API calls.
 * This file is kept for potential future use or for different features.
 */
import axios from "axios";
import { parseISO, isSameDay } from "date-fns";
import type { AccuWeatherSchema } from "@/types";

// Define the expected structure for the AccuWeather Location API response.

// Define the expected structure for the AccuWeather Current Conditions API response.

// Define the structure for the weather data returned by our service.

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
 * (Inactive) Fetches the current weather for a given location query.
 * It first finds the location key from AccuWeather and then fetches the current conditions.
 *
 * @param locationQuery A string describing the location (e.g., "London, UK").
 * @param eventDateTime The ISO string of the event's date and time (currently unused but good for future implementation).
 * @returns A promise that resolves to WeatherData, or mock data if the API call fails.
 */
export async function getCurrentWeather(
  locationQuery: string = "New York", // Default to a known location
  eventDate?: string, // Keep parameter for future compatibility
): Promise<AccuWeatherSchema> {
  console.warn(
    "ACCUWEATHER_INFO: The getCurrentWeather service was called, but it is currently inactive. Returning mock data.",
  );
  const fallbackWeather = {
    temperature: 18,
    condition: "Partly Cloudy (Mock Data)",
  };

  if (!ACCUWEATHER_API_KEY) {
    console.warn(
      "ACCUWEATHER_WARN: API key is not configured. Returning mock weather data.",
    );
    return fallbackWeather;
  }

  // The original logic is preserved below but will not be executed in the current flow.
  // This is to demonstrate how it would work if reactivated.
  if (process.env.NODE_ENV !== "development") {
    // A flag to prevent accidental runs
    return { temperature: 18, condition: "Service Inactive" };
  }

  // Simplify the location query to improve AccuWeather's matching success.
  // We'll take the last part of a comma-separated string, which is typically the city or most general location.
  const locationParts = locationQuery.split(",").map((part) => part.trim());
  const simplifiedLocationQuery = locationParts[locationParts.length - 1];
  console.log(
    `SKOMIDORA_ACCUWEATHER_SERVICE_INFO: Original location query was "${locationQuery}". Simplified to "${simplifiedLocationQuery}" for API call.`,
  );

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
      console.log(
        `SKOMIDORA_ACCUWEATHER_SERVICE_INFO: Found location key "${locationKey}" for "${simplifiedLocationQuery}".`,
      );
    } else {
      console.warn(
        `SKOMIDORA_ACCUWEATHER_SERVICE_WARN: No location found for query: "${simplifiedLocationQuery}".`,
      );
      return {
        temperature: 0,
        condition: `Weather N/A: Location "${simplifiedLocationQuery}" not found.`,
      };
    }
  } catch (error: any) {
    console.error(
      `SKOMIDORA_ACCUWEATHER_SERVICE_ERROR: Error fetching location key for "${simplifiedLocationQuery}":`,
      error.response?.data || error.message,
    );
    if (error.response?.status === 503) {
      return {
        temperature: 0,
        condition: "Weather Service is temporarily unavailable.",
      };
    }
    return fallbackWeather;
  }

  try {
    const forecastResponse = await axios.get<AccuWeatherForecastResponse>(
      `${ACCUWEATHER_BASE_URL}/forecasts/v1/daily/5day/${locationKey}`,
      {
        params: {
          apikey: ACCUWEATHER_API_KEY,
          metric: true, // Get temperature in Celsius
        },
      },
    );

    const forecasts = forecastResponse.data.DailyForecasts;
    if (!forecasts || forecasts.length === 0) {
      console.warn(
        `SKOMIDORA_ACCUWEATHER_SERVICE_WARN: No forecast data returned for location key: ${locationKey}.`,
      );
      return { temperature: 0, condition: "Forecast data not available." };
    }

    let targetForecast = forecasts[0]; // Default to today's forecast

    if (eventDate) {
      try {
        const parsedEventDate = parseISO(eventDate);
        const matchedForecast = forecasts.find((f) =>
          isSameDay(parseISO(f.Date), parsedEventDate),
        );

        if (matchedForecast) {
          targetForecast = matchedForecast;
          console.log(
            `SKOMIDORA_ACCUWEATHER_SERVICE_INFO: Matched event date to forecast for ${targetForecast.Date}.`,
          );
        } else {
          // If event is beyond 5-day forecast, use the last available day
          targetForecast = forecasts[forecasts.length - 1];
          console.log(
            `SKOMIDORA_ACCUWEATHER_SERVICE_INFO: Event date is beyond 5-day forecast. Using latest available forecast for ${targetForecast.Date}.`,
          );
        }
      } catch (dateError) {
        console.error(
          "SKOMIDORA_ACCUWEATHER_SERVICE_ERROR: Error parsing eventDate. Using default forecast.",
          dateError,
        );
        // Stick with the default targetForecast[0]
      }
    }

    const finalWeather: AccuWeatherSchema = {
      temperature: Math.round(targetForecast.Temperature.Maximum.Value),
      condition: targetForecast.Day.IconPhrase,
    };

    console.log(
      `SKOMIDORA_ACCUWEATHER_SERVICE_SUCCESS: Returning weather for ${locationQuery}:`,
      finalWeather,
    );
    return finalWeather;
  } catch (error: any) {
    console.error("ACCUWEATHER_ERROR: Failed to fetch weather data.", {
      query: locationQuery,
      errorMessage: error.message,
    });
    // Fallback to mock data in case of any error
    return {
      temperature: 15,
      condition: `Weather data unavailable for ${locationQuery}`,
    };
  }
}

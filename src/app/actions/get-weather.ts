'use server';

export async function getWeatherForLocation(location: string) {
  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    throw new Error('Weather API key is missing');
  }

  try {
    // Fetching a 3-day forecast to cover upcoming events
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`,
      {
        // Cache for 1 hour (3600 seconds) to avoid spamming the free tier
        next: { revalidate: 3600 } 
      }
    );

    if (!response.ok) {
      throw new Error(`WeatherAPI responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Extract exactly what your rule engine needs
    return {
      success: true,
      current: {
        temp_c: data.current.temp_c,
        temp_f: data.current.temp_f,
        condition: data.current.condition.text,
        is_day: data.current.is_day,
      },
      forecast: data.forecast.forecastday.map((day: any) => ({
        date: day.date,
        max_temp_c: day.day.maxtemp_c,
        min_temp_c: day.day.mintemp_c,
        condition: day.day.condition.text,
        chance_of_rain: day.day.daily_chance_of_rain,
      }))
    };

  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return { success: false, error: "Weather data unavailable" };
  }
}
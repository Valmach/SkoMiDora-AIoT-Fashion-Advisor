'use server';

export async function getWeatherForLocation(location: string) {
  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenWeather API key is missing');
  }

  try {
    // Hitting OpenWeather's current weather endpoint. Requesting metric units.
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`,
      {
        // Cache for 1 hour (3600 seconds) to protect your free tier limits
        next: { revalidate: 3600 } 
      }
    );

    if (!response.ok) {
      throw new Error(`OpenWeather responded with status: ${response.status}`);
    }

    const data = await response.json();

    // OpenWeather returns metric (Celsius). We calculate Fahrenheit to keep your data structure intact.
    const tempF = Math.round((data.main.temp * 9/5) + 32);

    return {
      success: true,
      current: {
        temp_c: Math.round(data.main.temp),
        temp_f: tempF,
        condition: data.weather[0].description, // Returns strings like "clear sky" or "light rain"
      },
      // OpenWeather's standard endpoint doesn't return a clean daily forecast in the same call.
      // Returning an empty array here ensures your UI/mapping logic doesn't crash looking for it.
      forecast: [] 
    };

  } catch (error) {
    console.error("Failed to fetch OpenWeather data:", error);
    return { success: false, error: "Weather data unavailable" };
  }
}
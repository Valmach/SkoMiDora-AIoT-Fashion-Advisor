'use server';

/**
 * FILE: src/app/actions/get-weather.ts
 * LOGIC: Open-Meteo Geocoding + Forecast
 */

export async function getCityWeather(cityName: string) {
  try {
    // 1. Convert City Name to Coordinates
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) return { temp: 20, condition: 'Clear' };

    const { latitude, longitude } = geoData.results[0];

    // 2. Fetch current weather from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    const current = weatherData.current_weather;
    
    // Map codes to posh condition names
    const interpretCondition = (code: number) => {
      if (code === 0) return 'Clear Skies';
      if (code <= 3) return 'Partly Cloudy';
      if (code >= 51 && code <= 67) return 'Rainy';
      return 'Overcast';
    };

    return {
      temp: Math.round(current.temperature),
      condition: interpretCondition(current.weathercode)
    };
  } catch (error) {
    console.error("Climate Sync Failed:", error);
    return { temp: 20, condition: 'Standard' };
  }
}
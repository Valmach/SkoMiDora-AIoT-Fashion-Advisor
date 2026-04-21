'use server';

import { getWeatherForLocation } from './get-weather';

// Helper to find the best item from the closet based on multiple keyword matches
function findBestItems(items: any[], keywords: string[], limit: number = 3) {
  const scored = items.map(item => {
    let score = 0;
    const itemData = JSON.stringify(item).toLowerCase();
    keywords.forEach(kw => {
      if (itemData.includes(kw.toLowerCase())) score++;
    });
    return { ...item, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getUpcomingEventsStyleAdviceAction(closetItems: any[]) {
  // 1. Define specific city "Vibe" keywords updated for Spring 2026
  const cityConfigs = [
    {
      name: "Paris Fashion Week",
      city: "Paris, France",
      date: "Apr 22, 2026 • 9:00 AM",
      keywords: ["leather", "wide-leg", "silk", "chic", "tweed", "square-toe", "beret", "foulard"],
      reasoning: "Paris spring fashion is embracing 'Sporty Chic' with wide-leg silhouettes. Layering a light tweed blazer over silk is essential for transitioning from brisk mornings to clear afternoon skies. Perfect time to break out Gabriela Hearst-inspired pieces."
    },
    {
      name: "Oslo Spring Summit",
      city: "Oslo, Norway",
      date: "Apr 24, 2026 • 11:30 AM",
      keywords: ["wool", "cashmere", "trench", "boots", "thermal", "burgundy", "alpaca", "knitwear"],
      reasoning: "Oslo requires smart Scandi-style layering. The snow is melting, but you still need your burgundy knits and cashmere wraps. Pair a robust trench coat with sturdy leather boots."
    },
    {
      name: "Rome Cultural Tour",
      city: "Rome, Italy",
      date: "Apr 26, 2026 • 6:00 PM",
      keywords: ["silk", "velvet", "leather boots", "emerald", "trench", "platform", "cardigan"],
      reasoning: "Italian spring style right now is about 'Royal Luxury'—velvet textures and emerald tones. Pair with Manolo Blahnik-style platform booties to stay chic while walking the historic streets."
    }
  ];

  // 2. Fetch live OpenWeather data concurrently and map recommendations
  const eventsWithWeather = await Promise.all(cityConfigs.map(async (config) => {
    
    // Hit the OpenWeather action we built earlier
    const weatherData = await getWeatherForLocation(config.city);
    
    let liveWeatherString = "Weather data unavailable";
    if (weatherData.success && weatherData.current) {
      liveWeatherString = `${weatherData.current.temp_c}°C (${weatherData.current.temp_f}°F) | ${weatherData.current.condition}`;
    }

    const recommendations = findBestItems(closetItems, config.keywords, 1);
    const topItem = recommendations[0];

    return {
      eventName: config.name,
      date: config.date,
      weatherForecast: liveWeatherString, // Replaces the old hardcoded weather with live API data!
      reasoning: config.reasoning,
      styleKeywords: config.keywords.slice(0, 5),
      suggestedItemName: topItem?.itemName || "Classic Trench Coat",
      suggestedItemImage: topItem?.imageUrl || null
    };
  }));

  return eventsWithWeather;
}
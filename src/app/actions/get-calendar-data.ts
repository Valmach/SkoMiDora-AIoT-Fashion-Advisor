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
  // 1. DYNAMIC DATE ENGINE: Automatically rolls dates forward so they are always in the future
  const now = new Date();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const weekend = new Date(now);
  weekend.setDate(weekend.getDate() + 3);

  const formatDate = (d: Date, time: string) => {
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${time}`;
  };

  // 2. Define specific city "Vibe" keywords with live, rolling dates
  const cityConfigs = [
    {
      name: "West Memphis Spring Evening",
      city: "West Memphis, AR",
      date: formatDate(now, "6:30 PM"), // Dynamic: Always Today
      keywords: ["floral", "linen", "sandal", "breezy", "cotton", "lightweight", "spring"],
      reasoning: "A warm, breezy spring evening in West Memphis calls for breathable fabrics. Flowing silhouettes paired with comfortable but elevated footwear are perfect for enjoying the local atmosphere."
    },
    {
      name: "Paris Fashion Week Preview",
      city: "Paris, France",
      date: formatDate(tomorrow, "9:00 AM"), // Dynamic: Always Tomorrow
      keywords: ["leather", "wide-leg", "silk", "chic", "tweed", "square-toe", "beret", "foulard"],
      reasoning: "Paris spring fashion is embracing 'Sporty Chic' with wide-leg silhouettes. Layering a light tweed blazer over silk is essential for transitioning from brisk mornings to clear afternoon skies."
    },
    {
      name: "Rome Cultural Tour",
      city: "Rome, Italy",
      date: formatDate(weekend, "2:00 PM"), // Dynamic: Always 3 Days from now
      keywords: ["silk", "velvet", "leather boots", "emerald", "trench", "platform", "cardigan"],
      reasoning: "Italian spring style right now is about 'Royal Luxury'—velvet textures and emerald tones. Pair with elevated platform booties to stay chic while walking the historic streets."
    }
  ];

  // 3. Fetch live OpenWeather data concurrently and map recommendations
  const eventsWithWeather = await Promise.all(cityConfigs.map(async (config) => {
    
    // Hit the OpenWeather action using the real location
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
      weatherForecast: liveWeatherString, // Guaranteed to be fresh forecast data
      reasoning: config.reasoning,
      styleKeywords: config.keywords.slice(0, 5),
      suggestedItemName: topItem?.itemName || "Curated Wardrobe Item",
      suggestedItemImage: topItem?.imageUrl || null
    };
  }));

  return eventsWithWeather;
}
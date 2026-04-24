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
  // 1. DYNAMIC DATE ENGINE
  const now = new Date();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const weekend = new Date(now);
  weekend.setDate(weekend.getDate() + 3);

  const formatDate = (d: Date, time: string) => {
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${time}`;
  };

  // 2. Define specific city "Vibe" keywords with EXPLICIT Landmark Backgrounds
  const cityConfigs = [
    {
      name: "Paris Fashion Week",
      city: "Paris, France",
      date: formatDate(now, "9:00 AM"), 
      keywords: ["leather", "wide-leg", "silk", "chic", "tweed", "square-toe", "beret", "foulard"],
      reasoning: "Paris spring fashion is embracing 'Sporty Chic' with wide-leg silhouettes. Layering a light tweed blazer over silk is essential for transitioning from brisk mornings to clear afternoon skies.",
      // Iconic Eiffel Tower 
      cityBg: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Oslo Spring Summit",
      city: "Oslo, Norway",
      date: formatDate(tomorrow, "11:30 AM"), 
      keywords: ["wool", "cashmere", "trench", "boots", "thermal", "burgundy", "alpaca", "knitwear"],
      reasoning: "Oslo requires smart Scandi-style layering. The snow is melting, but you still need your burgundy knits and cashmere wraps. Pair a robust trench coat with sturdy leather boots.",
      // Oslo Cityscape
      cityBg: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Rome Cultural Tour",
      city: "Rome, Italy",
      date: formatDate(weekend, "6:00 PM"), 
      keywords: ["silk", "velvet", "leather boots", "emerald", "trench", "platform", "cardigan"],
      reasoning: "Italian spring style right now is about 'Royal Luxury'—velvet textures and emerald tones. Pair with elevated platform booties to stay chic while walking the historic streets.",
      // The Colosseum
      cityBg: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop"
    }
  ];

  // 3. Fetch live OpenWeather data concurrently and map recommendations
  const eventsWithWeather = await Promise.all(cityConfigs.map(async (config) => {
    
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
      weatherForecast: liveWeatherString, 
      reasoning: config.reasoning,
      styleKeywords: config.keywords.slice(0, 5),
      suggestedItemName: topItem?.itemName || "Curated Wardrobe Item",
      suggestedItemImage: topItem?.imageUrl || null,
      cityBg: config.cityBg // Passes the explicit landmark image to the frontend
    };
  }));

  return eventsWithWeather;
}
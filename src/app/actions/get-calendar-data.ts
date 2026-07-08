'use server';

import { getWeatherForLocation } from './get-weather';

// Helper to find the best item from the closet based on multiple keyword matches
function findBestItems(
  items: any[],
  keywords: string[],
  limit: number = 3,
  excludedKeywords: string[] = [],
) {
  const scored = items
    .filter(item => {
      const itemData = JSON.stringify(item).toLowerCase();

      return !excludedKeywords.some(keyword =>
        itemData.includes(keyword.toLowerCase())
      );
    })
    .map(item => {
      let score = 0;
      const itemData = JSON.stringify(item).toLowerCase();

      keywords.forEach(keyword => {
        if (itemData.includes(keyword.toLowerCase())) {
          score++;
        }
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
      name: "Paris Summer Fashion Event",
      city: "Paris, France",
      date: formatDate(now, "9:00 AM"), 
      keywords: ["leather", "wide-leg", "silk", "chic", "tweed", "square-toe", "beret", "foulard"],
      reasoning: "Paris summer styling should prioritize breathable city polish: silk, cotton, linen, lightweight tailoring, dresses, skirts, loafers, flats, mules, refined sneakers, and event-appropriate heels. Avoid winter layers and swimwear for ordinary city events.",
      // Iconic Eiffel Tower 
      cityBg: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Oslo Summer Summit",
      city: "Oslo, Norway",
      date: formatDate(tomorrow, "11:30 AM"), 
      keywords: ["linen", "cotton", "silk", "shirt", "blouse", "trousers", "skirt", "sandal", "loafer", "mule", "lightweight", "tailored"],
      reasoning: "Oslo is being styled for live June weather. Prioritize breathable tailoring, lightweight shirts, refined trousers, skirts, loafers, mules, or sandals. Avoid boots, heavy coats, cashmere wraps, thermal layers, and winter-weight outerwear when temperatures are warm.",
      // Oslo Cityscape
      cityBg: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Rome Cultural Tour",
      city: "Rome, Italy",
      date: formatDate(weekend, "6:00 PM"), 
      keywords: ["linen", "silk", "dress", "skirt", "shorts", "tailored", "sandal", "mule", "loafer", "flat", "sleeveless", "halter"],
      reasoning: "Rome is being styled for hot Mediterranean summer. Prioritize linen, silk, lightweight dresses, skirts, refined shorts, resort pieces, sandals, mules, and breathable evening polish. Avoid boots, trenches, heavy knits, and winter-weight layering in high heat.",
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

    const cityEventExclusions = [
      "bikini",
      "swimwear",
      "swimsuit",
      "swim suit",
      "bathing suit",
      "beachwear",
      "poolwear",
      "pool wear",
      "cover-up",
      "coverup",
    ];

    const recommendations = findBestItems(
      closetItems,
      config.keywords,
      1,
      cityEventExclusions,
    );
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
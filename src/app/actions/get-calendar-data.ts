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

// Builds Stylist Notes from the ACTUAL fetched weather, instead of a
// hardcoded per-city string. This is the piece that was previously static
// and out of sync with the live temperature shown on the card.
function buildForecastReasoning(input: {
  cityLabel: string;
  tempC: number;
  condition: string;
  precipitationChance: number;
  windKph: number;
}): string {
  let clothingAdvice: string;

  if (input.tempC >= 27) {
    clothingAdvice =
      "Prioritize breathable linen, cotton, silk, lightweight dresses, refined separates, sandals, mules, and warm-weather footwear.";
  } else if (input.tempC >= 19) {
    clothingAdvice =
      "Prioritize breathable tailoring, lightweight shirts, dresses, refined trousers or skirts, loafers, flats, or mules.";
  } else if (input.tempC >= 12) {
    clothingAdvice =
      "Use light layering: tailored trousers, shirts, knitwear, a blazer or light jacket, and closed-toe footwear.";
  } else {
    clothingAdvice =
      "Use warm structured layers, insulated outerwear, knitwear, and weather-appropriate closed footwear. Avoid sandals, mules, and lightweight linen pieces.";
  }

  const adjustments: string[] = [];

  if (/\b(rain|drizzle|storm|snow)\b/i.test(input.condition) || input.precipitationChance >= 45) {
    adjustments.push("Add a water-resistant layer and weather-tolerant footwear.");
  }

  if (input.windKph >= 25) {
    adjustments.push("Favor secure layers and garments that hold their shape in the wind.");
  }

  if (input.tempC >= 24) {
    adjustments.push("Avoid heavy coats, thermal layers, cashmere wraps, and winter-weight outerwear.");
  } else if (input.tempC < 8) {
    adjustments.push("Avoid lightweight linen, sandals, and warm-weather resort pieces.");
  }

  return (
    `${input.cityLabel} is being styled for the live forecast: ${input.tempC}°C, ${input.condition}. ` +
    clothingAdvice +
    (adjustments.length ? ` ${adjustments.join(" ")}` : "")
  );
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

  // 2. Define specific city "Vibe" keywords with EXPLICIT Landmark Backgrounds.
  //    NOTE: `reasoning` is no longer defined here — it's generated below from
  //    the live weather fetch, using `dateObj` to match the right forecast window.
  const cityConfigs = [
    {
      name: "Paris Fashion Week",
      city: "Paris, France",
      dateObj: now,
      date: formatDate(now, "9:00 AM"), 
      keywords: ["leather", "wide-leg", "silk", "chic", "tweed", "square-toe", "beret", "foulard"],
      // Iconic Eiffel Tower 
      cityBg: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Oslo Spring Summit",
      city: "Oslo, Norway",
      dateObj: tomorrow,
      date: formatDate(tomorrow, "11:30 AM"), 
      keywords: ["linen", "cotton", "silk", "shirt", "blouse", "trousers", "skirt", "sandal", "loafer", "mule", "lightweight", "tailored", "blazer", "cardigan", "coat", "sweater", "boots"],
      // Oslo Cityscape
      cityBg: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop"
    },
    {
      name: "Rome Cultural Tour",
      city: "Rome, Italy",
      dateObj: weekend,
      date: formatDate(weekend, "6:00 PM"), 
      keywords: ["linen", "silk", "dress", "skirt", "shorts", "swimwear", "resort", "sandal", "mule", "slide", "sleeveless", "halter"],
      // The Colosseum
      cityBg: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop"
    }
  ];

  // 3. Fetch live OpenWeather forecast (matched to each event's actual date)
  //    concurrently, and build reasoning FROM that same fetched data so the
  //    Stylist Notes text can never drift out of sync with the temperature badge.
  const eventsWithWeather = await Promise.all(cityConfigs.map(async (config) => {
    
    const weatherResult = await getWeatherForLocation(config.city, config.dateObj);
    
    let liveWeatherString = "Weather data unavailable";
    let reasoning = `${config.name} styling will update once live weather data is available for ${config.city}.`;

    if (weatherResult.success) {
      const { temp_c, temp_f, condition, precipitation_probability, wind_kph } = weatherResult.forecast;
      liveWeatherString = `${temp_c}°C (${temp_f}°F) | ${condition}`;
      reasoning = buildForecastReasoning({
        cityLabel: config.name,
        tempC: temp_c,
        condition,
        precipitationChance: precipitation_probability,
        windKph: wind_kph,
      });
    }

    const recommendations = findBestItems(closetItems, config.keywords, 1);
    const topItem = recommendations[0];

    return {
      eventName: config.name,
      date: config.date,
      weatherForecast: liveWeatherString, 
      reasoning,
      styleKeywords: config.keywords.slice(0, 5),
      suggestedItemName: topItem?.itemName || "Curated Wardrobe Item",
      suggestedItemImage: topItem?.imageUrl || null,
      cityBg: config.cityBg // Passes the explicit landmark image to the frontend
    };
  }));

  return eventsWithWeather;
}
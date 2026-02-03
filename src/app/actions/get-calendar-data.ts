'use server';

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
  // 1. Define specific city "Vibe" keywords based on Winter 2026 trends
  const cityConfigs = [
    {
      name: "Paris Fashion Week",
      city: "Paris, France",
      date: "Jan 24, 2026",
      weather: "4°C - 10°C | Foggy morning, clear afternoon",
      keywords: ["leather", "wide-leg", "fur", "chic", "tweed", "square-toe", "beret", "foulard"],
      reasoning: "Paris is embracing 'Sporty Chic' with wide-leg silhouettes and faux-fur trims. Layering a leather jacket or a tweed blazer is essential for the transition from foggy mornings to afternoon clearings."
    },
    {
      name: "Oslo Winter Summit",
      city: "Oslo, Norway",
      date: "Jan 26, 2026",
      weather: "-5°C - 1°C | Heavy snow expected",
      keywords: ["wool", "cashmere", "puffer", "boots", "thermal", "burgundy", "alpaca", "knitwear"],
      reasoning: "Oslo requires heavy-duty Scandi-style layering. Prioritize your burgundy knits and cashmere wraps. Pair your most robust wool coat with tall boots to handle the deep snow."
    },
    {
      name: "Rome Cultural Tour",
      city: "Rome, Italy",
      date: "Jan 28, 2026",
      weather: "6°C - 12°C | Scattered rain",
      keywords: ["silk", "velvet", "leather boots", "emerald", "trench", "platform", "cardigan"],
      reasoning: "Italian winter style right now is about 'Royal Luxury'—velvet textures and emerald tones. Since it's rainy, tall leather boots or platform booties are your best bet to stay dry while looking polished."
    }
  ];

  // 2. Map each event to a selection of items from your 108-item closet
  return cityConfigs.map(config => {
    const recommendations = findBestItems(closetItems, config.keywords, 1);
    const topItem = recommendations[0];

    return {
      eventName: config.name,
      date: config.date,
      weatherForecast: config.weather,
      reasoning: config.reasoning,
      styleKeywords: config.keywords.slice(0, 5),
      suggestedItemName: topItem?.itemName || "Classic Winter Coat",
      suggestedItemImage: topItem?.imageUrl || null
    };
  });
}

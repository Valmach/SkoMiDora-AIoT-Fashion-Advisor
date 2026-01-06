'use server';

import { getCityWeather } from './get-weather';

export async function getCalendarDataAction(wardrobeItems: any[]) {
  const SERP_API_KEY = process.env.SERP_API_KEY;

  try {
    console.log(`🔍 AI Processing: ${wardrobeItems.length} items`);

    // 1. ROBUST SPLIT: Single Pass Loop (Fixes "Missing Clothing" Bug)
    const shoes: any[] = [];
    let clothing: any[] = [];
    
    // Define what "looks like a shoe"
    const footwearKeywords = ['shoe', 'boot', 'sandal', 'heel', 'pump', 'sneaker', 'loafer', 'flat', 'wedge', 'footwear', 'slippers', 'trainer', 'slide'];

    wardrobeItems.forEach(item => {
      const text = (item.itemType + " " + item.category + " " + item.itemName).toLowerCase();
      const isFootwear = footwearKeywords.some(k => text.includes(k));

      if (isFootwear) {
        shoes.push(item);
      } else {
        clothing.push(item);
      }
    });

    console.log(`📊 Split Result: ${shoes.length} Shoes | ${clothing.length} Clothing Items`);

    // ⚠️ EMERGENCY FALLBACK:
    // If we found NO clothes (maybe everything is labeled "shoe"?), use the shoes as clothes.
    // This prevents the "Gray Box" error.
    if (clothing.length === 0 && shoes.length > 0) {
      console.warn("⚠️ No clothing identified. Using shoes as fallback to prevent empty cards.");
      clothing = [...shoes];
    }

    // 2. MOCK EVENTS (Guarantees 3 cards even if API fails)
    let rawEvents = [
        { title: "London Design Week", address: ["London, UK"], event_id: "mock-1" },
        { title: "Vogue Fashion Night", address: ["Soho, London"], event_id: "mock-2" },
        { title: "Tech & Style Summit", address: ["Shoreditch"], event_id: "mock-3" }
    ];

    try {
      if (SERP_API_KEY) {
        const serpUrl = `https://serpapi.com/search.json?engine=google_events&q=Fashion+Events+London&api_key=${SERP_API_KEY}`;
        const response = await fetch(serpUrl, { next: { revalidate: 3600 } });
        const data = await response.json();
        if (data.events_results && data.events_results.length > 0) {
            rawEvents = data.events_results.slice(0, 3);
        }
      }
    } catch (e) { console.warn("API Error, using mocks."); }

    // 3. BUILD 3 CARDS
    const cards = await Promise.all(rawEvents.map(async (event: any, index: number) => {
      const city = event.address?.[0] || 'London';
      let climate = { temp: 15, condition: "Cloudy" };
      try { climate = await getCityWeather(city); } catch (e) {}

      // 🔄 MODULO SELECTION: Ensures we never run out of items.
      const shoeItem = shoes.length > 0 ? shoes[index % shoes.length] : null;
      const clothItem = clothing.length > 0 ? clothing[index % clothing.length] : null;

      // 🛡️ FINAL FALLBACK IMAGES
      const clothImg = clothItem?.imageUrl || "https://placehold.co/400x600/2a2a2a/FFF?text=Add+Clothing";
      const shoeImg = shoeItem?.imageUrl || "https://placehold.co/400x600/2a2a2a/FFF?text=Add+Shoes";

      return {
        id: event.event_id || `rec-${index}`,
        title: event.title,
        location: city,
        temp: climate.temp || 15,
        condition: climate.condition || "Good",
        
        // Pass full names for Text-to-Speech readability
        clothingName: clothItem?.itemName || "Signature Look",
        clothingImageUrl: clothImg,
        
        footwearName: shoeItem?.itemName || "Statement Pair",
        footwearImageUrl: shoeImg,
        
        reasoning: `Curated for ${event.title} in ${city}.`
      };
    }));

    return cards;

  } catch (error) {
    console.error("❌ CRITICAL ERROR:", error);
    return [];
  }
}
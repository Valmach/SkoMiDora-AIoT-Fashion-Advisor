'use server';

import { getCityWeather } from './get-weather';

export async function getCalendarDataAction(wardrobeItems: any[]) {
  const SERP_API_KEY = process.env.SERP_API_KEY;

  try {
    console.log("🔍 AI Stylist: Fetching events...");
    
    // 1. Try Fetching Real Data
    let rawEvents = [];
    try {
      if (SERP_API_KEY) {
        const serpUrl = `https://serpapi.com/search.json?engine=google_events&q=Fashion+Events+London&api_key=${SERP_API_KEY}`;
        const response = await fetch(serpUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
        const data = await response.json();
        rawEvents = data.events_results || [];
      }
    } catch (apiError) {
      console.warn("⚠️ API Failed, using Mock Data:", apiError);
    }

    // 2. MOCK FALLBACK: If API failed or returned 0 events, use fake data
    // This guarantees the grid NEVER breaks.
    if (rawEvents.length === 0) {
      console.log("⚠️ Using Mock Events for UI Testing");
      rawEvents = [
        { title: "London Fashion Week Opening", address: ["London, UK"], event_id: "mock-1" },
        { title: "Vogue Networking Night", address: ["Soho, London"], event_id: "mock-2" },
        { title: "Sustainable Style Gala", address: ["Shoreditch, London"], event_id: "mock-3" }
      ];
    }

    // 3. Process Events
    return await Promise.all(
      rawEvents.slice(0, 3).map(async (event: any, index: number) => {
        const city = event.address?.[0] || 'London';
        
        // Use default weather if API fails
        let climate = { temp: 15, condition: "Cloudy" }; 
        try {
           climate = await getCityWeather(city);
        } catch (e) { /* ignore weather error */ }

        // Filter Wardrobe
        const shoes = wardrobeItems.filter(i => 
          i.itemType?.toLowerCase().includes('shoe') || i.category?.toLowerCase().includes('footwear')
        );
        const clothing = wardrobeItems.filter(i => 
          !i.itemType?.toLowerCase().includes('shoe') && !i.category?.toLowerCase().includes('footwear')
        );

        // Safe Selection
        const selectedShoe = shoes.length > 0 ? shoes[index % shoes.length] : null;
        const selectedOutfit = clothing.length > 0 ? clothing[index % clothing.length] : null;

        return {
          id: event.event_id || `rec-${index}`,
          title: event.title,
          location: city,
          temp: climate.temp || 15,
          condition: climate.condition || "Moderate",
          
          clothingName: selectedOutfit?.itemName || "Signature Look",
          // Use the secure URL we generated earlier
          clothingImageUrl: selectedOutfit?.imageUrl || "", 
          
          footwearName: selectedShoe?.itemName || "Statement Shoes",
          footwearImageUrl: selectedShoe?.imageUrl || "",
          
          reasoning: `Curated for ${event.title}.`
        };
      })
    );
  } catch (error) {
    console.error("❌ Critical AI Error:", error);
    // Return empty array only if absolutely everything explodes
    return [];
  }
}
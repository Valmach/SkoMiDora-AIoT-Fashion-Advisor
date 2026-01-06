'use server';

import { getCityWeather } from './get-weather';

export async function getCalendarDataAction(wardrobeItems: any[]) {
  const SERP_API_KEY = process.env.SERP_API_KEY;

  try {
    console.log(`🔍 AI Stylist: Received ${wardrobeItems.length} items.`);

    // 1. IMPROVED FILTER LOGIC
    // We explicitly define "Footwear" and treat EVERYTHING else as "Clothing"
    // This ensures dresses, tops, accessories, etc. are never ignored.
    const footwearKeywords = ['shoe', 'boot', 'sandal', 'heel', 'pump', 'sneaker', 'loafer', 'flat', 'wedge', 'footwear'];
    
    const shoes = wardrobeItems.filter(item => {
      const type = (item.itemType || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const name = (item.itemName || "").toLowerCase();
      return footwearKeywords.some(k => type.includes(k) || cat.includes(k) || name.includes(k));
    });

    // 🏆 "Non-Shoes" = Clothing (Simple and safe)
    const clothing = wardrobeItems.filter(item => !shoes.includes(item));

    console.log(`📊 Split: ${shoes.length} Shoes, ${clothing.length} Clothing items.`);

    // 2. Fetch Events (Real or Mock)
    let rawEvents = [];
    try {
      if (SERP_API_KEY) {
        const serpUrl = `https://serpapi.com/search.json?engine=google_events&q=Fashion+Events+London&api_key=${SERP_API_KEY}`;
        const response = await fetch(serpUrl, { next: { revalidate: 3600 } }); 
        const data = await response.json();
        rawEvents = data.events_results || [];
      }
    } catch (apiError) {
      console.warn("⚠️ API Failed, using Mock Data");
    }

    // Mock Fallback
    if (rawEvents.length === 0) {
      rawEvents = [
        { title: "London Fashion Week Opening", address: ["London, UK"], event_id: "mock-1" },
        { title: "Vogue Networking Night", address: ["Soho, London"], event_id: "mock-2" },
        { title: "Sustainable Style Gala", address: ["Shoreditch, London"], event_id: "mock-3" }
      ];
    }

    // 3. Match Events to Outfits
    return await Promise.all(
      rawEvents.slice(0, 3).map(async (event: any, index: number) => {
        const city = event.address?.[0] || 'London';
        
        let climate = { temp: 15, condition: "Cloudy" }; 
        try {
           climate = await getCityWeather(city);
        } catch (e) { /* ignore */ }

        // 🏆 CYCLICAL SELECTION
        // If you only have 1 dress, it will use it for all 3 events (instead of leaving 2 blank)
        const selectedShoe = shoes.length > 0 ? shoes[index % shoes.length] : null;
        const selectedOutfit = clothing.length > 0 ? clothing[index % clothing.length] : null;

        return {
          id: event.event_id || `rec-${index}`,
          title: event.title,
          location: city,
          temp: climate.temp || 15,
          condition: climate.condition || "Moderate",
          
          // 🛡️ DISPLAY LOGIC
          clothingName: selectedOutfit?.itemName || "Signature Look",
          clothingImageUrl: selectedOutfit?.imageUrl || "https://placehold.co/400x600?text=No+Clothing+Found", 
          
          footwearName: selectedShoe?.itemName || "Statement Shoes",
          footwearImageUrl: selectedShoe?.imageUrl || "https://placehold.co/400x600?text=No+Shoes+Found",
          
          reasoning: `Curated for ${event.title} in ${city}.`
        };
      })
    );
  } catch (error) {
    console.error("❌ Critical AI Error:", error);
    return [];
  }
}
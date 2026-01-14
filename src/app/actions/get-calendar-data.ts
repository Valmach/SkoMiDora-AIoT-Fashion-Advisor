'use server';

import { db } from "@/lib/firebase-admin";

// 🛠️ HELPER: Hunts for any image field in your database
function extractImage(item: any): string {
  if (!item) return "";
  return item.imageUrl || item.image || item.url || item.imagePath || item.mediaUrl || "";
}

// 🛠️ HELPER: Cleans Firestore data so Next.js doesn't crash
function sanitizeItem(doc: any) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    // Convert Firestore Timestamps to simple numbers
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : null,
  };
}

export async function getCalendarDataAction(providedItems?: any[]) {
  try {
    let closet = providedItems || [];

    // 1. Fallback: If no items passed, fetch fresh from Admin SDK
    if (closet.length === 0) {
      console.log("Action: Fetching fresh wardrobe from Firestore...");
      const snapshot = await db.collection('publicWardrobeItems').orderBy('createdAt', 'desc').get();
      closet = snapshot.docs.map(sanitizeItem);
    }

    console.log(`Action: Processing ${closet.length} items for Global Events.`);

    // 2. Define 3 Hardcoded Global Events
    const cityConfigs = [
      { name: "London", lat: 51.5, lon: -0.1, bg: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200" },
      { name: "New York", lat: 40.7, lon: -74.0, bg: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200" },
      { name: "Oslo", lat: 59.9, lon: 10.7, bg: "https://images.unsplash.com/photo-1513115044-a69999057223?q=80&w=1200" }
    ];

    // 3. Map Closet Items to Cities
    const recommendations = await Promise.all(cityConfigs.map(async (city, index) => {
      let temp = 15;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`);
        const w = await res.json();
        temp = Math.round(w.current_weather?.temperature || 15);
      } catch (e) { console.error("Weather fetch failed"); }

      // 🎯 WIRED: Pick distinct items from your closet
      // Use modulo to cycle through items if you have fewer than 3
      const clothingItem = closet[index % closet.length];
      
      // Try to find boots, or fallback to another item
      const footwearItem = closet.find(i => 
        (i.itemName || "").toLowerCase().includes("boot")
      ) || closet[(index + 3) % closet.length];

      return {
        id: `event-${index}`,
        city: city.name,
        cityBg: city.bg,
        temp: temp,
        
        // Mapped Data
        clothingName: clothingItem?.itemName || "Digital Closet Item",
        clothingImageUrl: extractImage(clothingItem) || "https://placehold.co/400x600?text=No+Image",
        
        footwearName: footwearItem?.itemName || "Matched Footwear",
        footwearImageUrl: extractImage(footwearItem) || "https://placehold.co/400x600?text=No+Image",
        
        reasoning: `Matched ${clothingItem?.itemName} to ${city.name} weather.`
      };
    }));

    return JSON.parse(JSON.stringify(recommendations));
  } catch (error) {
    console.error("Wiring Error:", error);
    return [];
  }
}
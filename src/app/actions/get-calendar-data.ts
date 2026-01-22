'use server';

import { z } from 'zod';

// Helper: Find the best item from the user's real closet
function findBestItem(items: any[], keywords: string[]) {
  if (!items || items.length === 0) return null;
  
  const match = items.find(item => {
    const name = (item.name || item.itemName || "").toLowerCase();
    const category = (item.category || "").toLowerCase();
    return keywords.some(k => name.includes(k) || category.includes(k));
  });

  return match || items[0];
}

export async function getUpcomingEventsStyleAdviceAction(closetItems: any[]) {
  // 1. Pick items for specific cities
  const parisItem = findBestItem(closetItems, ["leather", "jacket", "top", "chic", "black"]);
  const romaItem = findBestItem(closetItems, ["linen", "dress", "skirt", "sundress", "sandals", "white", "beige"]);
  const osloItem = findBestItem(closetItems, ["coat", "parka", "sweater", "wool", "warm", "scarf"]);

  // 2. Return Events (Paris, Roma, Oslo)
  return [
    {
      eventName: "Paris Fashion Week",
      date: "Feb 28, 2026 • 8:00 PM",
      weatherForecast: "Overcast, 12°C",
      reasoning: `Paris calls for effortless layers. Your ${parisItem?.name || "Leather Jacket"} is perfect for the Seine breeze and evening events.`,
      styleKeywords: ["Chic", "Edgy", "Layered"],
      suggestedItemName: parisItem?.name || "Statement Piece",
      suggestedItemImage: parisItem?.imageUrl || parisItem?.image || null
    },
    {
      eventName: "Roma Weekend",
      date: "Mar 15, 2026 • 10:00 AM",
      weatherForecast: "Sunny, 24°C",
      // ✅ FIX: Reasoning now matches Roma (Cobblestones/Sun), not NYC (Skyline/Lights)
      reasoning: `The Eternal City demands 'La Dolce Vita' style. This ${romaItem?.name || "Breezy Look"} is ideal for walking cobblestone streets in the warm sun.`,
      styleKeywords: ["Romantic", "Mediterranean", "Classic"],
      suggestedItemName: romaItem?.name || "Day Wear",
      suggestedItemImage: romaItem?.imageUrl || romaItem?.image || null
    },
    {
      eventName: "Oslo Design Summit",
      date: "Apr 10, 2026 • 9:00 AM",
      weatherForecast: "Rainy, 8°C",
      reasoning: `Scandinavian minimalism meets practicality. Your ${osloItem?.name || "Wool Coat"} will keep you sharp, warm, and dry.`,
      styleKeywords: ["Minimalist", "Practical", "Sharp"],
      suggestedItemName: osloItem?.name || "Outerwear",
      suggestedItemImage: osloItem?.imageUrl || osloItem?.image || null
    }
  ];
}

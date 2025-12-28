'use server';

/**
 * FILE: src/app/actions/generate-outfit-for-event.ts
 * PURPOSE: Logic for matching closet items to 3 calendar events.
 */

import { z } from 'zod';

const GenerateOutfitForEventSchema = z.object({
  wardrobeItems: z.array(z.any()),
  styleDNA: z.string(),
});

export async function generateOutfitForEventAction(input: unknown) {
  const { wardrobeItems } = GenerateOutfitForEventSchema.parse(input);

  // Helper to find specific types from your RFID-synced closet
  const findItem = (type: string) => 
    wardrobeItems.find(i => i.type?.toLowerCase().includes(type.toLowerCase()))?.name || "Premium Selection";

  const footwear = wardrobeItems.filter(i => 
    i.type?.toLowerCase().includes('shoe') || 
    i.type?.toLowerCase().includes('boot') || 
    i.type?.toLowerCase().includes('sandals')
  );

  // The 3-card data structure for your UI
  const recommendations = [
    {
      eventName: "Team Sync Meeting",
      date: "Thu, Dec 11",
      styleCategory: "Professional",
      description: `Pair your ${findItem('top')} with structured bottoms for a balanced look.`,
      footwear: footwear[0]?.name || "Black Leather Boots",
      suitabilityScore: 85,
      imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800"
    },
    {
      eventName: "Art Gallery Opening",
      date: "Fri, Dec 12",
      styleCategory: "Social Chic",
      description: `A sophisticated ensemble utilizing your ${findItem('dress') || 'favorite layer'}.`,
      footwear: footwear[1]?.name || "Tory Burch Sandals",
      suitabilityScore: 92,
      imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800"
    },
    {
      eventName: "Weekend Gala",
      date: "Sun, Dec 14",
      styleCategory: "Formal",
      description: `Your most elegant silhouette, perfect for a high-profile evening.`,
      footwear: footwear[2]?.name || "On Cloud 5 (Style Edition)",
      suitabilityScore: 78,
      imageUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800"
    }
  ];

  return { recommendations };
}
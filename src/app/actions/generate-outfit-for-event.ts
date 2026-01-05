'use server';

import { z } from 'zod';

/**
 * FILE: src/app/actions/generate-outfit-for-event.ts
 * LOGIC: Dynamic City Image Fetching + Smart Shoebox Footwear Sync.
 */

const ClosetItemSchema = z.object({
  id: z.string(),
  itemName: z.string().catch('Unnamed Piece'),
  itemType: z.string().catch('Footwear'),
  imageUrl: z.any().optional(),
});

const GenerateOutfitInputSchema = z.object({
  wardrobeItems: z.array(ClosetItemSchema).min(1),
});

// 🏙️ City Hero Mapping Logic
const CITY_DATABASE: Record<string, string> = {
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1000',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1000',
  'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1000',
  'NYC': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1000',
  'Oslo': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1000',
  'Milan': 'https://images.unsplash.com/photo-1520440229-6469a149ac59?auto=format&fit=crop&q=80&w=1000',
  'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1000',
  'Default': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000'
};

export async function generateOutfitForEventAction(input: unknown) {
  let parsed;
  try {
    parsed = GenerateOutfitInputSchema.parse(input);
  } catch (err: any) {
    throw new Error('Invalid wardrobe data.');
  }

  const { wardrobeItems } = parsed;

  // 👞 Filter for Shoes/Boots only for the Rollover
  const shoes = wardrobeItems.filter(i => 
    i.itemType.toLowerCase().includes('shoe') || i.itemType.toLowerCase().includes('boot')
  );

  const pickShoe = () => {
    const selected = shoes[Math.floor(Math.random() * shoes.length)] || wardrobeItems[0];
    return { name: selected.itemName, url: selected.imageUrl };
  };

  /**
   * MOCK CALENDAR DATA (Future: replace with Google Calendar API fetch)
   * This mimics what we get from your calendar events.
   */
  const googleCalendarEvents = [
    { name: 'Business Quarterly', location: 'London' },
    { name: 'Style Exhibition', location: 'Paris' },
    { name: 'Winter Tech Meetup', location: 'Oslo' }
  ];

  return {
    recommendations: googleCalendarEvents.map(event => {
      const suggestedShoe = pickShoe();
      const cityKey = event.location;
      
      return {
        eventName: event.name,
        city: event.location,
        // 🔑 THE AUTOMATION: Auto-assigns image based on location string
        cityUrl: CITY_DATABASE[cityKey] || CITY_DATABASE['Default'],
        footwearName: suggestedShoe.name,
        footwearImageUrl: suggestedShoe.url,
        suitabilityScore: 88 + Math.floor(Math.random() * 11), // Dynamic score 88-99
        weather: 'Checking AccuWeather...' // Placeholder for next step
      };
    })
  };
}
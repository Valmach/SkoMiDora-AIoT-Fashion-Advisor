'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { normalizeWardrobeType } from '@/lib/normalizeWardrobeType';

const ClosetItemSchema = z.object({
  id: z.string(),
  itemName: z.string().catch('Unnamed Piece'),
  itemType: z.string().catch('Footwear'),
  imageUrl: z.any().optional(),
});

const GenerateOutfitInputSchema = z.object({
  wardrobeItems: z.array(ClosetItemSchema).min(1),
});

const OutfitRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      eventName: z.string(),
      reasoning: z.string(),
      items: z.object({
        top: z.string().optional(),
        bottom: z.string().optional(),
        dress: z.string().optional(),
        outerwear: z.string().optional(),
        accessory: z.string().optional(),
        footwear: z.string(),
      }),
    }),
  ),
});

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

const groupWardrobeByCategory = (wardrobeItems: z.infer<typeof ClosetItemSchema>[]) => {
  return wardrobeItems.reduce((acc, item) => {
    const category = normalizeWardrobeType(item.itemType);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, z.infer<typeof ClosetItemSchema>[]>);
};

export async function generateOutfitForEventAction(input: unknown) {
  const parsed = GenerateOutfitInputSchema.parse(input);
  const { wardrobeItems } = parsed;
  const groupedWardrobe = groupWardrobeByCategory(wardrobeItems);

  const googleCalendarEvents = [
    { name: 'Business Quarterly', location: 'London' },
    { name: 'Style Exhibition', location: 'Paris' },
    { name: 'Winter Tech Meetup', location: 'Oslo' },
  ];

  const prompt = `
    You are a world-class fashion stylist. Your task is to create three outfit recommendations for a user based on their wardrobe and a list of upcoming events.

    **Context:**
    - Today's Date: ${new Date().toDateString()}
    - User's Wardrobe (categorized):
    ${JSON.stringify(groupedWardrobe, null, 2)}
    - Upcoming Events:
    ${JSON.stringify(googleCalendarEvents, null, 2)}

    **Instructions:**
    1. Create one outfit for each of the three events.
    2. For each outfit, you MUST select exactly one 'footwear' item.
    3. You SHOULD select other items (e.g., top, bottom, outerwear) to create a complete and stylish outfit.
    4. You MUST use the exact 'itemName' from the wardrobe for all selected items.
    5. Provide a brief 'reasoning' for each outfit, explaining why it's suitable for the event.
    6. Respond with a JSON object that conforms to the specified Zod schema.
  `;

  const { object: aiResponse } = await generateObject({
    model: google('gemini-1.5-flash'),
    schema: OutfitRecommendationSchema,
    prompt,
  });

  const findItem = (itemName: string | undefined) => {
    if (!itemName) return null;
    return wardrobeItems.find(i => i.itemName === itemName) || null;
  };

  const recommendations = aiResponse.recommendations.map(rec => {
    const event = googleCalendarEvents.find(e => e.name === rec.eventName);
    const city = event?.location || 'Unknown';

    const footwearItem = findItem(rec.items.footwear);

    return {
      eventName: rec.eventName,
      city,
      cityUrl: CITY_DATABASE[city] || CITY_DATABASE['Default'],
      footwearName: footwearItem?.itemName,
      footwearImageUrl: footwearItem?.imageUrl,
      reasoning: rec.reasoning,
      suitabilityScore: 92,
      weather: 'Fetching weather...',
    };
  });

  return { recommendations };
}

'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

/* =========================================================
   SCHEMA
========================================================= */
const schema = z.object({
  recommendations: z.array(
    z.object({
      id: z.string().optional(),
      eventName: z.string(),
      eventStartDateTime: z.string().optional(),
      location: z.string(),
      weatherCondition: z.string().optional(),
      temperature: z.number().optional(),
      outfitIdea: z.string().optional(),
      reasoning: z.string(),
      items: z.array(z.string()).optional(),
      colorPalette: z.string().optional(),
    })
  ),
});

/* =========================================================
   HELPERS
========================================================= */

function pickItem(items: any[], keywords: string[]) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const match = items.find(i => 
    (i.imageUrl || i.image) && 
    keywords.some(k => (i.itemName || '').toLowerCase().includes(k))
  );

  return match || items.find(i => i.imageUrl || i.image) || null;
}

function resolveImage(item: any): string | null {
  if (!item) return null;
  return item.imageUrl || item.image || item.url || null;
}

const CITY_IMAGES: Record<string, string> = {
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
  'Oslo': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
};

const CITIES = ['Paris', 'Oslo', 'London'];

/* =========================================================
   ACTION
========================================================= */
export async function getUpcomingEventsStyleAdviceAction(closetItems: any[] = []) {
  
  const simulatedEvents = [
    { title: 'Fashion Week Mixer', time: 'Tomorrow, 8:00 PM', location: 'Paris', context: 'Chic, high fashion' },
    { title: 'Nordic Design Summit', time: 'Friday, 9:00 AM', location: 'Oslo', context: 'Minimalist, warm layers' },
    { title: 'Tech Innovation Gala', time: 'Sunday, 7:00 PM', location: 'London', context: 'Elegant, modern, rain-ready' },
  ];

  const prompt = `
    You are a luxury personal stylist.
    Create outfit advice for these events:
    ${JSON.stringify(simulatedEvents, null, 2)}

    CRITICAL:
    - Return EXACTLY 3 recommendations
    - First location MUST be Paris
    - Second MUST be Oslo
    - Third MUST be London
  `;

  try {
    const result = await generateObject({
      // ✅ CORRECTED: Using the latest Gemini 2.5 Flash model
      model: google('gemini-2.5-flash'),
      schema,
      prompt,
    });

    const enriched = result.object.recommendations.map((rec, index) => {
      const city = CITIES[index] || rec.location;

      const clothing = pickItem(closetItems, ['dress', 'coat', 'jacket', 'blazer', 'top', 'shirt']);
      const footwear = pickItem(closetItems, ['boot', 'heel', 'sandal', 'shoe', 'loafer', 'sneaker']);

      return {
        ...rec,
        city,
        eventName: city, 
        location: city,
        temp: rec.temperature ?? 65,
        clothingName: clothing?.itemName || 'Statement Piece',
        clothingImageUrl: resolveImage(clothing),
        footwearName: footwear?.itemName || 'Footwear',
        footwearImageUrl: resolveImage(footwear),
        cityBg: CITY_IMAGES[city] || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
        reasoning: rec.reasoning || `Curated for ${city} based on your wardrobe.`
      };
    });

    return enriched;
  } catch (error: any) {
    console.error('AI Error:', error);
    return [];
  }
}
'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

/* ======================================================
   SCHEMA
====================================================== */

const schema = z.object({
  recommendations: z.array(
    z.object({
      eventName: z.string(),
      eventTime: z.string(),
      location: z.string(),
      weather: z.string(),
      outfitIdea: z.string(),
      reasoning: z.string(),
      items: z.array(z.string()),
      colorPalette: z.string(),
    })
  ),
});

/* ======================================================
   TYPE CLASSIFICATION (Firestore metadata is truth)
====================================================== */

const FOOTWEAR_TYPES = new Set([
  'shoe', 'shoes', 'boot', 'boots', 'heel', 'heels', 'sandal', 'sandals',
  'loafer', 'loafers', 'pump', 'pumps', 'sneaker', 'sneakers', 'mule', 'mules'
]);

const CLOTHING_TYPES = new Set([
  'dress', 'coat', 'jacket', 'blazer', 'top', 'shirt', 'blouse',
  'pant', 'pants', 'trouser', 'trousers', 'skirt', 'suit', 'jumpsuit',
  'sweater', 'cardigan'
]);

function normalizeType(t: any): string {
  return String(t || '').trim().toLowerCase();
}

function isFootwear(item: any): boolean {
  const t = normalizeType(item?.itemType);
  if (FOOTWEAR_TYPES.has(t)) return true;

  const n = String(item?.itemName || '').toLowerCase();
  return /(boot|heel|sandal|shoe|loafer|pump|sneaker|mule)/.test(n);
}

function isClothing(item: any): boolean {
  const t = normalizeType(item?.itemType);
  if (CLOTHING_TYPES.has(t)) return true;

  const n = String(item?.itemName || '').toLowerCase();
  return /(dress|coat|jacket|blazer|top|shirt|blouse|pant|trouser|skirt|suit|jumpsuit|sweater|cardigan)/.test(n);
}

function resolveImage(item: any): string | null {
  return item?.imageUrl || item?.image || item?.url || null;
}

/* ======================================================
   NAME CORRECTION (AI hallucination -> real DB names)
====================================================== */

function correctItemNames(generatedItems: string[], realCloset: any[]) {
  return generatedItems.map((genName) => {
    const g = String(genName || '').trim();
    if (!g) return genName;

    const exact = realCloset.find(i => String(i.itemName || '').trim() === g);
    if (exact) return exact.itemName;

    const gl = g.toLowerCase();
    const fuzzy = realCloset.find(i => {
      const rn = String(i.itemName || '').toLowerCase();
      return rn && (gl.includes(rn) || rn.includes(gl));
    });

    return fuzzy ? fuzzy.itemName : genName;
  });
}

/* ======================================================
   PICK EXACTLY ONE FOOTWEAR + ONE CLOTHING (guaranteed)
====================================================== */

function pickOneOfEach(resolvedNames: string[], closetItems: any[]) {
  const byName = resolvedNames
    .map(name => closetItems.find(c => String(c.itemName || '').toLowerCase() === String(name || '').toLowerCase()))
    .filter(Boolean);

  let footwear = byName.find(isFootwear) || closetItems.find(isFootwear) || null;
  let clothing = byName.find(isClothing) || closetItems.find(isClothing) || null;

  if (footwear && clothing && footwear === clothing) {
    const altClothing = closetItems.find(i => i !== footwear && isClothing(i));
    if (altClothing) clothing = altClothing;

    const altFootwear = closetItems.find(i => i !== clothing && isFootwear(i));
    if (altFootwear) footwear = altFootwear;
  }

  return { footwear, clothing };
}

/* ======================================================
   WEATHER WEIGHTING PER CITY
====================================================== */

const CITY_CONFIG = [
  { city: 'Paris',  weatherHint: 'Mild chic. Light layers. Polished footwear.' },
  { city: 'Oslo',   weatherHint: 'Cold. Insulated layers. Boots preferred.' },
  { city: 'London', weatherHint: 'Cool + likely rain. Outerwear + rain-appropriate shoes.' },
];

/* ======================================================
   SERVER ACTION
====================================================== */

export async function getDailyOutfitsAction(closetItems: any[]) {
  if (!closetItems || closetItems.length === 0) {
    return [{
      eventName: "Closet Empty",
      eventTime: "Now",
      location: "Home",
      weather: "N/A",
      outfitIdea: "Add Items First",
      reasoning: "Please add items to your closet to get real AI suggestions.",
      items: ["No items found"],
      colorPalette: "Gray",
      clothingName: "None",
      clothingImageUrl: null,
      footwearName: "None",
      footwearImageUrl: null,
      city: "Home",
      temp: '--',
      cityBg: "https://source.unsplash.com/1200x800/?closet,fashion",
    }];
  }

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ✅ FIX: Removed the .slice(0, 50) limit. The AI now sees all 108+ items!
  const recentItems = closetItems;

  const closetText = recentItems
    .map((item) => `- ${item.itemName} (type: ${item.itemType || 'unknown'}, color: ${item.color || 'unknown'})`)
    .join('\n');

  const cityWeatherBlock = CITY_CONFIG
    .map((c, idx) => `${idx + 1}. ${c.city}: ${c.weatherHint}`)
    .join('\n');

  const prompt = `
You are a luxury personal stylist.

Today is ${dateString}.

You must create EXACTLY 3 outfit recommendations, one for each city below, and you must respect the weather hints.

CITY + WEATHER HINTS:
${cityWeatherBlock}

CRITICAL RULES:
- Each recommendation MUST include exactly:
  - one footwear item
  - one clothing item
- You must use the EXACT item names from the wardrobe inventory. Do not paraphrase.
- Do not invent items.

WARDROBE INVENTORY:
${closetText}

Return exactly 3 recommendations.
`;

  const result = await generateObject({
    model: google('gemini-2.5-flash'),
    schema,
    prompt,
  });

  const fixedNames = result.object.recommendations.map(rec => ({
    ...rec,
    items: correctItemNames(rec.items, recentItems),
  }));

  const enriched = fixedNames.map((rec, index) => {
    const cfg = CITY_CONFIG[index] || CITY_CONFIG[0];

    const { footwear, clothing } = pickOneOfEach(rec.items, closetItems);

    return {
      ...rec,
      city: cfg.city,
      location: cfg.city,
      weather: rec.weather || cfg.weatherHint,

      footwearName: footwear?.itemName || 'Footwear',
      footwearImageUrl: resolveImage(footwear),

      clothingName: clothing?.itemName || 'Wardrobe Item',
      clothingImageUrl: resolveImage(clothing),

      cityBg: `https://source.unsplash.com/1200x800/?${cfg.city},city`,
      temp: '--',
    };
  });

  return enriched;
}

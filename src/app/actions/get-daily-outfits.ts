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

const FOOTWEAR_TYPES = new Set(['shoe', 'shoes', 'boot', 'boots', 'heel', 'heels', 'sandal', 'sandals', 'loafer', 'loafers', 'pump', 'pumps', 'sneaker', 'sneakers', 'mule', 'mules']);
const CLOTHING_TYPES = new Set(['dress', 'coat', 'jacket', 'blazer', 'top', 'shirt', 'blouse', 'pant', 'pants', 'trouser', 'trousers', 'skirt', 'suit', 'jumpsuit', 'sweater', 'cardigan']);

function normalizeType(t: any): string { return String(t || '').trim().toLowerCase(); }

function isFootwear(item: any): boolean {
  const t = normalizeType(item?.itemType);
  if (FOOTWEAR_TYPES.has(t)) return true;
  return /(boot|heel|sandal|shoe|loafer|pump|sneaker|mule)/.test(String(item?.itemName || '').toLowerCase());
}

function isClothing(item: any): boolean {
  const t = normalizeType(item?.itemType);
  if (CLOTHING_TYPES.has(t)) return true;
  return /(dress|coat|jacket|blazer|top|shirt|blouse|pant|trouser|skirt|suit|jumpsuit|sweater|cardigan)/.test(String(item?.itemName || '').toLowerCase());
}

function resolveImage(item: any): string | null { return item?.imageUrl || item?.image || item?.url || null; }

function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

function pickOneOfEach(resolvedNames: string[], closetItems: any[]) {
  const byName = resolvedNames.map(name => closetItems.find(c => String(c.itemName || '').toLowerCase() === String(name || '').toLowerCase())).filter(Boolean);
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

const CITY_CONFIG = [
  { city: 'West Memphis, AR', weatherHint: 'Springtime. Warm, breezy, and comfortable.' },
  { city: 'Paris',  weatherHint: 'Mild chic spring. Light layers. Polished footwear.' },
  { city: 'London', weatherHint: 'Cool spring + likely rain. Outerwear + rain-appropriate shoes.' },
];

/* ======================================================
   SERVER ACTION 
====================================================== */
export async function getDailyOutfitsAction(closetItemsPayload: string) {
  try {
    // FIX 3: Safe JSON Parsing
    if (!closetItemsPayload) throw new Error('Missing closet payload');
    
    let closetItems = [];
    try {
      closetItems = JSON.parse(closetItemsPayload);
    } catch (err) {
      throw new Error('Invalid closet payload JSON');
    }

    if (!closetItems || closetItems.length === 0) {
      return [{
        eventName: "Closet Empty", eventTime: "Now", location: "Home", weather: "N/A", outfitIdea: "Add Items First", reasoning: "Please add items to your closet.", items: ["No items found"], colorPalette: "Gray", clothingName: "None", clothingImageUrl: null, footwearName: "None", footwearImageUrl: null, city: "Home", temp: '--', cityBg: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
      }];
    }

    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const uniqueRequestID = Date.now(); 

    // FIX 7: Token Limit Protection (Slice to max 60 items)
    const shuffledCloset = shuffleArray(closetItems);
    const limitedCloset = shuffledCloset.slice(0, 60);

    const closetText = limitedCloset
      .map((item) => `- ${item.itemName} (type: ${item.itemType || 'unknown'}, color: ${item.color || 'unknown'})`)
      .join('\n');

    const cityWeatherBlock = CITY_CONFIG
      .map((c, idx) => `${idx + 1}. ${c.city}: ${c.weatherHint}`)
      .join('\n');

    const prompt = `
You are a luxury personal stylist.
CURRENT CONTEXT: Today is ${dateString}. The season is Spring.
Request ID: ${uniqueRequestID}
You must create EXACTLY 3 outfit recommendations, one for each city below.
CITY + WEATHER HINTS:
${cityWeatherBlock}
CRITICAL RULES:
- PRIORITIZE VARIETY: Select unique, lesser-used items.
- Each recommendation MUST include exactly: one footwear item, one clothing item.
- You must use the EXACT item names from the wardrobe inventory.
WARDROBE INVENTORY:
${closetText}
Return exactly 3 recommendations.`;

    let result;
    // FIX 6: Isolate AI Execution errors
    try {
      result = await generateObject({
        model: google('gemini-1.5-flash'), // FIX 2: Stable model fallback
        schema,
        prompt,
        temperature: 0.85, 
      });
    } catch (aiError) {
      console.error('Gemini generation failed:', aiError);
      throw new Error('AI Provider Failed');
    }

    const fixedNames = result.object.recommendations.map(rec => ({
      ...rec,
      items: correctItemNames(rec.items, closetItems),
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
        // FIX 5: Stable Unsplash URL
        cityBg: `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80`,
        temp: '--',
      };
    });

    return enriched;

  } catch (error) {
    // FIX: Enhanced Error Logging
    console.error('🔥 SERVER ACTION ERROR:', error instanceof Error ? error.message : error);
    if (error instanceof Error) console.error(error.stack);
    
    return [{
      eventName: "Stylist Unavailable", eventTime: "Now", location: "System Error", weather: "N/A", outfitIdea: "AI Generation Failed", reasoning: "The AI Stylist encountered an unexpected error processing your request. Please click 'Refresh Looks'.", items: [], colorPalette: "Gray", clothingName: "None", clothingImageUrl: null, footwearName: "None", footwearImageUrl: null, city: "Error", temp: '--', cityBg: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
    }];
  }
}
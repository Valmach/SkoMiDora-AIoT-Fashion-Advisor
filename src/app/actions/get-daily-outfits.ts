// app/actions/get-daily-outfits.ts
'use server';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// 🔥 Bulletproof API Key Fallback Initialization
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
});

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

// 🔥 Defensive Fallback for Missing Images
function resolveImage(item: any): string | null {
  const primaryUrl = item?.imageUrl || item?.image || item?.url;
  
  if (!primaryUrl || item?.imageStatus === "missing" || item?.imageError) {
    return "https://placehold.co/600x800/eeeeee/999999?text=Image+Unavailable"; 
  }
  
  return primaryUrl;
}

/* ======================================================
   ARRAY SHUFFLER (Breaks the 1% Repetition Loop)
====================================================== */
function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
   WEATHER WEIGHTING PER CITY (Updated for Summer Context & Stable Images)
====================================================== */

const CITY_CONFIG = [
  { 
    city: 'Paris',   
    weatherHint: 'Warm, sunny summer. Breathable chic layers. Polished yet comfortable footwear.',
    bgUrl: 'https://images.pexels.com/photos/4184571/pexels-photo-4184571.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  { 
    city: 'Rome',    
    weatherHint: 'Hot Mediterranean summer. Lightweight linen, breathable fabrics, and refined sandals.',
    bgUrl: 'https://images.pexels.com/photos/18602876/pexels-photo-18602876.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  { 
    city: 'Oslo',    
    weatherHint: 'Pleasant, bright Nordic summer. Crisp tailoring with a very light evening layer.',
    bgUrl: 'https://images.pexels.com/photos/18170373/pexels-photo-18170373.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
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
      cityBg: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&h=800&q=80",
    }];
  }

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = new Date().toLocaleDateString('en-US', options);
  const uniqueRequestID = Date.now(); 

  const shuffledCloset = shuffleArray(closetItems);

  // OPTIMIZATION 1: Pass descriptive metadata text strings to hand semantic leverage to the curation engine
  const closetText = shuffledCloset
    .map((item) => {
      const details = [
        item.itemType ? `Type: ${item.itemType}` : null,
        item.color || item.colorPalette ? `Color: ${item.color || item.colorPalette}` : null,
        item.material ? `Material: ${item.material}` : null,
        item.brand ? `Brand: ${item.brand}` : null,
        item.aiDescription ? `Visual Notes: ${item.aiDescription}` : null
      ].filter(Boolean).join(', ');

      return `- "${item.itemName}" [${details}]`;
    })
    .join('\n');

  const cityWeatherBlock = CITY_CONFIG
    .map((c, idx) => `${idx + 1}. ${c.city}: ${c.weatherHint}`)
    .join('\n');

  // OPTIMIZATION 2: Implemented strict structural limits, zero repetition bounds, and explicit archetype prompts
  const prompt = `
You are an avant-garde luxury personal fashion stylist for the high-end SkoMiDora styling app. Your objective is to curate 3 distinct outfit collections from the wardrobe inventory array.

CURRENT TIME CONTEXT:
Today is ${dateString}. The season context is Summer.
System Reference Code: ${uniqueRequestID}

RECOMMENDATION REQUIREMENTS:
You must return EXACTLY 3 recommendations—one for each target city.
${cityWeatherBlock}

CRITICAL ANTI-LAZY SELECTION DIRECTIVES:
1. DEEP CLOSET SELECTION: Look past the first few obvious choices in the array. Actively hunt for unique statement pieces, contrasting textures, layered colors, and less-frequently selected items deep inside the array.
2. COMPULSORY REPETITION BAN: A wardrobe inventory element can ONLY appear in ONE look. Once an item name is used in an outfit list, it is strictly banned from being selected in the other remaining outfits. You must use a minimum of 6 completely distinct items across the whole response payload.
3. THREE DISTINCT DESIGN ARCHETYPES REQUIRED:
   - Recommendation 1 (City 1): Must emphasize "Architectural Tailoring & Structured Minimalist Shapes".
   - Recommendation 2 (City 2): Must emphasize "Fluid Textures, Asymmetrical Silhouettes & High-Contrast Visuals".
   - Recommendation 3 (City 3): Must emphasize "Progressive Multi-Layering, Sculpted Footwear & Avant-Garde Avant-Chic Styling".
4. Each look object MUST reference exactly:
   - one footwear item name
   - one clothing item name
5. Use the exact text literal for item names from the input matrix. Do not alter capitalization or paraphrase. Do not invent items.

WARDROBE INVENTORY:
${closetText}

Assemble exactly 3 highly-differentiated luxury looks matching these rules.
`;

  console.log("\n==================================================");
  console.log("🔍 API KEY DIAGNOSTIC CHECK");
  console.log("GEMINI_API_KEY seen:", process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 15)}...` : "UNDEFINED");
  console.log("GOOGLE_GEN_AI_KEY seen:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? `${process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 15)}...` : "UNDEFINED");
  console.log("==================================================\n");

  const result = await generateObject({
    model: google('gemini-2.5-flash'),
    schema,
    prompt,
    temperature: 0.88, // Injected high temperature bounds to increase output probability mapping variety
  });

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

      cityBg: cfg.bgUrl,
      temp: '--',
    };
  });

  return enriched;
}
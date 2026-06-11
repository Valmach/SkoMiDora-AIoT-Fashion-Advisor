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
  'sweater', 'cardigan', 'outerwear' // FIX 1: Explicitly added Outerwear to support blazers/jackets
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
  return /(dress|coat|jacket|blazer|top|shirt|blouse|pant|trouser|skirt|suit|jumpsuit|sweater|cardigan|outerwear)/.test(n);
}

function resolveImage(item: any): string | null {
  const primaryUrl = item?.imageUrl || item?.image || item?.url;
  
  if (!primaryUrl || item?.imageStatus === "missing" || item?.imageError) {
    return "https://placehold.co/600x800/eeeeee/999999?text=Image+Unavailable"; 
  }
  
  return primaryUrl;
}

/* ======================================================
   ARRAY SHUFFLER
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
   NAME CORRECTION
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
   PICK EXACTLY ONE FOOTWEAR + ONE CLOTHING
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
   WEATHER CONFIGURATION
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

  // FIX 2: Realigned mapping parameters to match explicit database keys present in Firestore
  const closetText = shuffledCloset
    .map((item) => {
      const details = [
        item.itemType ? `Type: ${item.itemType}` : null,
        item.color ? `Color: ${item.color}` : null,
        item.generalMaterial ? `Material: ${item.generalMaterial}` : null,
        item.designer ? `Designer: ${item.designer}` : null,
        item.detailedSpecifications ? `Specs: ${item.detailedSpecifications}` : null,
        item.narrativeDescription ? `Editorial Note: ${item.narrativeDescription}` : null,
        item.styleKeywords && item.styleKeywords.length > 0 ? `Aesthetics: ${item.styleKeywords.join(', ')}` : null
      ].filter(Boolean).join(', ');

      return `- "${item.itemName}" [${details}]`;
    })
    .join('\n');

  const cityWeatherBlock = CITY_CONFIG
    .map((c, idx) => `${idx + 1}. ${c.city}: ${c.weatherHint}`)
    .join('\n');

  const prompt = `
You are an avant-garde luxury personal fashion stylist for the high-end SkoMiDora styling app. Your objective is to curate 3 completely distinct outfit collections utilizing the wardrobe inventory list.

CURRENT TIME CONTEXT:
Today is ${dateString}. The season context is Summer.
System Reference Code: ${uniqueRequestID}

RECOMMENDATION PARAMETERS:
You must return EXACTLY 3 recommendations—one for each target city.
${cityWeatherBlock}

CRITICAL INVENTORY EXPLORATION DIRECTIVES:
1. MAXIMIZE CLOSET DEPTH: You must explore the full breadth of the inventory. Avoid repeatedly relying on simple base layer items. Target high-contrast statement pairings by building ensembles using separate pieces (e.g., combining a piece of "Outerwear" like a blazer/jacket with a "Top", or matching distinctive knits).
2. COMPULSORY REPETITION BAN: A wardrobe inventory element can ONLY appear in ONE look. Once an item name is used in an outfit list, it is strictly banned from being selected in the other remaining outfits. You must use a minimum of 6 completely distinct items across the whole response payload.
3. THREE DISTINCT DESIGN ARCHETYPES REQUIRED:
   - Recommendation 1 (City 1): Must emphasize "Architectural Tailoring & Structured Minimalist Shapes" (e.g., styled blazers, crisp structured cuts).
   - Recommendation 2 (City 2): Must emphasize "Fluid Summer Textures, Vibrant Elements & High-Contrast Visuals" (e.g., bold colors, lightweight statement pieces, refined open aesthetics).
   - Recommendation 3 (City 3): Must emphasize "Progressive Multi-Layering, Sculpted Silhouettes & Contemporary Avant-Chic Styling" (e.g., fine knits, tailored transitional outerwear layers).
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
    temperature: 0.9, // Kept high to ensure creative, deep-closet path exploration
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
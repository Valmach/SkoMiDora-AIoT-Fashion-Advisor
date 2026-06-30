// app/actions/get-daily-outfits.ts
'use server';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

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
      destinationName: z.string().optional(),
      destinationImageQuery: z.string().optional(),
      destinationReason: z.string().optional(),
      weatherTag: z.string().optional(),
      weather: z.string(),
      outfitIdea: z.string(),
      reasoning: z.string(),
      items: z.array(z.string()),
      colorPalette: z.string(),
    })
  ),
});

/* ======================================================
   TYPE CLASSIFICATION
====================================================== */

const FOOTWEAR_TYPES = new Set([
  'shoe', 'shoes', 'boot', 'boots', 'heel', 'heels', 'sandal', 'sandals',
  'loafer', 'loafers', 'pump', 'pumps', 'sneaker', 'sneakers', 'mule', 'mules'
]);

const CLOTHING_TYPES = new Set([
  'dress', 'coat', 'jacket', 'blazer', 'top', 'shirt', 'blouse',
  'pant', 'pants', 'trouser', 'trousers', 'skirt', 'suit', 'jumpsuit',
  'sweater', 'cardigan', 'outerwear', 'shorts', 'swim', 'swimwear', 'swimsuit', 'bikini' // ✅ Swimwear integrated
]);

function normalizeType(t: any): string {
  return String(t || '').trim().toLowerCase();
}

function cleanText(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function itemText(item: any): string {
  return [
    item?.itemName,
    item?.itemType,
    item?.type,
    item?.category,
    item?.color,
    item?.generalMaterial,
    item?.materials,
    item?.material,
    item?.designer,
    item?.brand,
    item?.detailedSpecifications,
    item?.narrativeDescription,
    Array.isArray(item?.styleKeywords) ? item.styleKeywords.join(' ') : '',
  ].map(cleanText).join(' ').toLowerCase();
}

function parseTempC(weatherContext: string): number | null {
  const weather = cleanText(weatherContext);

  const cMatch = weather.match(/(-?\d+(?:\.\d+)?)\s*°?\s*C\b/i);
  if (cMatch) return Number(cMatch[1]);

  const fMatch = weather.match(/(-?\d+(?:\.\d+)?)\s*°?\s*F\b/i);
  if (fMatch) return Math.round((Number(fMatch[1]) - 32) * 5 / 9);

  return null;
}

function getClimate(weatherContext: string) {
  const tempC = parseTempC(weatherContext);
  const text = cleanText(weatherContext).toLowerCase();

  if (tempC !== null && tempC >= 24) return { tier: 'hot', tempC };
  if (tempC !== null && tempC >= 18) return { tier: 'warm', tempC };
  if (tempC !== null && tempC <= 12) return { tier: 'cold', tempC };

  if (/\b(hot|heat|humid|summer|sunny|clear)\b/.test(text)) return { tier: 'hot', tempC };
  if (/\b(warm|mild)\b/.test(text)) return { tier: 'warm', tempC };
  if (/\b(cold|snow|winter|freezing)\b/.test(text)) return { tier: 'cold', tempC };

  return { tier: 'warm', tempC };
}

function isHeavyColdItem(item: any): boolean {
  return /\b(boot|boots|coat|puffer|parka|wool|cashmere|alpaca|thermal|fleece|fur|shearling|down|heavy|winter|snow|knitwear|thick sweater|heavy sweater)\b/.test(itemText(item));
}

function isWarmWeatherItem(item: any): boolean {
  return /\b(linen|cotton|silk|dress|shirtdress|shirt|blouse|tank|tee|t-shirt|shorts|skirt|sandal|sandals|mule|mules|slide|slides|loafer|loafers|pump|pumps|swim|swimwear|swimsuit|bikini|resort|lightweight|sleeveless|halter)\b/.test(itemText(item));
}

function inferLocation(eventContext: string, weatherContext: string = ''): string {
  const text = `${cleanText(eventContext)} ${cleanText(weatherContext)}`.toLowerCase();

  const knownDestinations = [
    { keys: ['paris', 'france'], label: 'Paris, France' },
    { keys: ['rome', 'italy'], label: 'Rome, Italy' },
    { keys: ['oslo', 'norway'], label: 'Oslo, Norway' },
    { keys: ['london', 'uk', 'england'], label: 'London, United Kingdom' },
    { keys: ['new york', 'nyc', 'manhattan'], label: 'New York, USA' },
    { keys: ['tokyo', 'japan'], label: 'Tokyo, Japan' },
    { keys: ['milan', 'milano'], label: 'Milan, Italy' },
    { keys: ['copenhagen', 'denmark'], label: 'Copenhagen, Denmark' },
    { keys: ['barcelona', 'spain'], label: 'Barcelona, Spain' },
    { keys: ['lisbon', 'portugal'], label: 'Lisbon, Portugal' },
  ];

  const matched = knownDestinations.find((dest) =>
    dest.keys.some((key) => text.includes(key))
  );

  if (matched) return matched.label;

  const inMatch = cleanText(eventContext).match(/(?:in|for|at)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})(?:\b|,)/);
  if (inMatch?.[1]) return inMatch[1].trim();

  return cleanText(eventContext) || 'Current Destination';
}

function shortDestinationName(destination: string): string {
  return cleanText(destination).split(',')[0].trim() || 'Current Destination';
}

function buildDestinationImageQuery(destination: string, eventContext: string, weatherContext: string): string {
  const shortName = shortDestinationName(destination);
  const eventText = cleanText(eventContext);
  const weatherText = cleanText(weatherContext);

  return [
    shortName,
    eventText && eventText !== shortName ? eventText : '',
    weatherText,
    'luxury street style destination editorial'
  ].filter(Boolean).join(' ');
}

function buildWeatherTag(climate: { tier: string; tempC: number | null }, weatherContext: string): string {
  if (climate.tempC !== null) return `${climate.tier} • ${climate.tempC}°C`;
  return cleanText(weatherContext) || climate.tier;
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
  // ✅ Evaluation regex expanded to catch swimwear strings dynamically
  return /(dress|coat|jacket|blazer|top|shirt|blouse|pant|trouser|skirt|suit|jumpsuit|sweater|cardigan|outerwear|shorts|swim|swimwear|swimsuit|bikini)/.test(n);
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
    weatherHint: 'Warm, sunny summer. Breathable chic layers featuring luxury tailoring, shorts, or light dresses.',
    bgUrl: 'https://images.pexels.com/photos/4184571/pexels-photo-4184571.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    city: 'Rome',
    weatherHint: 'Hot Mediterranean summer. Lightweight linen components, swimwear/resort layers, high-end shorts, breathable fabrics, and refined sandals.',
    bgUrl: 'https://images.pexels.com/photos/18602876/pexels-photo-18602876.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    city: 'Oslo',
    weatherHint: 'Pleasant, bright Nordic summer. Crisp transitional tailoring, luxury shorts, or trousers paired with a light layer.',
    bgUrl: 'https://images.pexels.com/photos/18170373/pexels-photo-18170373.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    city: 'London',
    weatherHint: 'Polished city layers with refined tailoring and travel-ready texture.',
    bgUrl: 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    city: 'New York',
    weatherHint: 'Metropolitan polish with strong lines, expressive accessories, and practical day-to-evening styling.',
    bgUrl: 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    city: 'Tokyo',
    weatherHint: 'Modern city styling with sharp silhouettes, texture contrast, and refined minimalism.',
    bgUrl: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    city: 'Milan',
    weatherHint: 'Italian fashion polish with elegant tailoring, designer texture, and understated drama.',
    bgUrl: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
];

function getDestinationConfig(destinationName: string, fallbackIndex: number = 0) {
  const shortName = shortDestinationName(destinationName).toLowerCase();

  return (
    CITY_CONFIG.find((cfg) => shortName.includes(cfg.city.toLowerCase())) ||
    CITY_CONFIG[fallbackIndex % CITY_CONFIG.length] ||
    CITY_CONFIG[0]
  );
}

/* ======================================================
   SERVER ACTION
====================================================== */


function rotateArray(items: any[], seed: number) {
  if (!items.length) return items;
  const offset = Math.abs(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function pickUnusedItem(items: any[], usedNames: Set<string>) {
  return items.find((item) => {
    const name = cleanText(item?.itemName).toLowerCase();
    return name && !usedNames.has(name);
  }) || null;
}

function buildDeterministicFallbackOutfits(
  recommendationPool: any[],
  eventContext: string,
  weatherContext: string,
  climate: { tier: string; tempC: number | null },
  refreshSeed: string = ''
) {
  const targetEvent = cleanText(eventContext) || "Summer Style Curation";
  const targetLocation = inferLocation(targetEvent, weatherContext);
  const liveWeatherContext = cleanText(weatherContext) || "Warm summer weather";
  const destinationName = targetLocation;
  const destinationImageQuery = buildDestinationImageQuery(destinationName, targetEvent, liveWeatherContext);
  const weatherTag = buildWeatherTag(climate, liveWeatherContext);

  const pool =
    climate.tier === "hot"
      ? recommendationPool.filter((item) => !isHeavyColdItem(item) || isWarmWeatherItem(item))
      : recommendationPool;

  const safePool = pool.length ? pool : recommendationPool;
  const seedNumber = Number(refreshSeed || String(Date.now()).slice(-6));
  const clothingPool = rotateArray(safePool.filter(isClothing), seedNumber);
  const footwearPool = rotateArray(safePool.filter(isFootwear), seedNumber + 7);

  const usedNames = new Set<string>();

  const archetypes = [
    "Breathable Tailoring & City Polish",
    "Fluid Summer Texture & Color Movement",
    "Evening Refinement & Lightweight Drama",
  ];

  return archetypes.map((archetype, index) => {
    const clothing = pickUnusedItem(clothingPool, usedNames) || pickUnusedItem(safePool, usedNames);

    if (clothing?.itemName) {
      usedNames.add(cleanText(clothing.itemName).toLowerCase());
    }

    const footwear = pickUnusedItem(footwearPool, usedNames);

    if (footwear?.itemName) {
      usedNames.add(cleanText(footwear.itemName).toLowerCase());
    }

    const finalItems = [
      clothing?.itemName,
      footwear?.itemName,
    ].filter(Boolean);

    const cfg = getDestinationConfig(destinationName, index);

    return {
      eventName: targetEvent,
      eventTime: "Now",
      location: destinationName,
      destinationName,
      destinationImageQuery,
      destinationReason: `Grounded from event and weather context for ${destinationName}.`,
      weatherTag,
      weather: liveWeatherContext,
      outfitIdea: archetype,
      reasoning:
        climate.tier === "hot"
          ? "Fallback closet curation used because the AI outfit generator failed. This look avoids heavy coats, boots, wool, cashmere, alpaca, and winter-weight pieces for hot weather."
          : "Fallback closet curation used because the AI outfit generator failed. This look uses available closet pieces while preserving event and weather context.",
      items: finalItems,
      colorPalette: "Closet-led palette",
      city: shortDestinationName(destinationName),
      temp: climate.tempC !== null ? `${climate.tempC}°C` : "--",
      cityBg: cfg.bgUrl,

      clothingName: clothing?.itemName || "Wardrobe Item",
      clothingImageUrl: resolveImage(clothing),

      footwearName: footwear?.itemName || "Footwear",
      footwearImageUrl: resolveImage(footwear),
    };
  }).filter((rec) => rec.items.length > 0);
}

export async function getDailyOutfitsAction(
  closetItems: any[],
  eventContext: string = '',
  weatherContext: string = '',
  refreshSeed: string = ''
) {
  const climate = getClimate(weatherContext);

  // ✅ Prevent handbags from entering the AI context window completely
  const validApparel = closetItems.filter(item => {
    const type = (item.itemType || '').toLowerCase();
    const name = (item.itemName || '').toLowerCase();
    const isBag = type.includes('bag') || type.includes('purse') || name.includes('bag') || name.includes('purse');
    return !isBag;
  });

  const weatherEligible = validApparel.filter(item => {
    if (climate.tier === 'hot') {
      return !isHeavyColdItem(item) || isWarmWeatherItem(item);
    }
    return true;
  });

  const recommendationPool = weatherEligible.length >= 4 ? weatherEligible : validApparel;

  if (!recommendationPool || recommendationPool.length === 0) {
    return [{
      eventName: "Closet Empty",
      eventTime: "Now",
      location: "Home",
      destinationName: "Home",
      destinationImageQuery: "home closet wardrobe styling",
      destinationReason: "No closet metadata is available yet.",
      weatherTag: "N/A",
      weather: "N/A",
      outfitIdea: "Add Items First",
      reasoning: "Please add valid apparel items to your closet to get real AI suggestions.",
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
  const uniqueRequestID = refreshSeed || String(Date.now()); 

  const shuffledCloset = shuffleArray(recommendationPool);

  const closetText = shuffledCloset
    .map((item) => {
      const details = [
        item.itemType ? `Type: ${item.itemType}` : null,
        item.color ? `Color: ${item.color}` : null,
        item.generalMaterial ? `Material: ${item.generalMaterial}` : null,
        item.designer ? `Designer: ${item.designer}` : null,
        item.detailedSpecifications ? `Specs: ${item.detailedSpecifications}` : null,
        item.narrativeDescription ? `Editorial Note: ${item.narrativeDescription}` : null,
        item.styleKeywords && item.styleKeywords.length > 0 ? `Aesthetics: ${item.styleKeywords.join(', ')}` : null,
        item.season ? `Season: ${item.season}` : null,
        item.eventCategory ? `Event Category: ${Array.isArray(item.eventCategory) ? item.eventCategory.join(', ') : item.eventCategory}` : null,
        item.weatherSuitability ? `Weather Suitability: ${Array.isArray(item.weatherSuitability) ? item.weatherSuitability.join(', ') : item.weatherSuitability}` : null,
        item.formality ? `Formality: ${item.formality}` : null,
        item.locationWorn ? `Previously Worn Location: ${item.locationWorn}` : null,
        item.tags && item.tags.length > 0 ? `Tags: ${item.tags.join(', ')}` : null
      ].filter(Boolean).join(', ');

      return `- "${item.itemName}" [${details}]`;
    })
    .join('\n');

  const targetEvent = cleanText(eventContext) || 'Summer Style Curation';
  const targetLocation = inferLocation(targetEvent, weatherContext);
  const liveWeatherContext = cleanText(weatherContext) || 'Warm summer weather';
  const destinationName = targetLocation;
  const destinationImageQuery = buildDestinationImageQuery(destinationName, targetEvent, liveWeatherContext);
  const weatherTag = buildWeatherTag(climate, liveWeatherContext);

  const hardWeatherRule = climate.tier === 'hot'
    ? 'HARD WEATHER BAN: Do not use boots, heavy coats, cashmere wraps, wool coats, alpaca, thermal layers, fleece, fur, heavy knitwear, parkas, or winter outerwear. Prefer sandals, mules, pumps, loafers, silk, linen, cotton, lightweight dresses, skirts, shirts, shorts, swim/resort pieces, and breathable tailoring.'
    : 'Weather rule: choose climate-appropriate pieces. Avoid winter-weight garments unless the weather is cold.';

  const prompt = `
You are an avant-garde luxury personal fashion stylist for the high-end SkoMiDora styling app.

CURRENT TIME CONTEXT:
Today is ${dateString}. The season context is June 2026 / Summer.
System Reference Code: ${uniqueRequestID}
Refresh seed directive: Use this seed to produce a different closet combination from the previous run.

EVENT CONTEXT:
${targetEvent}

DESTINATION CONTEXT:
Destination Name: ${destinationName}
Destination Image Query: ${destinationImageQuery}

LIVE WEATHER CONTEXT:
${liveWeatherContext}

TEMPERATURE CLASSIFICATION:
${climate.tier}${climate.tempC !== null ? ` (${climate.tempC}°C)` : ''}

${hardWeatherRule}

RECOMMENDATION PARAMETERS:
Return EXACTLY 3 recommendations for the SAME event and SAME weather context.
They are 3 different outfit options, not 3 different cities.

LOOK ARCHETYPES:
1. Breathable Tailoring & City Polish
2. Fluid Summer Texture & Color Movement
3. Evening Refinement & Lightweight Drama

CRITICAL INVENTORY EXPLORATION DIRECTIVES:
1. MAXIMIZE CLOSET DEPTH: explore the full closet and avoid repeatedly using the same obvious hero item.
2. COMPULSORY REPETITION BAN: a wardrobe item can appear in only one look.
3. Use at least 6 completely distinct item names across the whole response.
4. Each recommendation must include exactly:
   - one footwear item name
   - one clothing item name
5. Use exact item names from the wardrobe inventory. Do not invent items.
6. The reasoning must explain why the look fits the event and the live weather.
7. For hot weather, never select boots or heavy coats.

WARDROBE INVENTORY:
${closetText}

Each recommendation must include:
- destinationName: the real destination label, exactly "${destinationName}"
- destinationImageQuery: a specific image/search phrase grounded in the destination, event, and weather
- destinationReason: a short explanation of why this destination context applies
- weatherTag: exactly "${weatherTag}"

Return exactly 3 highly differentiated luxury looks for the selected event.
`;

  let result;

  try {
    result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema,
      prompt,
      temperature: 0.75,
    });
  } catch (error) {
    console.error("Daily outfit AI generation failed. Using deterministic closet fallback:", error);
    return buildDeterministicFallbackOutfits(recommendationPool, eventContext, weatherContext, climate, refreshSeed);
  }

  const aiRecommendations = result?.object?.recommendations || [];

  if (!aiRecommendations.length) {
    console.error("Daily outfit AI returned no recommendations. Using deterministic closet fallback.");
    return buildDeterministicFallbackOutfits(recommendationPool, eventContext, weatherContext, climate, refreshSeed);
  }

  const fixedNames = aiRecommendations.map(rec => ({
    ...rec,
    items: correctItemNames(rec.items, recommendationPool),
  }));

  const usedNames = new Set<string>();

  const enriched = fixedNames.slice(0, 3).map((rec, index) => {
    const availablePool = recommendationPool.filter(item => !usedNames.has(cleanText(item.itemName).toLowerCase()));
    const poolForLook = availablePool.length >= 2 ? availablePool : recommendationPool;

    const { footwear, clothing } = pickOneOfEach(rec.items, poolForLook);

    if (clothing?.itemName) usedNames.add(cleanText(clothing.itemName).toLowerCase());
    if (footwear?.itemName) usedNames.add(cleanText(footwear.itemName).toLowerCase());

    const finalItems = [
      clothing?.itemName,
      footwear?.itemName,
    ].filter(Boolean);

    const cfg = getDestinationConfig(destinationName, index);

    return {
      ...rec,
      eventName: targetEvent,
      city: shortDestinationName(destinationName),
      location: destinationName,
      destinationName,
      destinationImageQuery: rec.destinationImageQuery || destinationImageQuery,
      destinationReason: rec.destinationReason || `Grounded from event and weather context for ${destinationName}.`,
      weatherTag: rec.weatherTag || weatherTag,
      weather: liveWeatherContext,
      items: finalItems.length > 0 ? finalItems : rec.items,

      footwearName: footwear?.itemName || 'Footwear',
      footwearImageUrl: resolveImage(footwear),

      clothingName: clothing?.itemName || 'Wardrobe Item',
      clothingImageUrl: resolveImage(clothing),

      cityBg: cfg.bgUrl,
      temp: climate.tempC !== null ? `${climate.tempC}°C` : '--',
    };
  });

  return enriched;
}
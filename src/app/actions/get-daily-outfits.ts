'use server';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { scanWardrobeInventory } from '@/lib/server/wardrobe-inventory-scan';

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY,
});

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        'styleai-footwear',
    });
  }

  return getFirestore();
}

const recommendationSchema = z.object({
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
      itemIds: z.array(z.string()).length(3),
      colorPalette: z.string(),
    }),
  ),
});

type Climate = {
  tier: 'hot' | 'warm' | 'cold';
  tempC: number | null;
};

type ItemRole =
  | 'footwear'
  | 'one-piece'
  | 'top'
  | 'bottom'
  | 'layer'
  | 'accessory'
  | 'other';

type LookLane = {
  index: number;
  items: any[];
};

const FOOTWEAR_TYPES = new Set([
  'shoe',
  'shoes',
  'boot',
  'boots',
  'heel',
  'heels',
  'sandal',
  'sandals',
  'loafer',
  'loafers',
  'pump',
  'pumps',
  'sneaker',
  'sneakers',
  'mule',
  'mules',
  'flat',
  'flats',
]);

const ONE_PIECE_TYPES = new Set([
  'dress',
  'jumpsuit',
  'romper',
  'suit',
  'swimwear',
  'swimsuit',
]);

const TOP_TYPES = new Set([
  'shirt',
  't-shirt',
  'tshirt',
  'tee',
  'blouse',
  'top',
  'tank top',
  'tank',
  'sweater',
]);

const BOTTOM_TYPES = new Set([
  'jeans',
  'trousers',
  'pants',
  'shorts',
  'skirt',
]);

const LAYER_TYPES = new Set([
  'blazer',
  'jacket',
  'coat',
  'cardigan',
  'outerwear',
]);

const ACCESSORY_TYPES = new Set([
  'jewelry',
  'scarf',
  'hat',
  'watch',
  'belt',
]);

function cleanText(value: any): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeType(value: any): string {
  return cleanText(value).toLowerCase();
}

function itemId(item: any): string {
  return cleanText(
    item?.id ||
      item?.documentId ||
      item?.itemId,
  );
}

function itemName(item: any): string {
  return cleanText(
    item?.itemName ||
      item?.title ||
      item?.displayName ||
      item?.aiFriendlyName ||
      item?.name,
  );
}

function itemType(item: any): string {
  const values = [
    item?.itemType,
    item?.type,
    item?.category,
  ];

  for (const value of values) {
    const normalized = normalizeType(value);
    if (normalized) return normalized;
  }

  return '';
}

function itemText(item: any): string {
  return [
    itemName(item),
    itemType(item),
    item?.color,
    item?.generalMaterial,
    item?.materials,
    item?.material,
    item?.designer,
    item?.brand,
    item?.detailedSpecifications,
    item?.narrativeDescription,
    item?.season,
    item?.formality,
    Array.isArray(item?.styleKeywords)
      ? item.styleKeywords.join(' ')
      : item?.styleKeywords,
    Array.isArray(item?.eventCategory)
      ? item.eventCategory.join(' ')
      : item?.eventCategory,
    Array.isArray(item?.weatherSuitability)
      ? item.weatherSuitability.join(' ')
      : item?.weatherSuitability,
    Array.isArray(item?.tags)
      ? item.tags.join(' ')
      : item?.tags,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function classifyItem(item: any): ItemRole {
  const type = itemType(item);
  const text = itemText(item);

  if (
    FOOTWEAR_TYPES.has(type) ||
    /\b(boot|boots|heel|heels|sandal|sandals|shoe|shoes|loafer|loafers|pump|pumps|sneaker|sneakers|mule|mules|flat|flats)\b/.test(
      text,
    )
  ) {
    return 'footwear';
  }

  if (
    ONE_PIECE_TYPES.has(type) ||
    /\b(dress|jumpsuit|romper|two-piece suit|pantsuit|swimsuit)\b/.test(
      text,
    )
  ) {
    return 'one-piece';
  }

  if (
    BOTTOM_TYPES.has(type) ||
    /\b(jeans|trousers|pants|shorts|skirt)\b/.test(text)
  ) {
    return 'bottom';
  }

  if (
    LAYER_TYPES.has(type) ||
    /\b(blazer|jacket|coat|cardigan|outerwear)\b/.test(text)
  ) {
    return 'layer';
  }

  if (
    TOP_TYPES.has(type) ||
    /\b(shirt|t-shirt|tshirt|tee|blouse|tank|sweater|top|vest|waistcoat)\b/.test(
      text,
    )
  ) {
    return 'top';
  }

  if (
    ACCESSORY_TYPES.has(type) ||
    /\b(jewelry|earrings|necklace|bracelet|ring|scarf|hat|watch|belt)\b/.test(
      text,
    )
  ) {
    return 'accessory';
  }

  return 'other';
}

function parseTempC(weatherContext: string): number | null {
  const weather = cleanText(weatherContext);
  const cMatch = weather.match(/(-?\d+(?:\.\d+)?)\s*°?\s*C\b/i);

  if (cMatch) return Number(cMatch[1]);

  const fMatch = weather.match(/(-?\d+(?:\.\d+)?)\s*°?\s*F\b/i);

  if (fMatch) {
    return Math.round(
      ((Number(fMatch[1]) - 32) * 5) / 9,
    );
  }

  return null;
}

function getClimate(weatherContext: string): Climate {
  const tempC = parseTempC(weatherContext);
  const text = cleanText(weatherContext).toLowerCase();

  if (tempC !== null && tempC >= 24) {
    return { tier: 'hot', tempC };
  }

  if (tempC !== null && tempC <= 12) {
    return { tier: 'cold', tempC };
  }

  if (/\b(hot|heat|humid|summer|sunny)\b/.test(text)) {
    return { tier: 'hot', tempC };
  }

  if (/\b(cold|snow|winter|freezing|icy)\b/.test(text)) {
    return { tier: 'cold', tempC };
  }

  return { tier: 'warm', tempC };
}

function isHeavyColdItem(item: any): boolean {
  return /\b(boot|boots|puffer|parka|wool|cashmere|alpaca|thermal|fleece|fur|shearling|down|heavy|winter|snow|thick sweater)\b/.test(
    itemText(item),
  );
}

function isWarmWeatherItem(item: any): boolean {
  return /\b(linen|cotton|silk|dress|shirt|blouse|tank|tee|t-shirt|shorts|skirt|sandal|sandals|mule|mules|slide|slides|loafer|loafers|pump|pumps|resort|lightweight|sleeveless|halter)\b/.test(
    itemText(item),
  );
}

function isSwimwearItem(item: any): boolean {
  const type = itemType(item);
  const text = itemText(item);

  return (
    ['swimwear', 'swimsuit', 'bikini'].includes(type) ||
    /\b(bikini|swimsuit|swimwear|maillot|bathing suit|one-piece swimsuit|one piece swimsuit)\b/.test(
      text,
    )
  );
}

function eventAllowsSwimwear(
  eventContext: string,
): boolean {
  const event = cleanText(eventContext).toLowerCase();

  return /\b(beach|pool|swim|swimming|resort|cruise|yacht|seaside|water park)\b/.test(
    event,
  );
}

function isWeatherEligible(
  item: any,
  climate: Climate,
  weatherContext: string,
  eventContext: string,
): boolean {
  const role = classifyItem(item);
  const text = itemText(item);
  const weather = cleanText(weatherContext).toLowerCase();
  const event = cleanText(eventContext).toLowerCase();

  if (
    isSwimwearItem(item) &&
    !eventAllowsSwimwear(eventContext)
  ) {
    return false;
  }

  if (
    climate.tier === 'hot' &&
    isHeavyColdItem(item) &&
    !isWarmWeatherItem(item)
  ) {
    return false;
  }

  if (role !== 'footwear') return true;

  const isOpen =
    /\b(sandal|sandals|slide|slides|mule|mules|open toe|open-toe|peep toe|peep-toe)\b/.test(
      text,
    );
  const isBoot = /\b(boot|boots)\b/.test(text);
  const isStiletto =
    /\b(stiletto|stilettos|high heel|high heels)\b/.test(text);
  const isDelicate = /\b(suede|satin|velvet)\b/.test(text);
  const rain = /\b(rain|showers|storm|wet)\b/.test(weather);
  const snow = /\b(snow|ice|icy|sleet|blizzard)\b/.test(weather);
  const walking =
    /\b(walking|tour|sightseeing|hiking)\b/.test(event);

  if (climate.tier === 'hot' && isBoot) return false;
  if (climate.tier === 'cold' && isOpen) return false;
  if (rain && (isOpen || isDelicate)) return false;
  if (snow && (isOpen || isStiletto)) return false;
  if (walking && isStiletto) return false;

  return true;
}

function inferLocation(
  eventContext: string,
  weatherContext: string,
): string {
  const combined = `${cleanText(eventContext)} ${cleanText(
    weatherContext,
  )}`.toLowerCase();

  const destinations = [
    { keys: ['paris', 'france'], label: 'Paris, France' },
    { keys: ['rome', 'italy'], label: 'Rome, Italy' },
    { keys: ['oslo', 'norway'], label: 'Oslo, Norway' },
    { keys: ['london', 'england', 'united kingdom'], label: 'London, United Kingdom' },
    { keys: ['new york', 'nyc', 'manhattan'], label: 'New York, USA' },
    { keys: ['tokyo', 'japan'], label: 'Tokyo, Japan' },
    { keys: ['milan', 'milano'], label: 'Milan, Italy' },
    { keys: ['copenhagen', 'denmark'], label: 'Copenhagen, Denmark' },
    { keys: ['barcelona', 'spain'], label: 'Barcelona, Spain' },
    { keys: ['lisbon', 'portugal'], label: 'Lisbon, Portugal' },
  ];

  const match = destinations.find(destination =>
    destination.keys.some(key => combined.includes(key)),
  );

  if (match) return match.label;

  return cleanText(eventContext) || 'Current Destination';
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items: any[], seed: number): any[] {
  const shuffled = [...items];
  const random = seededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target],
      shuffled[index],
    ];
  }

  return shuffled;
}

function uniqueItems(items: any[]): any[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  return items.filter(item => {
    const id = itemId(item);
    const name = itemName(item).toLowerCase();

    if (!id || !name) return false;
    if (seenIds.has(id) || seenNames.has(name)) return false;

    seenIds.add(id);
    seenNames.add(name);
    return true;
  });
}

function distributeRole(
  sourceItems: any[],
  lanes: LookLane[],
  seed: number,
  perLane: number,
): void {
  const shuffled = seededShuffle(sourceItems, seed);
  const counts = lanes.map(() => 0);

  for (let index = 0; index < shuffled.length; index += 1) {
    const laneIndex = index % lanes.length;

    if (counts[laneIndex] >= perLane) continue;

    lanes[laneIndex].items.push(shuffled[index]);
    counts[laneIndex] += 1;
  }
}

function buildLookLanes(
  recommendationPool: any[],
  eventContext: string,
  weatherContext: string,
  refreshSeed: string,
  recentItemIds: string[],
): LookLane[] {
  const recent = new Set(
    recentItemIds.map(cleanText).filter(Boolean),
  );
  const unique = uniqueItems(recommendationPool);
  const fresh = unique.filter(item => !recent.has(itemId(item)));
  const freshFootwear = fresh.filter(
    item => classifyItem(item) === 'footwear',
  );
  const freshApparel = fresh.filter(item =>
    ['one-piece', 'top', 'bottom', 'layer'].includes(
      classifyItem(item),
    ),
  );
  const base =
    freshFootwear.length >= 3 && freshApparel.length >= 6
      ? fresh
      : unique;
  const seed = hashString(
    `${eventContext}|${weatherContext}|${refreshSeed}`,
  );
  const lanes: LookLane[] = [
    { index: 0, items: [] },
    { index: 1, items: [] },
    { index: 2, items: [] },
  ];

  const roleLimits: Record<ItemRole, number> = {
    footwear: 6,
    'one-piece': 6,
    top: 6,
    bottom: 6,
    layer: 3,
    accessory: 3,
    other: 0,
  };

  (
    [
      'footwear',
      'one-piece',
      'top',
      'bottom',
      'layer',
      'accessory',
    ] as ItemRole[]
  ).forEach((role, roleIndex) => {
    distributeRole(
      base.filter(item => classifyItem(item) === role),
      lanes,
      seed + roleIndex * 977,
      roleLimits[role],
    );
  });

  return lanes.map(lane => ({
    ...lane,
    items: seededShuffle(
      lane.items,
      seed + lane.index * 3571,
    ),
  }));
}

function candidateDescription(item: any): string {
  const metadata = [
    item?.color && `color=${cleanText(item.color)}`,
    item?.generalMaterial &&
      `material=${cleanText(item.generalMaterial)}`,
    item?.season && `season=${cleanText(item.season)}`,
    item?.formality && `formality=${cleanText(item.formality)}`,
    item?.eventCategory &&
      `events=${cleanText(
        Array.isArray(item.eventCategory)
          ? item.eventCategory.join(', ')
          : item.eventCategory,
      )}`,
    item?.styleKeywords &&
      `style=${cleanText(
        Array.isArray(item.styleKeywords)
          ? item.styleKeywords.join(', ')
          : item.styleKeywords,
      )}`,
  ]
    .filter(Boolean)
    .join('; ')
    .slice(0, 320);

  return `ID=${itemId(item)} | role=${classifyItem(
    item,
  )} | name=${itemName(item)}${
    metadata ? ` | ${metadata}` : ''
  }`;
}

function resolveCompleteLook(
  requestedIds: string[],
  laneItems: any[],
  foundationMode: "one-piece" | "separates",
): any[] {
  const laneById = new Map(
    laneItems.map(item => [itemId(item), item]),
  );
  const requested = requestedIds
    .map(id => laneById.get(cleanText(id)))
    .filter(Boolean) as any[];
  const selected: any[] = [];
  const selectedIds = new Set<string>();

  const add = (item: any) => {
    const id = itemId(item);
    if (!id || selectedIds.has(id)) return;
    selectedIds.add(id);
    selected.push(item);
  };

  const firstRequested = (role: ItemRole) =>
    requested.find(item => classifyItem(item) === role);
  const firstLane = (role: ItemRole) =>
    laneItems.find(item => classifyItem(item) === role);

  const footwear =
    firstRequested('footwear') || firstLane('footwear');
  const onePiece =
    foundationMode === "one-piece"
      ? firstRequested('one-piece') ||
        firstLane('one-piece')
      : null;

  if (onePiece) {
    add(onePiece);

    const companion =
      firstRequested('accessory') ||
      firstRequested('layer') ||
      firstLane('accessory') ||
      firstLane('layer');

    if (companion) add(companion);
  } else {
    const top = firstRequested('top') || firstLane('top');
    const bottom =
      firstRequested('bottom') || firstLane('bottom');

    if (top && bottom) {
      add(top);
      add(bottom);
    } else {
      const fallbackOnePiece = firstLane('one-piece');
      if (fallbackOnePiece) add(fallbackOnePiece);
      if (!fallbackOnePiece && top) add(top);
      if (!fallbackOnePiece && bottom) add(bottom);
    }
  }

  if (footwear) add(footwear);

  return selected.slice(0, 3);
}

function fallbackRecommendations(
  lanes: LookLane[],
  eventContext: string,
  weatherContext: string,
  climate: Climate,
) {
  const eventName =
    cleanText(eventContext) || 'Style Curation';
  const location = inferLocation(eventName, weatherContext);
  const weather =
    cleanText(weatherContext) || 'Weather unavailable';
  const archetypes = [
    'Closet Discovery: Refined Foundation',
    'Closet Discovery: Texture and Proportion',
    'Closet Discovery: Event-Ready Contrast',
  ];

  return lanes.map((lane, index) => {
    const selected = resolveCompleteLook(
      [],
      lane.items,
      index === 0 ? "one-piece" : "separates",
    );

    return {
      eventName,
      eventTime: 'Now',
      location,
      destinationName: location,
      destinationImageQuery: `${location} ${eventName} fashion`,
      destinationReason:
        'Built from the selected event and weather context.',
      weatherTag:
        climate.tempC === null
          ? climate.tier
          : `${climate.tier} • ${climate.tempC}°C`,
      weather,
      outfitIdea: archetypes[index],
      reasoning:
        'A server-validated closet combination was used because AI generation was unavailable. Every displayed item is an exact Firestore wardrobe item selected from a separate candidate lane.',
      itemIds: selected.map(itemId),
      items: selected.map(itemName),
      selectedItems: selected.map(item => ({
        id: itemId(item),
        itemName: itemName(item),
        itemType: itemType(item),
        role: classifyItem(item),
        imageUrl: item?.imageUrl || item?.image || item?.url || null,
      })),
      colorPalette: 'Closet-led palette',
      clothingName:
        itemName(
          selected.find(item => classifyItem(item) !== 'footwear'),
        ) || 'Wardrobe Item',
      clothingImageUrl: null,
      footwearName:
        itemName(
          selected.find(item => classifyItem(item) === 'footwear'),
        ) || 'Footwear',
      footwearImageUrl: null,
      city: location.split(',')[0],
      temp:
        climate.tempC === null
          ? '--'
          : `${climate.tempC}°C`,
    };
  });
}

export async function getDailyOutfitsAction(
  eventContext: string = '',
  weatherContext: string = '',
  refreshSeed: string = '',
  recentItemIds: string[] = [],
) {
  const climate = getClimate(weatherContext);
  const db = getAdminDb();
  const inventory = await scanWardrobeInventory(db, {
    pageSize: 250,
    sampleSize: 900,
    seed: `${eventContext}|${weatherContext}|${refreshSeed}`,
  });
  const closetItems = inventory.items;

  console.log(
    `Outfit inventory scan: ${inventory.scannedCount} documents across ${inventory.pageCount} page(s); ${closetItems.length} bounded candidates retained.`,
  );

  const validItems = closetItems.filter(item => {
    const id = itemId(item);
    const name = itemName(item);
    const type = itemType(item);
    const text = `${type} ${name}`.toLowerCase();
    const isBag = /\b(bag|handbag|purse|clutch|tote)\b/.test(text);
    const role = classifyItem(item);

    return (
      Boolean(id && name) &&
      !isBag &&
      role !== 'other' &&
      isWeatherEligible(
        item,
        climate,
        weatherContext,
        eventContext,
      )
    );
  });

  if (validItems.length === 0) {
    return [];
  }

  const eventName =
    cleanText(eventContext) || 'Style Curation';
  const weather =
    cleanText(weatherContext) || 'Weather unavailable';
  const location = inferLocation(eventName, weather);
  const lanes = buildLookLanes(
    validItems,
    eventName,
    weather,
    refreshSeed || String(Date.now()),
    recentItemIds,
  );

  if (
    lanes.some(
      lane =>
        !lane.items.some(
          item => classifyItem(item) === 'footwear',
        ),
    )
  ) {
    console.warn(
      'One or more recommendation lanes do not contain footwear. The closet may not have three distinct eligible footwear items.',
    );
  }

  const laneInventory = lanes
    .map(
      lane => `LOOK ${lane.index + 1} CANDIDATE LANE:\n${lane.items
        .map(candidateDescription)
        .join('\n')}`,
    )
    .join('\n\n');
  const currentDate = new Date().toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );
  const weatherRule =
    climate.tier === 'hot'
      ? 'Do not select boots, heavy coats, wool, cashmere, alpaca, thermal layers, fleece, fur, parkas, or winter-weight pieces.'
      : climate.tier === 'cold'
        ? 'Do not select open sandals or other clearly cold-inappropriate pieces.'
        : 'Choose pieces appropriate for the supplied weather.';
  const swimwearRule = eventAllowsSwimwear(eventName)
    ? 'Swimwear may be selected only when it is appropriate for the explicitly stated swim or resort activity.'
    : 'Do not select bikinis, swimsuits, swimwear, bathing suits, or other pool and beach garments.';
  const prompt = `
You are the SkoMiDora luxury wardrobe recommendation engine.

DATE: ${currentDate}
EVENT: ${eventName}
LOCATION: ${location}
VERIFIED WEATHER CONTEXT: ${weather}
CLIMATE: ${climate.tier}${
    climate.tempC === null ? '' : ` (${climate.tempC}°C)`
  }

${weatherRule}
${swimwearRule}

Return exactly three differentiated looks for this same event.

INVENTORY RULES:
1. Look 1 may use IDs only from LOOK 1 CANDIDATE LANE.
2. Look 2 may use IDs only from LOOK 2 CANDIDATE LANE.
3. Look 3 may use IDs only from LOOK 3 CANDIDATE LANE.
4. Return exact Firestore IDs in itemIds. Never return names in itemIds.
5. Each look must contain exactly three items: exactly two wardrobe pieces followed by exactly one footwear item.
6. Look 1 must use a dress, jumpsuit, suit, or other one-piece foundation plus one appropriate accessory or light layer.
7. Look 2 must use one top plus one bottom and may not use a one-piece.
8. Look 3 must use a different top plus a different bottom and may not use a one-piece.
9. Do not add a fourth item.
10. Do not invent an item or move an item between lanes.
11. Explain the event, weather, silhouette, color, and material logic.

${laneInventory}
`;

  let generated;

  try {
    generated = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: recommendationSchema,
      prompt,
      temperature: 0.65,
    });
  } catch (error) {
    console.error(
      'Daily outfit generation failed; using validated closet fallback:',
      error,
    );

    return fallbackRecommendations(
      lanes,
      eventName,
      weather,
      climate,
    );
  }

  const aiRecommendations =
    generated.object.recommendations.slice(0, 3);

  if (aiRecommendations.length !== 3) {
    return fallbackRecommendations(
      lanes,
      eventName,
      weather,
      climate,
    );
  }

  return aiRecommendations.map((recommendation, index) => {
    const lane = lanes[index];
    const selected = resolveCompleteLook(
      recommendation.itemIds,
      lane.items,
      index === 0 ? "one-piece" : "separates",
    );

    return {
      ...recommendation,
      eventName,
      eventTime: recommendation.eventTime || 'Now',
      location,
      destinationName: location,
      destinationImageQuery:
        recommendation.destinationImageQuery ||
        `${location} ${eventName} fashion`,
      destinationReason:
        recommendation.destinationReason ||
        'Built from the selected event and weather context.',
      weatherTag:
        recommendation.weatherTag ||
        (climate.tempC === null
          ? climate.tier
          : `${climate.tier} • ${climate.tempC}°C`),
      weather,
      itemIds: selected.map(itemId),
      items: selected.map(itemName),
      selectedItems: selected.map(item => ({
        id: itemId(item),
        itemName: itemName(item),
        itemType: itemType(item),
        role: classifyItem(item),
        imageUrl: item?.imageUrl || item?.image || item?.url || null,
      })),
      clothingName:
        itemName(
          selected.find(item => classifyItem(item) !== 'footwear'),
        ) || 'Wardrobe Item',
      clothingImageUrl: null,
      footwearName:
        itemName(
          selected.find(item => classifyItem(item) === 'footwear'),
        ) || 'Footwear',
      footwearImageUrl: null,
      city: location.split(',')[0],
      temp:
        climate.tempC === null
          ? '--'
          : `${climate.tempC}°C`,
    };
  });
}
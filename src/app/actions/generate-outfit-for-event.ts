'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

/* ======================================================
   SCHEMA
====================================================== */

const schema = z.object({
  weather: z.string().describe("The calculated weather forecast for this specific location and date"),
  outfitIdea: z.string().describe("A catchy, luxurious title for the outfit"),
  reasoning: z.string().describe("Detailed stylistic reasoning factoring in the event type, location, and specific weather"),
  items: z.array(z.string()).describe("Exact names of the items chosen from the wardrobe"),
  colorPalette: z.string(),
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
   ARRAY SHUFFLER (Breaks the Repetition Loop)
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
   SERVER ACTION
====================================================== */

export async function generateOutfitForEventAction(event: any, closetItems: any[]) {
  if (!closetItems || closetItems.length === 0) {
    throw new Error("Closet is empty. Cannot generate outfit.");
  }

  // Extract explicit event parameters
  const eventName = event.title || event.summary || "Upcoming Event";
  const eventLocation = event.location || "West Memphis, AR";
  
  // Format the exact date to force weather context
  const eventDateRaw = event.start?.dateTime || event.start?.date || new Date().toISOString();
  const eventDateObj = new Date(eventDateRaw);
  const eventDateString = eventDateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
  });

  const uniqueRequestID = Date.now();

  const shuffledCloset = shuffleArray(closetItems);

  const closetText = shuffledCloset
    .map((item) => `- ${item.itemName} (type: ${item.itemType || 'unknown'}, color: ${item.color || 'unknown'})`)
    .join('\n');

  const prompt = `
You are an elite luxury personal stylist.

EVENT CONTEXT:
- Event: ${eventName}
- Date & Time: ${eventDateString}
- Location: ${eventLocation}
- Request ID: ${uniqueRequestID}

YOUR TASK:
1. First, calculate the realistic weather conditions and temperature for ${eventLocation} on ${eventDateString}.
2. Next, review the wardrobe inventory below.
3. Build EXACTLY ONE luxurious, perfect outfit tailored specifically to the calculated weather, the location's cultural vibe, and the nature of the event.

CRITICAL RULES:
- PRIORITIZE VARIETY: Select unique, lesser-used items from the inventory.
- The outfit MUST include exactly one footwear item and exactly one clothing item.
- You must use the EXACT item names from the wardrobe inventory. Do not paraphrase.
- Do not invent items.

WARDROBE INVENTORY:
${closetText}
`;

  const result = await generateObject({
    model: google('gemini-2.5-flash'),
    schema,
    prompt,
    temperature: 0.85, 
  });

  const rec = result.object;
  const fixedNames = correctItemNames(rec.items, closetItems);
  const { footwear, clothing } = pickOneOfEach(fixedNames, closetItems);

  return {
    ...rec,
    items: fixedNames,
    eventName: eventName,
    eventTime: eventDateString,
    location: eventLocation,
    
    footwearName: footwear?.itemName || 'Footwear',
    footwearImageUrl: resolveImage(footwear),
    
    clothingName: clothing?.itemName || 'Wardrobe Item',
    clothingImageUrl: resolveImage(clothing),
  };
}
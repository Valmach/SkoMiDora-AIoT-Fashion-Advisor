'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  STYLIST_TARGET_CATEGORIES,
  getCanonicalWardrobeType,
  getWardrobeCategory,
  type StylistTargetCategory,
} from '@/lib/wardrobe-taxonomy';

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY,
});

const ShoppingRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    suggestedBrand: z.string(),
    itemType: z.string(),
    description: z.string(),
    searchQuery: z.string(),
    closetMatchReason: z.string().optional(),
  }))
});

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'styleai-footwear',
    });
  }

  return getFirestore();
}

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBrand(value: unknown): string {
  return cleanText(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function topValues(values: string[], limit = 8): string[] {
  const counts = new Map<string, number>();

  values
    .map(cleanText)
    .filter(Boolean)
    .forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function normalizeTargetCategory(
  value: string
): StylistTargetCategory {
  const raw = cleanText(value);

  if (
    !raw ||
    raw.toLowerCase() ===
      'any missing piece'
  ) {
    return 'Any Missing Piece';
  }

  const canonicalCategory =
    getWardrobeCategory(
      raw,
      raw,
      raw
    );

  if (
    canonicalCategory &&
    canonicalCategory !== 'Handbags'
  ) {
    return canonicalCategory;
  }

  const compact = raw.toLowerCase();

  if (
    /shoe|boot|sandal|heel|pump|mule|loafer|flat|sneaker|trainer|espadrille|flip[- ]?flop/.test(
      compact
    )
  ) {
    return 'Footwear';
  }

  if (
    /shirt|blouse|tank|t-shirt|tee|sweatshirt|top/.test(
      compact
    )
  ) {
    return 'Tops';
  }

  if (/dress|gown/.test(compact)) {
    return 'Dresses';
  }

  if (/jumpsuit|romper/.test(compact)) {
    return 'Jumpsuits & Rompers';
  }

  if (/suit|set/.test(compact)) {
    return 'Suits & Sets';
  }

  if (
    /trouser|pant|jean|short|skirt|bottom/.test(
      compact
    )
  ) {
    return 'Bottoms';
  }

  if (
    /jacket|coat|outerwear|outwear|blazer|trench/.test(
      compact
    )
  ) {
    return 'Outerwear';
  }

  if (
    /sweater|cardigan|knitwear|jumper/.test(
      compact
    )
  ) {
    return 'Knitwear';
  }

  if (
    /sleep|lounge|pajama|pyjama|innerwear|underwear|robe/.test(
      compact
    )
  ) {
    return 'Sleepwear & Loungewear';
  }

  if (/activewear|athletic/.test(compact)) {
    return 'Activewear';
  }

  if (/swimwear|swimsuit|bikini|resort/.test(compact)) {
    return 'Swimwear';
  }

  if (/jewel|earring|ring|necklace|bracelet/.test(compact)) {
    return 'Jewelry';
  }

  if (/accessor|scarf|hat|watch|belt|eyewear/.test(compact)) {
    return 'Accessories';
  }

  return 'Any Missing Piece';
}

function brandIsInCloset(brand: string, favoriteDesigners: string[]): boolean {
  const normalized = brand.toLowerCase().trim();

  return favoriteDesigners.some((designer) => {
    const d = designer.toLowerCase().trim();
    return normalized === d || normalized.includes(d) || d.includes(normalized);
  });
}

function chooseClosetDesigner(index: number, favoriteDesigners: string[]): string {
  if (!favoriteDesigners.length) return '';
  return favoriteDesigners[index % favoriteDesigners.length];
}


function buildShoppingUrl(query: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

function fallbackShoppingRecommendations(
  targetCategory: string,
  eventContext: string,
  weatherContext: string,
  closetBrands: string[]
) {
  const category = normalizeTargetCategory(targetCategory);
  const event = cleanText(eventContext) || "General Wardrobe Refresh";
  const weather = cleanText(weatherContext) || "current weather";

  const brands = closetBrands.length
    ? closetBrands.slice(0, 6)
    : ["Zimmermann", "Gabriela Hearst", "Stella McCartney", "Loewe", "Maison Margiela", "Stuart Weitzman"];

  const categorySearch =
    category === "Any Missing Piece"
      ? "luxury outfit finishing piece"
      : category;

  return brands.slice(0, 3).map((brand, index) => {
    const searchQuery = `${brand} ${categorySearch} ${event} ${weather}`.trim();

    return {
      suggestedBrand: brand,
      itemType: category,
      description:
        index === 0
          ? `Shop ${brand} first because this designer already appears in the closet and keeps the recommendation aligned with the user's existing wardrobe.`
          : `Use ${brand} as a closet-matched alternative for ${categorySearch}, tuned to the event and weather context.`,
      searchQuery,
      closetMatchReason: `${brand} was selected from the user's closet designer profile, not from a generic luxury list.`,
      shopUrl: buildShoppingUrl(searchQuery),
    };
  });
}

export async function generateShoppingRecommendations(
  eventContext: string,
  weatherContext: string,
  targetCategory: string = 'Any Missing Piece'
) {
  console.log('=========================================');
  console.log('�� STYLIST ACTION TRIGGERED');
  console.log(`🎯 Target Category: ${targetCategory}`);
  console.log(`📍 Context: ${eventContext} | ⛅ Weather: ${weatherContext}`);

  try {
    const db = getAdminDb();
    console.log('✅ Firebase Admin Initialized');

    const snapshot = await db
      .collection('publicWardrobeItems')
      .limit(300)
      .get();

    console.log(`📦 Found ${snapshot.size} items in publicWardrobeItems`);

    const closetItems = snapshot.docs.map((doc) => doc.data());

    const designers = closetItems
      .map((item) => normalizeBrand(item.designer || item.designerName || item.brand || item.manufacturer))
      .filter(Boolean);

    const itemTypes = closetItems
      .map((item) => {
        const name = cleanText(
          item.aiFriendlyName ||
          item.itemName ||
          item.name
        );

        return (
          getWardrobeCategory(
            item.category,
            item.itemType || item.type,
            name
          ) || ''
        );
      })
      .filter(Boolean);

    const colors = closetItems
      .map((item) => cleanText(item.color))
      .filter(Boolean);

    const materials = closetItems
      .map((item) => cleanText(item.generalMaterial || item.materials || item.material))
      .filter(Boolean);

    const keywords = closetItems
      .flatMap((item) => Array.isArray(item.styleKeywords) ? item.styleKeywords : [])
      .map(cleanText)
      .filter(Boolean);

    const favoriteDesigners = topValues(designers, 10);
    const favoriteTypes = topValues(itemTypes, 12);
    const favoriteColors = topValues(colors, 10);
    const favoriteMaterials = topValues(materials, 10);
    const favoriteKeywords = topValues(keywords, 16);

    let currentWardrobe = 'The closet is currently empty.';

    if (closetItems.length > 0) {
      currentWardrobe = closetItems
        .slice(0, 120)
        .map((item) => {
          const name = cleanText(item.aiFriendlyName || item.itemName || item.name || 'Unnamed luxury item');
          const designer = normalizeBrand(item.designer || item.designerName || item.brand || item.manufacturer);
          const rawType = cleanText(
            item.itemType ||
            item.type ||
            item.category
          );
          const type =
            getCanonicalWardrobeType(
              rawType,
              name
            ) ||
            getWardrobeCategory(
              item.category,
              rawType,
              name
            ) ||
            rawType;
          const color = cleanText(item.color);
          const material = cleanText(item.generalMaterial || item.materials || item.material);
          const style = Array.isArray(item.styleKeywords) ? item.styleKeywords.slice(0, 5).join(', ') : '';

          return [
            designer && `Designer: ${designer}`,
            name && `Item: ${name}`,
            type && `Type: ${type}`,
            color && `Color: ${color}`,
            material && `Material: ${material}`,
            style && `Style: ${style}`,
          ].filter(Boolean).join(' | ');
        })
        .filter(Boolean)
        .join('\n');
    }

    const normalizedTargetCategory = normalizeTargetCategory(targetCategory);

    const designerProfile =
      favoriteDesigners.length > 0
        ? favoriteDesigners.join(', ')
        : 'No designer profile found yet. Use adjacent contemporary luxury brands, but explain the aesthetic match.';

    console.log(`👗 Favorite designers: ${designerProfile}`);
    console.log(`👕 Wardrobe string length passed to AI: ${currentWardrobe.length} characters`);

    const prompt = `
You are SkoMiDora's AI Style Consultant and personal shopper.

Event:
"${eventContext || 'General Wardrobe Update'}"

Weather:
${weatherContext || 'Provide versatile recommendations.'}

Target category:
"${normalizedTargetCategory}"

Approved canonical target categories:
${STYLIST_TARGET_CATEGORIES.join(', ')}

The user's existing closet designer DNA:
${designerProfile}

Closet category profile:
${favoriteTypes.join(', ') || 'No category profile found'}

Closet color palette:
${favoriteColors.join(', ') || 'No color profile found'}

Closet material profile:
${favoriteMaterials.join(', ') || 'No material profile found'}

Closet aesthetic keywords:
${favoriteKeywords.join(', ') || 'No aesthetic keywords found'}

Existing wardrobe inventory:
${currentWardrobe}

MISSION:
Return exactly 3 Shop The Look recommendations.

STRICT RULES:
1. The recommendations must match the user's existing designer DNA.
2. Prefer designers already found in the closet: ${designerProfile}.
3. Do not recommend random brands unless there is no strong closet designer match.
4. If you recommend an adjacent designer, explain why it matches the user's closet aesthetic.
5. If the target category is not "Any Missing Piece", all 3 recommendations must be that category.
6. If the target is "Any Missing Piece", recommend missing pieces that complete the event look.
7. Use the weather and event context.
8. The searchQuery must include the suggestedBrand, itemType, and event/style context.
9. The description must explicitly say how this recommendation connects to the user's existing closet designers, colors, materials, or style keywords.
10. Use only the approved canonical target-category names supplied above.

Return only structured JSON matching the schema.
`;

    console.log('🧠 Sending designer-aware prompt to Gemini 2.5 Flash...');

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: ShoppingRecommendationSchema,
      prompt,
      temperature: 0.45,
    });

    console.log('✨ Gemini Response Received:');
    console.log(JSON.stringify(object, null, 2));

    if (!object?.recommendations?.length) {
      throw new Error('AI returned empty recommendations.');
    }

    const materializedLinks = object.recommendations.slice(0, 3).map((rec, index) => {
      const currentBrand = cleanText(rec.suggestedBrand);
      const closetDesigner = chooseClosetDesigner(index, favoriteDesigners);

      const finalBrand =
        favoriteDesigners.length > 0 && !brandIsInCloset(currentBrand, favoriteDesigners)
          ? closetDesigner
          : currentBrand || closetDesigner || 'Luxury designer';

      const suggestedItemType =
        getCanonicalWardrobeType(
          cleanText(rec.itemType)
        ) ||
        normalizeTargetCategory(
          cleanText(rec.itemType)
        );

      const finalItemType =
        normalizedTargetCategory !==
        'Any Missing Piece'
          ? normalizedTargetCategory
          : suggestedItemType !==
              'Any Missing Piece'
            ? suggestedItemType
            : 'Missing Piece';

      const closetReason =
        rec.closetMatchReason ||
        (favoriteDesigners.length > 0
          ? `Matched to your closet designer profile: ${favoriteDesigners.slice(0, 5).join(', ')}.`
          : 'Matched to the closet aesthetic profile.');

      const finalDescription = cleanText(rec.description).includes(finalBrand)
        ? cleanText(rec.description)
        : `${closetReason} ${cleanText(rec.description)}`;

      const searchQuery = `${finalBrand} ${finalItemType} ${eventContext || ''} ${favoriteColors.slice(0, 3).join(' ')} ${favoriteMaterials.slice(0, 2).join(' ')}`.trim();

      return {
        ...rec,
        suggestedBrand: finalBrand,
        itemType: finalItemType,
        description: finalDescription,
        closetMatchReason: closetReason,
        searchQuery,
        shopUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`,
      };
    });

    console.log('✅ Success! Sending designer-matched links to frontend.');
    console.log('=========================================');

    return { success: true, recommendations: materializedLinks };
  } catch (error: any) {
    console.error('❌ FATAL STYLIST ERROR:', error);

    try {
      const db = getAdminDb();

      const fallbackSnapshot = await db
        .collection('publicWardrobeItems')
        .limit(120)
        .get();

      const fallbackClosetItems = fallbackSnapshot.docs.map((doc) => doc.data());

      const fallbackDesigners = topValues(
        fallbackClosetItems
          .map((item: any) => normalizeBrand(item.designer || item.designerName || item.brand || item.manufacturer))
          .filter(Boolean),
        10
      );

      const fallbackRecommendations = fallbackShoppingRecommendations(
        targetCategory,
        eventContext,
        weatherContext,
        fallbackDesigners
      );

      console.log('✅ AI stylist fallback generated closet-designer shopping links.');

      return {
        success: true,
        fallback: true,
        error: `AI stylist fallback used because Gemini failed: ${error.message || String(error)}`,
        recommendations: fallbackRecommendations,
      };
    } catch (fallbackError: any) {
      console.error('❌ STYLIST FALLBACK ALSO FAILED:', fallbackError);

      return {
        success: false,
        error: `CRASH REASON: ${error.message || String(error)} | FALLBACK REASON: ${fallbackError.message || String(fallbackError)}`,
        recommendations: [],
      };
    }
  }
}

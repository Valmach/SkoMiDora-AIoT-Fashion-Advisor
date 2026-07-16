'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

import {
  WARDROBE_TYPES,
  type WardrobeType,
} from '@/lib/wardrobe-taxonomy';

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY,
});

const WardrobeTypeSchema = z.enum(WARDROBE_TYPES);

const ShoppingRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      suggestedBrand: z.string(),
      itemType: WardrobeTypeSchema,
      description: z.string(),
      searchQuery: z.string(),
      closetMatchReason: z.string().optional(),
    })
  ),
});

type TargetCategory = WardrobeType | 'Any Missing Piece';

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

/**
 * Converts current and legacy wardrobe itemType values into the shared
 * canonical taxonomy. Unknown or ambiguous group labels return null rather
 * than being forced into an incorrect garment category.
 */
function canonicalizeWardrobeType(value: unknown): WardrobeType | null {
  const raw = cleanText(value);
  if (!raw) return null;

  const compact = raw.toLowerCase();

  const directMatch = WARDROBE_TYPES.find(
    (type) => type.toLowerCase() === compact
  );

  if (directMatch) return directMatch;

  if (/\b(dress|dresses|gown|gowns)\b/.test(compact)) return 'Dress';

  if (
    /\b(t-shirt|t-shirts|tee|tees|sweatshirt|sweatshirts|sweats)\b/.test(
      compact
    )
  ) {
    return 'T-Shirt';
  }

  if (
    /\b(shirt|shirts|blouse|blouses|tank top|tank tops|top|tops|bustier|bustiers)\b/.test(
      compact
    )
  ) {
    return 'Shirt';
  }

  if (/\b(blazer|blazers)\b/.test(compact)) return 'Blazer';
  if (/\b(suit|suits)\b/.test(compact)) return 'Suit';

  if (/\b(jacket|jackets|outerwear)\b/.test(compact)) return 'Jacket';
  if (/\b(coat|coats|parka|parkas|trench|trenches)\b/.test(compact)) {
    return 'Coat';
  }

  if (/\b(jean|jeans|denim)\b/.test(compact)) return 'Jeans';

  if (/\b(trouser|trousers|pant|pants|slack|slacks)\b/.test(compact)) {
    return 'Trousers';
  }

  if (/\b(short|shorts)\b/.test(compact)) return 'Shorts';
  if (/\b(skirt|skirts)\b/.test(compact)) return 'Skirt';

  if (/\b(sneaker|sneakers|trainer|trainers)\b/.test(compact)) {
    return 'Sneakers';
  }

  if (/\b(boot|boots|ankle boot|ankle boots)\b/.test(compact)) {
    return 'Boots';
  }

  if (/\b(heel|heels|stiletto|stilettos|pump|pumps)\b/.test(compact)) {
    return 'Heels';
  }

  if (
    /\b(flat|flats|loafer|loafers|mule|mules|slipper|slippers)\b/.test(
      compact
    )
  ) {
    return 'Flats';
  }

  if (/\b(sandal|sandals)\b/.test(compact)) return 'Sandals';

  if (/\b(handbag|handbags|bag|bags|tote|totes|clutch|clutches)\b/.test(compact)) {
    return 'Bag';
  }

  if (/\b(jewelry|jewellery|jewel|jewels)\b/.test(compact)) {
    return 'Jewelry';
  }

  if (/\b(scarf|scarves|wrap|wraps)\b/.test(compact)) return 'Scarf';
  if (/\b(hat|hats|cap|caps)\b/.test(compact)) return 'Hat';
  if (/\b(watch|watches)\b/.test(compact)) return 'Watch';
  if (/\b(belt|belts)\b/.test(compact)) return 'Belt';

  return null;
}

/**
 * The Stylist UI now sends only WARDROBE_TYPES plus "Any Missing Piece".
 * This function still accepts older labels defensively, but never invents a
 * non-canonical output type.
 */
function normalizeTargetCategory(value: string): TargetCategory {
  const raw = cleanText(value);

  if (!raw || raw.toLowerCase() === 'any missing piece') {
    return 'Any Missing Piece';
  }

  const canonical = canonicalizeWardrobeType(raw);

  if (canonical) {
    return canonical;
  }

  console.warn(
    `Unknown or ambiguous stylist target category "${raw}". Falling back to Any Missing Piece.`
  );

  return 'Any Missing Piece';
}

function brandIsInCloset(
  brand: string,
  favoriteDesigners: string[]
): boolean {
  const normalized = brand.toLowerCase().trim();

  return favoriteDesigners.some((designer) => {
    const d = designer.toLowerCase().trim();
    return (
      normalized === d ||
      normalized.includes(d) ||
      d.includes(normalized)
    );
  });
}

function chooseClosetDesigner(
  index: number,
  favoriteDesigners: string[]
): string {
  if (!favoriteDesigners.length) return '';
  return favoriteDesigners[index % favoriteDesigners.length];
}

function buildShoppingUrl(query: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
    query
  )}`;
}

function getMissingWardrobeTypes(
  closetTypes: WardrobeType[]
): WardrobeType[] {
  const present = new Set<WardrobeType>(closetTypes);

  return WARDROBE_TYPES.filter((type) => !present.has(type));
}

function fallbackShoppingRecommendations(
  targetCategory: string,
  eventContext: string,
  weatherContext: string,
  closetBrands: string[],
  closetTypes: WardrobeType[]
) {
  const category = normalizeTargetCategory(targetCategory);
  const event =
    cleanText(eventContext) || 'General Wardrobe Refresh';
  const weather =
    cleanText(weatherContext) || 'current weather';

  const usingClosetBrands = closetBrands.length > 0;

  const brands = usingClosetBrands
    ? closetBrands.slice(0, 6)
    : [
        'Zimmermann',
        'Gabriela Hearst',
        'Stella McCartney',
        'Loewe',
        'Maison Margiela',
        'Stuart Weitzman',
      ];

  const missingTypes = getMissingWardrobeTypes(closetTypes);

  const fallbackTypePool =
    missingTypes.length > 0
      ? missingTypes
      : [...WARDROBE_TYPES];

  return Array.from({ length: 3 }, (_, index) => {
    const brand = brands[index % brands.length];

    const itemType: WardrobeType =
      category === 'Any Missing Piece'
        ? fallbackTypePool[index % fallbackTypePool.length]
        : category;

    const searchQuery =
      `${brand} ${itemType} ${event} ${weather}`.trim();

    return {
      suggestedBrand: brand,
      itemType,
      description:
        index === 0
          ? usingClosetBrands
            ? `Shop ${brand} first because this designer already appears in the closet and keeps the recommendation aligned with the user's existing wardrobe.`
            : `Explore ${brand} for a ${itemType} that complements the user's wardrobe profile and the current event context.`
          : usingClosetBrands
            ? `Use ${brand} as a closet-matched option for ${itemType}, tuned to the event and weather context.`
            : `Consider ${brand} for a ${itemType} selected to complement the event, weather, and available wardrobe profile.`,
      searchQuery,
      closetMatchReason: usingClosetBrands
        ? `${brand} was selected from the user's closet designer profile.`
        : `${brand} was selected as an adjacent designer because no reliable closet designer profile was available.`,
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
  console.log('🛍️ STYLIST ACTION TRIGGERED');
  console.log(`🎯 Target Category: ${targetCategory}`);
  console.log(
    `📍 Context: ${eventContext} | ⛅ Weather: ${weatherContext}`
  );

  try {
    const db = getAdminDb();
    console.log('✅ Firebase Admin Initialized');

    const snapshot = await db
      .collection('publicWardrobeItems')
      .limit(300)
      .get();

    console.log(
      `📦 Found ${snapshot.size} items in publicWardrobeItems`
    );

    const closetItems = snapshot.docs.map((doc) => doc.data());

    const designers = closetItems
      .map((item) =>
        normalizeBrand(
          item.designer ||
            item.designerName ||
            item.brand ||
            item.manufacturer
        )
      )
      .filter(Boolean);

    const canonicalItemTypes = closetItems
      .map((item) =>
        canonicalizeWardrobeType(
          item.itemType || item.type || item.category
        )
      )
      .filter(
        (type): type is WardrobeType => type !== null
      );

    const colors = closetItems
      .map((item) => cleanText(item.color))
      .filter(Boolean);

    const materials = closetItems
      .map((item) =>
        cleanText(
          item.generalMaterial ||
            item.materials ||
            item.material
        )
      )
      .filter(Boolean);

    const keywords = closetItems
      .flatMap((item) =>
        Array.isArray(item.styleKeywords)
          ? item.styleKeywords
          : []
      )
      .map(cleanText)
      .filter(Boolean);

    const favoriteDesigners = topValues(designers, 10);
    const favoriteTypes = topValues(
      canonicalItemTypes,
      12
    );
    const favoriteColors = topValues(colors, 10);
    const favoriteMaterials = topValues(materials, 10);
    const favoriteKeywords = topValues(keywords, 16);

    const missingWardrobeTypes =
      getMissingWardrobeTypes(canonicalItemTypes);

    let currentWardrobe =
      'The closet is currently empty.';

    if (closetItems.length > 0) {
      currentWardrobe = closetItems
        .slice(0, 120)
        .map((item) => {
          const name = cleanText(
            item.aiFriendlyName ||
              item.itemName ||
              item.name ||
              'Unnamed luxury item'
          );

          const designer = normalizeBrand(
            item.designer ||
              item.designerName ||
              item.brand ||
              item.manufacturer
          );

          const rawType = cleanText(
            item.itemType ||
              item.type ||
              item.category
          );

          const canonicalType =
            canonicalizeWardrobeType(rawType);

          const type =
            canonicalType ||
            rawType ||
            'Uncategorized';

          const color = cleanText(item.color);

          const material = cleanText(
            item.generalMaterial ||
              item.materials ||
              item.material
          );

          const style = Array.isArray(
            item.styleKeywords
          )
            ? item.styleKeywords
                .slice(0, 5)
                .join(', ')
            : '';

          return [
            designer && `Designer: ${designer}`,
            name && `Item: ${name}`,
            type && `Type: ${type}`,
            color && `Color: ${color}`,
            material && `Material: ${material}`,
            style && `Style: ${style}`,
          ]
            .filter(Boolean)
            .join(' | ');
        })
        .filter(Boolean)
        .join('\n');
    }

    const normalizedTargetCategory =
      normalizeTargetCategory(targetCategory);

    const designerProfile =
      favoriteDesigners.length > 0
        ? favoriteDesigners.join(', ')
        : 'No designer profile found yet. Use adjacent contemporary luxury brands, but explain the aesthetic match.';

    console.log(
      `👗 Favorite designers: ${designerProfile}`
    );
    console.log(
      `👕 Wardrobe string length passed to AI: ${currentWardrobe.length} characters`
    );

    const prompt = `
You are SkoMiDora's AI Style Consultant and personal shopper.

Event:
"${eventContext || 'General Wardrobe Update'}"

Weather:
${weatherContext || 'Provide versatile recommendations.'}

Target category:
"${normalizedTargetCategory}"

CANONICAL WARDROBE TAXONOMY:
${WARDROBE_TYPES.join(', ')}

Canonical categories currently represented in the closet:
${favoriteTypes.join(', ') || 'No canonical category profile found'}

Canonical categories currently missing from the closet:
${missingWardrobeTypes.join(', ') || 'None. The closet already contains every canonical category.'}

The user's existing closet designer DNA:
${designerProfile}

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
5. itemType MUST be exactly one value from CANONICAL WARDROBE TAXONOMY.
6. Never return "Any Missing Piece" as itemType. It is a Stylist command, not a wardrobe category.
7. If the target category is not "Any Missing Piece", all 3 recommendations must use itemType exactly "${normalizedTargetCategory}".
8. If the target is "Any Missing Piece", prefer useful categories from the canonical missing-category list. If no categories are missing, choose the most useful underrepresented canonical categories for the event.
9. Use the weather and event context.
10. The searchQuery must include the suggestedBrand, canonical itemType, and event/style context.
11. The description must explicitly say how this recommendation connects to the user's existing closet designers, colors, materials, or style keywords.
12. Do not output legacy grouped labels such as "Shoes", "Dresses", "Skirts", "Jackets & Outerwear", "Shirts & Blouses", "Accessories", or "Outerwear".

Return only structured JSON matching the schema.
`;

    console.log(
      '🧠 Sending taxonomy-aware designer prompt to Gemini 2.5 Flash...'
    );

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: ShoppingRecommendationSchema,
      prompt,
      temperature: 0.45,
    });

    console.log('✨ Gemini Response Received:');
    console.log(JSON.stringify(object, null, 2));

    if (!object?.recommendations?.length) {
      throw new Error(
        'AI returned empty recommendations.'
      );
    }

    const materializedLinks =
      object.recommendations
        .slice(0, 3)
        .map((rec, index) => {
          const currentBrand = cleanText(
            rec.suggestedBrand
          );

          const closetDesigner =
            chooseClosetDesigner(
              index,
              favoriteDesigners
            );

          const finalBrand =
            favoriteDesigners.length > 0 &&
            !brandIsInCloset(
              currentBrand,
              favoriteDesigners
            )
              ? closetDesigner
              : currentBrand ||
                closetDesigner ||
                'Luxury designer';

          const fallbackMissingType =
            missingWardrobeTypes[
              index % Math.max(
                missingWardrobeTypes.length,
                1
              )
            ];

          const finalItemType: WardrobeType =
            normalizedTargetCategory !==
            'Any Missing Piece'
              ? normalizedTargetCategory
              : canonicalizeWardrobeType(
                  rec.itemType
                ) ||
                fallbackMissingType ||
                WARDROBE_TYPES[
                  index % WARDROBE_TYPES.length
                ];

          const closetReason =
            rec.closetMatchReason ||
            (favoriteDesigners.length > 0
              ? `Matched to your closet designer profile: ${favoriteDesigners
                  .slice(0, 5)
                  .join(', ')}.`
              : 'Matched to the closet aesthetic profile.');

          const cleanedDescription =
            cleanText(rec.description);

          const finalDescription =
            cleanedDescription.includes(finalBrand)
              ? cleanedDescription
              : `${closetReason} ${cleanedDescription}`.trim();

          const searchQuery = [
            finalBrand,
            finalItemType,
            eventContext,
            weatherContext,
            favoriteColors
              .slice(0, 3)
              .join(' '),
            favoriteMaterials
              .slice(0, 2)
              .join(' '),
          ]
            .map(cleanText)
            .filter(Boolean)
            .join(' ');

          return {
            ...rec,
            suggestedBrand: finalBrand,
            itemType: finalItemType,
            description: finalDescription,
            closetMatchReason: closetReason,
            searchQuery,
            shopUrl: buildShoppingUrl(
              searchQuery
            ),
          };
        });

    console.log(
      '✅ Success! Sending taxonomy-aligned designer-matched links to frontend.'
    );
    console.log(
      '========================================='
    );

    return {
      success: true,
      recommendations: materializedLinks,
    };
  } catch (error: any) {
    console.error(
      '❌ FATAL STYLIST ERROR:',
      error
    );

    try {
      const db = getAdminDb();

      const fallbackSnapshot = await db
        .collection('publicWardrobeItems')
        .limit(120)
        .get();

      const fallbackClosetItems =
        fallbackSnapshot.docs.map((doc) =>
          doc.data()
        );

      const fallbackDesigners = topValues(
        fallbackClosetItems
          .map((item: any) =>
            normalizeBrand(
              item.designer ||
                item.designerName ||
                item.brand ||
                item.manufacturer
            )
          )
          .filter(Boolean),
        10
      );

      const fallbackTypes =
        fallbackClosetItems
          .map((item: any) =>
            canonicalizeWardrobeType(
              item.itemType ||
                item.type ||
                item.category
            )
          )
          .filter(
            (
              type
            ): type is WardrobeType =>
              type !== null
          );

      const fallbackRecommendations =
        fallbackShoppingRecommendations(
          targetCategory,
          eventContext,
          weatherContext,
          fallbackDesigners,
          fallbackTypes
        );

      console.log(
        '✅ AI stylist fallback generated taxonomy-aligned shopping links.'
      );

      return {
        success: true,
        fallback: true,
        error: `AI stylist fallback used because Gemini failed: ${
          error.message || String(error)
        }`,
        recommendations:
          fallbackRecommendations,
      };
    } catch (fallbackError: any) {
      console.error(
        '❌ STYLIST FALLBACK ALSO FAILED:',
        fallbackError
      );

      return {
        success: false,
        error: `CRASH REASON: ${
          error.message || String(error)
        } | FALLBACK REASON: ${
          fallbackError.message ||
          String(fallbackError)
        }`,
        recommendations: [],
      };
    }
  }
}
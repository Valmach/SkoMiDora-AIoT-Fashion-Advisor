'use server';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

import {
  WARDROBE_CATEGORIES,
  WARDROBE_TYPES,
  WARDROBE_TYPE_TO_CATEGORY,
  type WardrobeCategory,
  type WardrobeType,
} from '@/lib/wardrobe-taxonomy';
import { scanWardrobeInventory } from '@/lib/server/wardrobe-inventory-scan';

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

type TargetCategory =
  | WardrobeCategory
  | 'Any Missing Piece';

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

function topValues(
  values: string[],
  limit = 8
): string[] {
  const counts =
    new Map<string, number>();

  values
    .map(cleanText)
    .filter(Boolean)
    .forEach((value) => {
      counts.set(
        value,
        (counts.get(value) || 0) + 1
      );
    });

  return Array.from(
    counts.entries()
  )
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        a[0].localeCompare(b[0])
    )
    .slice(0, limit)
    .map(([value]) => value);
}

/**
 * Converts current and legacy wardrobe itemType values into
 * the shared canonical item-type taxonomy.
 *
 * Unknown or ambiguous values return null rather than being
 * forced into an incorrect garment type.
 */
function canonicalizeWardrobeType(
  value: unknown
): WardrobeType | null {
  const raw = cleanText(value);

  if (!raw) {
    return null;
  }

  const compact =
    raw.toLowerCase();

  /*
   * First accept every exact value from the shared taxonomy.
   *
   * This supports both existing values and the expanded taxonomy:
   * Pajama Set, Jumpsuit, Trainers, Pumps, Ankle Boots, etc.
   */
  const directMatch =
    WARDROBE_TYPES.find(
      (type) =>
        type.toLowerCase() ===
        compact
    );

  if (directMatch) {
    return directMatch;
  }

  /*
   * Legacy / alternate terminology.
   */

  if (
    /\b(dress|dresses|gown|gowns)\b/.test(
      compact
    )
  ) {
    return 'Dress';
  }

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

  if (
    /\b(blazer|blazers)\b/.test(
      compact
    )
  ) {
    return 'Blazer';
  }

  if (
    /\b(suit|suits)\b/.test(
      compact
    )
  ) {
    return 'Suit';
  }

  if (
    /\b(jacket|jackets|outerwear)\b/.test(
      compact
    )
  ) {
    return 'Jacket';
  }

  if (
    /\b(coat|coats|parka|parkas|trench|trenches)\b/.test(
      compact
    )
  ) {
    return 'Coat';
  }

  if (
    /\b(jean|jeans|denim)\b/.test(
      compact
    )
  ) {
    return 'Jeans';
  }

  if (
    /\b(trouser|trousers|pant|pants|slack|slacks)\b/.test(
      compact
    )
  ) {
    return 'Trousers';
  }

  if (
    /\b(short|shorts)\b/.test(
      compact
    )
  ) {
    return 'Shorts';
  }

  if (
    /\b(skirt|skirts)\b/.test(
      compact
    )
  ) {
    return 'Skirt';
  }

  if (
    /\b(sneaker|sneakers|trainer|trainers)\b/.test(
      compact
    )
  ) {
    return 'Sneakers';
  }

  if (
    /\b(boot|boots|ankle boot|ankle boots)\b/.test(
      compact
    )
  ) {
    return 'Boots';
  }

  if (
    /\b(heel|heels|stiletto|stilettos|pump|pumps)\b/.test(
      compact
    )
  ) {
    return 'Heels';
  }

  if (
    /\b(flat|flats|loafer|loafers|mule|mules|slipper|slippers)\b/.test(
      compact
    )
  ) {
    return 'Flats';
  }

  if (
    /\b(sandal|sandals)\b/.test(
      compact
    )
  ) {
    return 'Sandals';
  }

  if (
    /\b(handbag|handbags|bag|bags|tote|totes|clutch|clutches)\b/.test(
      compact
    )
  ) {
    return 'Bag';
  }

  if (
    /\b(jewelry|jewellery|jewel|jewels)\b/.test(
      compact
    )
  ) {
    return 'Jewelry';
  }

  if (
    /\b(scarf|scarves|wrap|wraps)\b/.test(
      compact
    )
  ) {
    return 'Scarf';
  }

  if (
    /\b(hat|hats|cap|caps)\b/.test(
      compact
    )
  ) {
    return 'Hat';
  }

  if (
    /\b(watch|watches)\b/.test(
      compact
    )
  ) {
    return 'Watch';
  }

  if (
    /\b(belt|belts)\b/.test(
      compact
    )
  ) {
    return 'Belt';
  }

  return null;
}

/**
 * Returns every canonical itemType belonging to a shared
 * top-level wardrobe category.
 *
 * Example:
 *
 * category = "Footwear"
 *
 * returns:
 * Trainers, Sneakers, Boots, Ankle Boots, Booties,
 * Heels, Stilettos, Pumps, Mules, Sandals,
 * Loafers, Flats, Slippers, etc.
 */
function getWardrobeTypesForCategory(
  category: WardrobeCategory
): WardrobeType[] {
  return WARDROBE_TYPES.filter(
    (type) =>
      WARDROBE_TYPE_TO_CATEGORY[type] ===
      category
  );
}

/**
 * The AI Stylist now sends shared TOP-LEVEL wardrobe categories.
 *
 * Examples:
 *
 * Footwear
 * Tops
 * Bottoms
 * Dresses
 * Sleepwear & Loungewear
 *
 * Older callers that still send a specific itemType are accepted
 * defensively and mapped to their correct top-level category.
 *
 * Examples:
 *
 * Sneakers -> Footwear
 * Trainers -> Footwear
 * Dress    -> Dresses
 * Pajama Set -> Sleepwear & Loungewear
 */
function normalizeTargetCategory(
  value: string
): TargetCategory {
  const raw =
    cleanText(value);

  if (
    !raw ||
    raw.toLowerCase() ===
      'any missing piece'
  ) {
    return 'Any Missing Piece';
  }

  /*
   * Preferred path:
   * The current AI Stylist sends a canonical top-level category.
   */
  const canonicalCategory =
    WARDROBE_CATEGORIES.find(
      (category) =>
        category.toLowerCase() ===
        raw.toLowerCase()
    );

  if (canonicalCategory) {
    return canonicalCategory;
  }

  /*
   * Backward compatibility:
   * A legacy caller may still send a specific itemType.
   */
  const legacyType =
    canonicalizeWardrobeType(
      raw
    );

  if (legacyType) {
    return WARDROBE_TYPE_TO_CATEGORY[
      legacyType
    ];
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
  const normalized =
    brand
      .toLowerCase()
      .trim();

  return favoriteDesigners.some(
    (designer) => {
      const d =
        designer
          .toLowerCase()
          .trim();

      return (
        normalized === d ||
        normalized.includes(d) ||
        d.includes(normalized)
      );
    }
  );
}

function chooseClosetDesigner(
  index: number,
  favoriteDesigners: string[]
): string {
  if (
    !favoriteDesigners.length
  ) {
    return '';
  }

  return favoriteDesigners[
    index %
      favoriteDesigners.length
  ];
}

function buildShoppingUrl(
  query: string
): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
    query
  )}`;
}

function getMissingWardrobeTypes(
  closetTypes: WardrobeType[]
): WardrobeType[] {
  const present =
    new Set<WardrobeType>(
      closetTypes
    );

  return WARDROBE_TYPES.filter(
    (type) =>
      !present.has(type)
  );
}

/**
 * Generates safe non-AI fallback recommendations.
 *
 * A target category is NEVER returned directly as itemType.
 *
 * Example:
 *
 * targetCategory = Footwear
 *
 * valid itemType results:
 * Trainers
 * Pumps
 * Boots
 *
 * invalid:
 * Footwear
 */
function fallbackShoppingRecommendations(
  targetCategory: string,
  eventContext: string,
  weatherContext: string,
  closetBrands: string[],
  closetTypes: WardrobeType[]
) {
  const category =
    normalizeTargetCategory(
      targetCategory
    );

  const event =
    cleanText(eventContext) ||
    'General Wardrobe Refresh';

  const weather =
    cleanText(weatherContext) ||
    'current weather';

  const usingClosetBrands =
    closetBrands.length > 0;

  const brands =
    usingClosetBrands
      ? closetBrands.slice(
          0,
          6
        )
      : [
          'Zimmermann',
          'Gabriela Hearst',
          'Stella McCartney',
          'Loewe',
          'Maison Margiela',
          'Stuart Weitzman',
        ];

  const missingTypes =
    getMissingWardrobeTypes(
      closetTypes
    );

  return Array.from(
    {
      length: 3,
    },
    (
      _,
      index
    ) => {
      const brand =
        brands[
          index %
            brands.length
        ];

      let itemType:
        WardrobeType;

      /*
       * Any Missing Piece:
       *
       * Prefer globally missing item types.
       */
      if (
        category ===
        'Any Missing Piece'
      ) {
        const fallbackTypePool =
          missingTypes.length > 0
            ? missingTypes
            : [
                ...WARDROBE_TYPES,
              ];

        itemType =
          fallbackTypePool[
            index %
              fallbackTypePool.length
          ];
      } else {
        /*
         * A broad category was selected.
         *
         * Example:
         * Footwear
         *
         * Resolve the category into valid specific itemTypes.
         */
        const categoryTypes =
          getWardrobeTypesForCategory(
            category
          );

        /*
         * Prefer subtypes that are not already represented
         * in the user's closet.
         */
        const missingCategoryTypes =
          categoryTypes.filter(
            (type) =>
              !closetTypes.includes(
                type
              )
          );

        /*
         * Defensive fallback in case the taxonomy map
         * is unexpectedly incomplete.
         */
        const typePool =
          missingCategoryTypes.length > 0
            ? missingCategoryTypes
            : categoryTypes.length > 0
              ? categoryTypes
              : [
                  ...WARDROBE_TYPES,
                ];

        itemType =
          typePool[
            index %
              typePool.length
          ];
      }

      const searchQuery =
        `${brand} ${itemType} ${event} ${weather}`.trim();

      return {
        suggestedBrand:
          brand,

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

        closetMatchReason:
          usingClosetBrands
            ? `${brand} was selected from the user's closet designer profile.`
            : `${brand} was selected as an adjacent designer because no reliable closet designer profile was available.`,

        shopUrl:
          buildShoppingUrl(
            searchQuery
          ),
      };
    }
  );
}

export async function generateShoppingRecommendations(
  eventContext: string,
  weatherContext: string,
  targetCategory: string =
    'Any Missing Piece'
) {
  console.log(
    '========================================='
  );

  console.log(
    '🛍️ STYLIST ACTION TRIGGERED'
  );

  console.log(
    `🎯 Target Category: ${targetCategory}`
  );

  console.log(
    `📍 Context: ${eventContext} | ⛅ Weather: ${weatherContext}`
  );

  try {
    const db =
      getAdminDb();

    console.log(
      '✅ Firebase Admin Initialized'
    );

    /*
     * Read the live Digital Closet.
     */
    const inventory = await scanWardrobeInventory(db, {
      pageSize: 250,
      sampleSize: 600,
      seed: `consultant|${eventContext}|${weatherContext}|${targetCategory}`,
    });

    console.log(
      `📦 Scanned ${inventory.scannedCount} closet items across ${inventory.pageCount} page(s); retained ${inventory.items.length} representative profile items.`
    );

    const closetItems = inventory.items;

    /*
     * ---------------------------------------------------------
     * DESIGNER PROFILE
     * ---------------------------------------------------------
     */

    const designers =
      closetItems
        .map(
          (item) =>
            normalizeBrand(
              item.designer ||
                item.designerName ||
                item.brand ||
                item.manufacturer
            )
        )
        .filter(Boolean);

    /*
     * ---------------------------------------------------------
     * CANONICAL ITEM TYPES
     * ---------------------------------------------------------
     *
     * Prefer itemType.
     *
     * type and category remain defensive fallbacks for older
     * documents created before the canonical schema was adopted.
     */

    const canonicalItemTypes =
      closetItems
        .map(
          (item) =>
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

    /*
     * ---------------------------------------------------------
     * COLOR PROFILE
     * ---------------------------------------------------------
     */

    const colors =
      closetItems
        .map(
          (item) =>
            cleanText(
              item.color
            )
        )
        .filter(Boolean);

    /*
     * ---------------------------------------------------------
     * MATERIAL PROFILE
     * ---------------------------------------------------------
     */

    const materials =
      closetItems
        .map(
          (item) =>
            cleanText(
              item.generalMaterial ||
                item.materials ||
                item.material
            )
        )
        .filter(Boolean);

    /*
     * ---------------------------------------------------------
     * STYLE KEYWORDS
     * ---------------------------------------------------------
     */

    const keywords =
      closetItems
        .flatMap(
          (item) =>
            Array.isArray(
              item.styleKeywords
            )
              ? item.styleKeywords
              : []
        )
        .map(cleanText)
        .filter(Boolean);

    /*
     * ---------------------------------------------------------
     * CLOSET DNA
     * ---------------------------------------------------------
     */

    const favoriteDesigners =
      topValues(
        designers,
        10
      );

    const favoriteTypes =
      topValues(
        canonicalItemTypes,
        12
      );

    const favoriteColors =
      topValues(
        colors,
        10
      );

    const favoriteMaterials =
      topValues(
        materials,
        10
      );

    const favoriteKeywords =
      topValues(
        keywords,
        16
      );

    const missingWardrobeTypes =
      getMissingWardrobeTypes(
        canonicalItemTypes
      );

    /*
     * ---------------------------------------------------------
     * BUILD CLOSET INVENTORY FOR AI
     * ---------------------------------------------------------
     */

    let currentWardrobe =
      'The closet is currently empty.';

    if (
      closetItems.length > 0
    ) {
      currentWardrobe =
        closetItems
          .slice(
            0,
            120
          )
          .map(
            (item) => {
              const name =
                cleanText(
                  item.aiFriendlyName ||
                    item.itemName ||
                    item.name ||
                    'Unnamed luxury item'
                );

              const designer =
                normalizeBrand(
                  item.designer ||
                    item.designerName ||
                    item.brand ||
                    item.manufacturer
                );

              const rawType =
                cleanText(
                  item.itemType ||
                    item.type ||
                    item.category
                );

              const canonicalType =
                canonicalizeWardrobeType(
                  rawType
                );

              const type =
                canonicalType ||
                rawType ||
                'Uncategorized';

              const color =
                cleanText(
                  item.color
                );

              const material =
                cleanText(
                  item.generalMaterial ||
                    item.materials ||
                    item.material
                );

              const style =
                Array.isArray(
                  item.styleKeywords
                )
                  ? item.styleKeywords
                      .slice(
                        0,
                        5
                      )
                      .join(
                        ', '
                      )
                  : '';

              return [
                designer &&
                  `Designer: ${designer}`,

                name &&
                  `Item: ${name}`,

                type &&
                  `Type: ${type}`,

                color &&
                  `Color: ${color}`,

                material &&
                  `Material: ${material}`,

                style &&
                  `Style: ${style}`,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' | '
                );
            }
          )
          .filter(Boolean)
          .join(
            '\n'
          );
    }

    /*
     * ---------------------------------------------------------
     * TARGET CATEGORY
     * ---------------------------------------------------------
     *
     * normalizedTargetCategory is a BROAD category:
     *
     * Footwear
     * Tops
     * Bottoms
     * Dresses
     * etc.
     */

    const normalizedTargetCategory =
      normalizeTargetCategory(
        targetCategory
      );

    /*
     * Convert the broad selected category into the specific
     * itemTypes Gemini is permitted to recommend.
     *
     * Any Missing Piece can use the complete item-type taxonomy.
     */
    const allowedTargetTypes:
      WardrobeType[] =
      normalizedTargetCategory ===
      'Any Missing Piece'
        ? [
            ...WARDROBE_TYPES,
          ]
        : getWardrobeTypesForCategory(
            normalizedTargetCategory
          );

    const designerProfile =
      favoriteDesigners.length > 0
        ? favoriteDesigners.join(
            ', '
          )
        : 'No designer profile found yet. Use adjacent contemporary luxury brands, but explain the aesthetic match.';

    console.log(
      `👗 Favorite designers: ${designerProfile}`
    );

    console.log(
      `🎯 Normalized top-level category: ${normalizedTargetCategory}`
    );

    console.log(
      `👕 Allowed item types: ${allowedTargetTypes.join(', ')}`
    );

    console.log(
      `👕 Wardrobe string length passed to AI: ${currentWardrobe.length} characters`
    );

    /*
     * ---------------------------------------------------------
     * GEMINI PROMPT
     * ---------------------------------------------------------
     */

    const prompt = `
You are SkoMiDora's AI Style Consultant and personal shopper.

Event:
"${eventContext || 'General Wardrobe Update'}"

Weather:
${weatherContext || 'Provide versatile recommendations.'}

Selected top-level wardrobe category:
"${normalizedTargetCategory}"

CANONICAL TOP-LEVEL WARDROBE CATEGORIES:
${WARDROBE_CATEGORIES.join(', ')}

CANONICAL ITEM TYPES:
${WARDROBE_TYPES.join(', ')}

ALLOWED ITEM TYPES FOR THE SELECTED TARGET CATEGORY:
${allowedTargetTypes.join(', ')}

Canonical item types currently represented in the closet:
${favoriteTypes.join(', ') || 'No canonical item type profile found'}

Canonical item types currently missing from the closet:
${missingWardrobeTypes.join(', ') || 'None'}

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
5. itemType MUST be exactly one value from CANONICAL ITEM TYPES.
6. Never return "Any Missing Piece" as itemType. It is a Stylist command, not a wardrobe item type.
7. If the selected top-level category is not "Any Missing Piece", every recommendation itemType MUST be one of these allowed item types: ${allowedTargetTypes.join(', ')}.
8. If the target is "Any Missing Piece", prefer useful missing or underrepresented item types that complement the event and weather.
9. Use the weather and event context.
10. The searchQuery must include the suggestedBrand, canonical itemType, and event/style context.
11. The description must explicitly say how this recommendation connects to the user's existing closet designers, colors, materials, or style keywords.
12. Every returned itemType must exist exactly in CANONICAL ITEM TYPES.
13. Never use a broad top-level category such as "Footwear", "Tops", "Bottoms", "Outerwear", or "Accessories" as itemType unless that exact value is explicitly present in CANONICAL ITEM TYPES.
14. The selected top-level category controls the recommendation family; itemType identifies the specific recommended wardrobe subtype.

Return only structured JSON matching the schema.
`;

    console.log(
      '🧠 Sending taxonomy-aware designer prompt to Gemini 2.5 Flash...'
    );

    const {
      object,
    } =
      await generateObject({
        model:
          google(
            'gemini-2.5-flash'
          ),

        schema:
          ShoppingRecommendationSchema,

        prompt,

        temperature:
          0.45,
      });

    console.log(
      '✨ Gemini Response Received:'
    );

    console.log(
      JSON.stringify(
        object,
        null,
        2
      )
    );

    if (
      !object
        ?.recommendations
        ?.length
    ) {
      throw new Error(
        'AI returned empty recommendations.'
      );
    }

    /*
     * ---------------------------------------------------------
     * VALIDATE + MATERIALIZE RECOMMENDATIONS
     * ---------------------------------------------------------
     *
     * Gemini is never trusted to cross category boundaries.
     *
     * Example:
     *
     * Target category:
     * Footwear
     *
     * Valid Gemini itemType:
     * Pumps
     *
     * Invalid Gemini itemType:
     * Dress
     *
     * Invalid values are replaced with a valid subtype from
     * the selected category.
     */

    const materializedLinks =
      object.recommendations
        .slice(
          0,
          3
        )
        .map(
          (
            rec,
            index
          ) => {
            const currentBrand =
              cleanText(
                rec.suggestedBrand
              );

            const closetDesigner =
              chooseClosetDesigner(
                index,
                favoriteDesigners
              );

            const finalBrand =
              favoriteDesigners.length >
                0 &&
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
                index %
                  Math.max(
                    missingWardrobeTypes.length,
                    1
                  )
              ];

            /*
             * Gemini's returned itemType is normalized against
             * the shared item-type taxonomy.
             */
            const recommendedType =
              canonicalizeWardrobeType(
                rec.itemType
              );

            let finalItemType:
              WardrobeType;

            /*
             * -------------------------------------------------
             * ANY MISSING PIECE
             * -------------------------------------------------
             */

            if (
              normalizedTargetCategory ===
              'Any Missing Piece'
            ) {
              finalItemType =
                recommendedType ||
                fallbackMissingType ||
                WARDROBE_TYPES[
                  index %
                    WARDROBE_TYPES.length
                ];
            } else {
              /*
               * ------------------------------------------------
               * SPECIFIC TOP-LEVEL CATEGORY
               * ------------------------------------------------
               *
               * Example:
               *
               * normalizedTargetCategory = Footwear
               *
               * allowedTargetTypes =
               * Trainers, Sneakers, Boots, Pumps, etc.
               */

              const categoryTypePool =
                allowedTargetTypes.length >
                0
                  ? allowedTargetTypes
                  : [
                      ...WARDROBE_TYPES,
                    ];

              /*
               * Accept Gemini's recommendation only when its
               * itemType belongs to the selected category.
               */
              const validRecommendedType =
                recommendedType &&
                categoryTypePool.includes(
                  recommendedType
                )
                  ? recommendedType
                  : null;

              /*
               * Prefer a subtype missing from the closet.
               *
               * Use canonicalItemTypes rather than favoriteTypes
               * because favoriteTypes is only a frequency-ranked
               * subset of the complete closet profile.
               */
              const missingAllowedTypes =
                categoryTypePool.filter(
                  (type) =>
                    !canonicalItemTypes.includes(
                      type
                    )
                );

              const fallbackAllowedTypes =
                missingAllowedTypes.length >
                0
                  ? missingAllowedTypes
                  : categoryTypePool;

              finalItemType =
                validRecommendedType ||
                fallbackAllowedTypes[
                  index %
                    fallbackAllowedTypes.length
                ];
            }

            const closetReason =
              rec.closetMatchReason ||
              (
                favoriteDesigners.length >
                0
                  ? `Matched to your closet designer profile: ${favoriteDesigners
                      .slice(
                        0,
                        5
                      )
                      .join(
                        ', '
                      )}.`
                  : 'Matched to the closet aesthetic profile.'
              );

            const cleanedDescription =
              cleanText(
                rec.description
              );

            const finalDescription =
              cleanedDescription.includes(
                finalBrand
              )
                ? cleanedDescription
                : `${closetReason} ${cleanedDescription}`.trim();

            const searchQuery =
              [
                finalBrand,
                finalItemType,
                eventContext,
                weatherContext,

                favoriteColors
                  .slice(
                    0,
                    3
                  )
                  .join(
                    ' '
                  ),

                favoriteMaterials
                  .slice(
                    0,
                    2
                  )
                  .join(
                    ' '
                  ),
              ]
                .map(
                  cleanText
                )
                .filter(
                  Boolean
                )
                .join(
                  ' '
                );

            return {
              ...rec,

              suggestedBrand:
                finalBrand,

              /*
               * Always a specific canonical subtype.
               *
               * Examples:
               * Trainers
               * Pumps
               * Pajama Set
               * Sleeveless Top
               */
              itemType:
                finalItemType,

              description:
                finalDescription,

              closetMatchReason:
                closetReason,

              searchQuery,

              shopUrl:
                buildShoppingUrl(
                  searchQuery
                ),
            };
          }
        );

    console.log(
      '✅ Success! Sending category-synchronized taxonomy-aligned designer-matched links to frontend.'
    );

    console.log(
      '========================================='
    );

    return {
      success:
        true,

      recommendations:
        materializedLinks,
    };
  } catch (
    error: any
  ) {
    console.error(
      '❌ FATAL STYLIST ERROR:',
      error
    );

    /*
     * ---------------------------------------------------------
     * FALLBACK
     * ---------------------------------------------------------
     *
     * If Gemini fails, the fallback uses the exact same
     * top-level category -> itemType hierarchy.
     */

    try {
      const db =
        getAdminDb();

      const fallbackInventory = await scanWardrobeInventory(db, {
        pageSize: 250,
        sampleSize: 300,
        seed: `consultant-fallback|${eventContext}|${weatherContext}|${targetCategory}`,
      });

      const fallbackClosetItems = fallbackInventory.items;

      const fallbackDesigners =
        topValues(
          fallbackClosetItems
            .map(
              (
                item: any
              ) =>
                normalizeBrand(
                  item.designer ||
                    item.designerName ||
                    item.brand ||
                    item.manufacturer
                )
            )
            .filter(
              Boolean
            ),
          10
        );

      const fallbackTypes =
        fallbackClosetItems
          .map(
            (
              item: any
            ) =>
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
        '✅ AI stylist fallback generated category-synchronized taxonomy-aligned shopping links.'
      );

      return {
        success:
          true,

        fallback:
          true,

        error:
          `AI stylist fallback used because Gemini failed: ${
            error.message ||
            String(
              error
            )
          }`,

        recommendations:
          fallbackRecommendations,
      };
    } catch (
      fallbackError: any
    ) {
      console.error(
        '❌ STYLIST FALLBACK ALSO FAILED:',
        fallbackError
      );

      return {
        success:
          false,

        error:
          `CRASH REASON: ${
            error.message ||
            String(
              error
            )
          } | FALLBACK REASON: ${
            fallbackError.message ||
            String(
              fallbackError
            )
          }`,

        recommendations:
          [],
      };
    }
  }
}
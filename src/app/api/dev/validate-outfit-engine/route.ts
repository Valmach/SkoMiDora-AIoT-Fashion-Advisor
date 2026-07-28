import { NextResponse } from 'next/server';

import {
  getDailyOutfitsAction,
} from '@/app/actions/get-daily-outfits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type SelectedItem = {
  id?: unknown;
  itemName?: unknown;
  itemType?: unknown;
  role?: unknown;
};

type Recommendation = {
  eventName?: unknown;
  weather?: unknown;
  itemIds?: unknown;
  selectedItems?: unknown;
};

type ValidationSummary = {
  look: number;
  itemIds: string[];
  itemNames: string[];
  footwearCount: number;
  onePieceCount: number;
  topCount: number;
  bottomCount: number;
};

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function itemDescription(
  item: SelectedItem,
): string {
  return [
    cleanText(item.itemType),
    cleanText(item.itemName),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function itemRole(item: SelectedItem): string {
  return cleanText(item.role).toLowerCase();
}

function isFootwear(item: SelectedItem): boolean {
  return (
    itemRole(item) === 'footwear' ||
    /\b(shoe|shoes|sandal|sandals|pump|pumps|heel|heels|boot|boots|sneaker|sneakers|loafer|loafers|flat|flats|mule|mules|espadrille|espadrilles|slipper|slippers)\b/.test(
      itemDescription(item),
    )
  );
}

function isOnePiece(item: SelectedItem): boolean {
  return (
    itemRole(item) === 'one-piece' ||
    /\b(dress|gown|jumpsuit|romper|playsuit|one[- ]?piece|suit)\b/.test(
      itemDescription(item),
    )
  );
}

function isTop(item: SelectedItem): boolean {
  return (
    itemRole(item) === 'top' ||
    /\b(shirt|blouse|top|vest|tee|t-shirt|tank|sweater|cardigan|corset|bustier)\b/.test(
      itemDescription(item),
    )
  );
}

function isBottom(item: SelectedItem): boolean {
  return (
    itemRole(item) === 'bottom' ||
    /\b(trouser|trousers|pant|pants|jean|jeans|short|shorts|skirt|skirts|culotte|culottes)\b/.test(
      itemDescription(item),
    )
  );
}

function isSwimwear(item: SelectedItem): boolean {
  return /\b(bikini|swimsuit|swimwear|maillot|bathing suit)\b/.test(
    itemDescription(item),
  );
}

function assertCondition(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function validateRecommendations(
  value: unknown,
  label: string,
): ValidationSummary[] {
  assertCondition(
    Array.isArray(value),
    `${label}: recommendations were not an array.`,
  );

  assertCondition(
    value.length === 3,
    `${label}: expected 3 recommendations, received ${value.length}.`,
  );

  const recommendations =
    value as Recommendation[];

  const allIds: string[] = [];

  const summaries = recommendations.map(
    (recommendation, index) => {
      const itemIds = Array.isArray(
        recommendation.itemIds,
      )
        ? recommendation.itemIds
            .map(cleanText)
            .filter(Boolean)
        : [];

      const selectedItems = Array.isArray(
        recommendation.selectedItems,
      )
        ? (
            recommendation.selectedItems as SelectedItem[]
          )
        : [];

      const selectedIds = selectedItems
        .map(item => cleanText(item.id))
        .filter(Boolean);

      assertCondition(
        itemIds.length === 3,
        `${label}, look ${index + 1}: expected exactly 3 item IDs.`,
      );

      assertCondition(
        selectedItems.length === itemIds.length,
        `${label}, look ${index + 1}: itemIds and selectedItems lengths differ.`,
      );

      assertCondition(
        new Set(itemIds).size === itemIds.length,
        `${label}, look ${index + 1}: duplicate IDs exist inside the look.`,
      );

      assertCondition(
        itemIds.every(id =>
          selectedIds.includes(id),
        ),
        `${label}, look ${index + 1}: selectedItems do not match itemIds.`,
      );

      const footwearCount =
        selectedItems.filter(isFootwear).length;

      const onePieceCount =
        selectedItems.filter(isOnePiece).length;

      const topCount =
        selectedItems.filter(isTop).length;

      const bottomCount =
        selectedItems.filter(isBottom).length;

      const swimwearCount =
        selectedItems.filter(isSwimwear).length;

      assertCondition(
        swimwearCount === 0,
        `${label}, look ${index + 1}: swimwear is not allowed for this event.`,
      );

      assertCondition(
        footwearCount === 1,
        `${label}, look ${index + 1}: expected exactly one footwear item; received ${footwearCount}.`,
      );

      if (index === 0) {
        assertCondition(
          onePieceCount >= 1,
          `${label}, look 1: missing one-piece foundation.`,
        );
      } else {
        assertCondition(
          onePieceCount === 0,
          `${label}, look ${index + 1}: separates look contains a one-piece.`,
        );

        assertCondition(
          topCount >= 1,
          `${label}, look ${index + 1}: missing top.`,
        );

        assertCondition(
          bottomCount >= 1,
          `${label}, look ${index + 1}: missing bottom.`,
        );
      }

      assertCondition(
        cleanText(recommendation.eventName)
          .length > 0,
        `${label}, look ${index + 1}: event context is missing.`,
      );

      assertCondition(
        cleanText(recommendation.weather)
          .length > 0,
        `${label}, look ${index + 1}: weather context is missing.`,
      );

      allIds.push(...itemIds);

      return {
        look: index + 1,
        itemIds,
        itemNames: selectedItems.map(item =>
          cleanText(item.itemName),
        ),
        footwearCount,
        onePieceCount,
        topCount,
        bottomCount,
      };
    },
  );

  assertCondition(
    new Set(allIds).size === allIds.length,
    `${label}: an item was repeated between looks.`,
  );

  return summaries;
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        error: 'Not found',
      },
      {
        status: 404,
      },
    );
  }

  let firstRecommendations: unknown = null;
  let refreshedRecommendations: unknown = null;

  try {
    const eventContext =
      'Paris Summer Fashion Event';

    const weatherContext =
      '30°C Sunny';

    firstRecommendations =
      await getDailyOutfitsAction(
        eventContext,
        weatherContext,
        `regression-first-${Date.now()}`,
        [],
      );

    const first =
      validateRecommendations(
        firstRecommendations,
        'First generation',
      );

    const recentItemIds = first.flatMap(
      look => look.itemIds,
    );

    refreshedRecommendations =
      await getDailyOutfitsAction(
        eventContext,
        weatherContext,
        `regression-refresh-${Date.now()}`,
        recentItemIds,
      );

    const refreshed =
      validateRecommendations(
        refreshedRecommendations,
        'Refresh generation',
      );

    const refreshedIds = refreshed.flatMap(
      look => look.itemIds,
    );

    const repeatedIds = refreshedIds.filter(
      id => recentItemIds.includes(id),
    );

    assertCondition(
      repeatedIds.length === 0,
      `Refresh repeated recent IDs: ${[
        ...new Set(repeatedIds),
      ].join(', ')}`,
    );

    return NextResponse.json({
      ok: true,
      eventContext,
      weatherContext,
      first,
      refreshed,
      repeatedIds,
      totals: {
        firstLooks: first.length,
        firstItems: recentItemIds.length,
        refreshedLooks: refreshed.length,
        refreshedItems:
          refreshedIds.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      'Outfit regression validation failed:',
      message,
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
        firstRecommendations,
        refreshedRecommendations,
      },
      {
        status: 500,
      },
    );
  }
}
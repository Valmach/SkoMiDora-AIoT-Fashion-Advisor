import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import {
  FieldPath,
  getFirestore,
} from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function getAdminDb() {
  if (!getApps().length) {
    initializeApp();
  }

  return getFirestore();
}

function normalizeValue(value: any): any {
  if (!value) return value;

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeValue(nestedValue),
      ]),
    );
  }

  return value;
}

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb();
    const requestedPageSize = Number(
      request.nextUrl.searchParams.get('pageSize') || 100,
    );
    const pageSize = Math.min(
      250,
      Math.max(
        1,
        Number.isFinite(requestedPageSize)
          ? Math.floor(requestedPageSize)
          : 100,
      ),
    );
    const cursor =
      request.nextUrl.searchParams.get('cursor');

    let query = db
      .collection('publicWardrobeItems')
      .orderBy(FieldPath.documentId())
      .limit(pageSize + 1);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const [snapshot, countSnapshot] = await Promise.all([
      query.get(),
      db
        .collection('publicWardrobeItems')
        .count()
        .get(),
    ]);
    const hasMore = snapshot.size > pageSize;
    const pageDocuments = snapshot.docs.slice(0, pageSize);
    const items = pageDocuments.map(document => ({
      id: document.id,
      ...normalizeValue(document.data()),
    }));
    const nextCursor = hasMore
      ? pageDocuments[pageDocuments.length - 1]?.id || null
      : null;

    return NextResponse.json({
      items,
      count: items.length,
      totalCount: countSnapshot.data().count,
      pageSize,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('Failed to load public wardrobe items:', error);

    return NextResponse.json(
      {
        error: 'Failed to load public wardrobe items',
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}

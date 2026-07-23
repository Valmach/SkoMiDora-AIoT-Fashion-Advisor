import {
  FieldPath,
  type Firestore,
} from 'firebase-admin/firestore';

export type ScannedWardrobeItem = Record<string, any> & {
  id: string;
};

export type WardrobeScanResult = {
  items: ScannedWardrobeItem[];
  scannedCount: number;
  pageCount: number;
};

type ScanOptions = {
  collectionName?: string;
  pageSize?: number;
  sampleSize?: number;
  seed?: string;
};

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rawTypeKey(item: Record<string, any>): string {
  return cleanText(
    item.itemType ||
      item.type ||
      item.category ||
      'unknown',
  ).toLowerCase();
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * Scans the complete collection using bounded Firestore pages.
 *
 * Every document participates in deterministic reservoir sampling,
 * while at least one representative of every observed raw type is
 * retained. Memory remains bounded by sampleSize plus the number of
 * distinct raw types; no first-N document ceiling is imposed.
 */
export async function scanWardrobeInventory(
  db: Firestore,
  options: ScanOptions = {},
): Promise<WardrobeScanResult> {
  const collectionName =
    options.collectionName || 'publicWardrobeItems';
  const pageSize = Math.min(
    500,
    Math.max(50, options.pageSize || 250),
  );
  const sampleSize = Math.min(
    1500,
    Math.max(60, options.sampleSize || 600),
  );
  const seed = options.seed || 'wardrobe-profile';
  const sample: ScannedWardrobeItem[] = [];
  const typeRepresentatives =
    new Map<string, ScannedWardrobeItem>();

  let scannedCount = 0;
  let pageCount = 0;
  let cursor: string | null = null;

  for (;;) {
    let query = db
      .collection(collectionName)
      .orderBy(FieldPath.documentId())
      .limit(pageSize);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();

    if (snapshot.empty) break;

    pageCount += 1;

    for (const document of snapshot.docs) {
      scannedCount += 1;

      const item: ScannedWardrobeItem = {
        id: document.id,
        ...document.data(),
      };
      const typeKey = rawTypeKey(item);
      const existingRepresentative =
        typeRepresentatives.get(typeKey);

      if (
        !existingRepresentative ||
        hashString(`${seed}|type|${item.id}`) <
          hashString(
            `${seed}|type|${existingRepresentative.id}`,
          )
      ) {
        typeRepresentatives.set(typeKey, item);
      }

      if (sample.length < sampleSize) {
        sample.push(item);
      } else {
        const replacementIndex =
          hashString(`${seed}|sample|${item.id}`) %
          scannedCount;

        if (replacementIndex < sampleSize) {
          sample[replacementIndex] = item;
        }
      }
    }

    cursor = snapshot.docs[snapshot.docs.length - 1].id;

    if (snapshot.size < pageSize) break;
  }

  const merged = new Map<string, ScannedWardrobeItem>();

  for (const item of sample) merged.set(item.id, item);
  for (const item of typeRepresentatives.values()) {
    merged.set(item.id, item);
  }

  return {
    items: Array.from(merged.values()),
    scannedCount,
    pageCount,
  };
}

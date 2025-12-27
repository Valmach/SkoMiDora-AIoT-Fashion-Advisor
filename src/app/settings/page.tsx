'use client';

/**
 * FILE: src/app/recommendations/page.tsx
 * PURPOSE:
 * - Load closet items
 * - Normalize wardrobe
 * - Call Server Action
 */

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

import { generateOutfitForEventAction } from '@/app/actions';
import { normalizeWardrobeType } from '@/lib/normalizeWardrobeType';
import { useLocalStorage } from '@/hooks/use-local-storage';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STYLE_DNA_KEY = 'skomidoraStyleDNA';

type ClosetItem = {
  id: string;
  itemName: string;
  itemType: string;
};

export default function RecommendationsPage() {
  const [styleDNA] = useLocalStorage<string | null>(STYLE_DNA_KEY, null);
  const [closet, setCloset] = useState<ClosetItem[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------- LOAD CLOSET ---------- */
  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(firestore, 'publicWardrobeItems'));
      const items: ClosetItem[] = [];

      snap.forEach(doc => {
        const d = doc.data();
        if (d?.itemName && d?.itemType) {
          items.push({
            id: doc.id,
            itemName: d.itemName,
            itemType: d.itemType,
          });
        }
      });

      setCloset(items);
    }
    load();
  }, []);

  /* ---------- GENERATE ---------- */
  async function generate() {
    if (!styleDNA || closet.length === 0) return;

    setLoading(true);
    setResult(null);

    const wardrobeItems = closet.map(i => ({
      id: i.id,
      name: i.itemName,
      type: normalizeWardrobeType(i.itemType),
    }));

    const output = await generateOutfitForEventAction({
      wardrobeItems,
      eventType: 'General',
      temperature: 20,
      styleDNA,
    });

    setResult(output.outfitDescription);
    setLoading(false);
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Outfit Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={generate} disabled={loading || !styleDNA}>
            {loading ? 'Generating…' : 'Generate Outfit'}
          </Button>

          {result && <p className="text-muted-foreground">{result}</p>}

          {!styleDNA && (
            <p className="text-sm italic text-muted-foreground">
              Analyze Style DNA first.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

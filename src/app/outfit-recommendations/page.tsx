'use client';

import OutfitCard from '@/components/OutfitCard';

import { useState, useEffect, useTransition } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { Dancing_Script } from 'next/font/google'; 

import { firestore as db } from '@/lib/firebase';
import { getDailyOutfitsAction } from '@/app/actions/get-daily-outfits';

import { Loader2, Sparkles, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const dancingScript = Dancing_Script({ 
  subsets: ['latin'],
  weight: ['400', '700'], 
});

export default function OutfitRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [closet, setCloset] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, 'publicWardrobeItems'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toMillis()
              : Date.now(),
        };
      });

      setCloset(items);

      startTransition(async () => {
        try {
          const recs = await getDailyOutfitsAction(items);
          setRecommendations(recs);
        } catch (error) {
          console.error("Failed to fetch outfits:", error);
        } finally {
          setDataLoaded(true);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    // FIX: Swapped `p-8` for explicit horizontal/bottom padding, and a heavy `pt-28 lg:pt-32` 
    // to force the content down below the global fixed header.
    <div className="min-h-screen bg-black text-white px-4 pb-8 pt-28 md:px-8 lg:px-16 lg:pb-16 lg:pt-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-zinc-300">
              <Sparkles size={24} className="text-[#DC143C]" />
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#DC143C]">
                Daily Curation
              </span>
            </div>

            <h1 className={`${dancingScript.className} text-5xl md:text-6xl text-white tracking-wide mt-2`}>
              <span style={{ color: '#DC143C' }}>3 Outfits</span> From Your Closet
            </h1>
          </div>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="rounded-none h-14 px-8 border-zinc-700 bg-black text-white hover:bg-zinc-900 uppercase font-bold tracking-wider text-xs shrink-0"
          >
            <RefreshCcw
              className={`mr-3 h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
            />
            Refresh Looks
          </Button>
        </header>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {!dataLoaded ? (
            // FIX: Updated loading skeletons to match the new sharp luxury aesthetic
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[800px] rounded-none bg-[#050505] animate-pulse border border-zinc-900 flex flex-col"
              >
                <div className="h-24 bg-black border-b border-zinc-900 w-full" />
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-zinc-600 h-8 w-8" />
                </div>
              </div>
            ))
          ) : recommendations.length === 0 ? (
            // Empty State
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
              <Sparkles className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-xl font-light">Add items to your closet to see outfits.</p>
            </div>
          ) : (
            // Cards
            recommendations.map((rec, idx) => (
              <OutfitCard
                key={idx}
                outfit={{
                  ...rec,
                  eventName: `Outfit ${idx + 1}`, 
                  location: "Curated Style"
                }}
                index={idx}
                analyzedItems={closet}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
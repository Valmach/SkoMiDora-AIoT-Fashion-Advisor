// app/outfit-recommendations/page.tsx

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

import { Loader2, Sparkles, RefreshCcw, MapPin } from 'lucide-react'; 
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
  const [targetEvent, setTargetEvent] = useState<string | null>(null);
  const [targetWeather, setTargetWeather] = useState<string | null>(null);

  useEffect(() => {
    // 1. Safely grab the URL parameter (the "address") without breaking the Next.js build
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get('event');
    const weatherParam = params.get('weather');

    if (eventParam) {
      setTargetEvent(eventParam);
    }

    if (weatherParam) {
      setTargetWeather(weatherParam);
    }

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
          const recs = await getDailyOutfitsAction(items, eventParam || "", weatherParam || "");
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

            {/* 2. THE NEW CITY HIGHLIGHT BANNER */}
            {targetEvent && (
              <div className="mt-6 inline-flex items-center gap-3 bg-[#DC143C]/10 border border-[#DC143C]/30 px-5 py-2.5 rounded-none backdrop-blur-sm animate-in fade-in slide-in-from-left-4 duration-700">
                <MapPin size={16} className="text-[#DC143C]" />
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-200 font-bold">
                  Curating for: <span className="text-white ml-1">{targetEvent}</span>
                </span>
              </div>
            )}
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
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
              <Sparkles className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-xl font-light">Add items to your closet to see outfits.</p>
            </div>
          ) : (
            recommendations.map((rec, idx) => (
              <OutfitCard
                key={idx}
                outfit={{
                  ...rec,
                  // 3. THE STRICT DATA OVERRIDE: 
                  // We forcefully inject the clicked city into the card's location field.
                  // This completely prevents the VW Bus default and guarantees the correct images show.
                  location: targetEvent || rec.location || "Global Destination",
                  eventName: targetEvent || rec.eventName || `Outfit ${idx + 1}`,
                  weather: targetWeather || rec.weather || ""
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
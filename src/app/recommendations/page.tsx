'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// ✅ FIX: Import 'firestore' and alias it as 'db' to match your code
import { firestore as db } from '@/lib/firebase'; 
import { getCalendarDataAction } from '@/app/actions/get-calendar-data';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';

import { Loader2, Sparkles, RefreshCcw, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UpcomingEventsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [closet, setCloset] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [closetLoaded, setClosetLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // =====================================================
  // 1. LIVE WIRE: Single Firestore Listener (Closet only)
  // =====================================================
  useEffect(() => {
    // 🛡️ Safety Check: Ensure db is initialized
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

      // Server Action → force 3 recommendations
      startTransition(async () => {
        const data = await getCalendarDataAction(items);
        setRecommendations(data);
        setClosetLoaded(true);
      });
    });

    return () => unsubscribe(); // ✅ clean listener
  }, []);

  // =====================================================
  // UI CONTROLS
  // =====================================================
  const handleMicClick = () => {
    setIsListening((prev) => !prev);
    if (!isListening) {
      console.log('Listening for commands...');
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-16">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-zinc-300">
              <Sparkles
                size={24}
                className={
                  isListening
                    ? 'animate-pulse text-red-500'
                    : 'text-zinc-300'
                }
              />
              <span className="text-sm font-bold uppercase tracking-[0.3em]">
                SkomiDora Intelligence
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white uppercase tracking-tight">
              Upcoming Events
            </h1>
          </div>

          <div className="flex gap-4">
            {/* Mic */}
            <Button
              onClick={handleMicClick}
              className={`rounded-full h-14 w-14 p-0 border-2 transition-all ${
                isListening
                  ? 'bg-red-900 border-red-600 text-white animate-pulse'
                  : 'bg-black border-zinc-700 text-zinc-400 hover:text-white hover:border-white'
              }`}
            >
              <Mic size={24} />
            </Button>

            {/* Reset */}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="rounded-full h-14 px-8 border-zinc-700 bg-black text-white hover:bg-zinc-900 hover:text-white uppercase font-bold tracking-wider text-xs"
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${
                  isPending ? 'animate-spin' : ''
                }`}
              />
              Reset Logic
            </Button>
          </div>
        </header>

        {/* 3-CARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {!closetLoaded ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[600px] rounded-[4rem] bg-zinc-900 animate-pulse border border-zinc-800 flex items-center justify-center"
              >
                <Loader2 className="animate-spin text-zinc-600" />
              </div>
            ))
          ) : (
            recommendations.map((event, idx) => (
              <UpcomingEventAdviceCard
                key={event.id ?? idx}
                eventAdvice={event}
                cardIndex={idx}
                analyzedItems={closet}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
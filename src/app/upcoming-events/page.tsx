'use client';

/**
 * FILE: src/app/upcoming-events/page.tsx
 * NAME: Google Events Calendar (Camel Case & Refined Scale)
 * THEME: Dashboard Noir & Crimson | FONT: Alegreya
 */

import { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarDays, RotateCcw, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

import { generateOutfitForEventAction } from '@/app/actions';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { useToast } from "@/hooks/use-toast";

export default function UpcomingEventsPage() {
  const [isClient, setIsClient] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => { setIsClient(true); }, []);

  // 1. Real-time Shoebox Sync [cite: 2025-12-16]
  useEffect(() => {
    if (!isClient) return;
    const q = query(collection(firestore, 'publicWardrobeItems'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toMillis() : Date.now(),
      }));
      setWardrobeItems(items);
    });
  }, [isClient]);

  // 2. Refresh Action
  const handleRefreshCalendar = () => {
    if (wardrobeItems.length === 0) return;
    startTransition(async () => {
      try {
        const result = await generateOutfitForEventAction({ wardrobeItems });
        if (result?.recommendations) {
          setEvents(result.recommendations);
          toast({ title: "Calendar Synced", description: "Weather and events updated via Open-Meteo." });
        }
      } catch (err: any) {
        toast({ title: "Sync Failed", description: "Check connection.", variant: "destructive" });
      }
    });
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Alegreya', serif" }}>
      <div className="container mx-auto py-12 px-6">
        
        {/* REFINED HEADER: Smaller & Camel Case */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8 border-b border-zinc-900 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
               <div className="bg-[#8b1a1a] p-1.5 rounded-sm shadow-md">
                  <CalendarDays className="h-4 w-4 text-white" />
               </div>
               <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#8b1a1a]">
                 SkomiDora Intelligence
               </span>
            </div>
            
            {/* 🐫 Camel Case & Scaled Down Title */}
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tight text-white">
              Google <span className="text-[#8b1a1a]">Events Calendar</span>
            </h1>
            
            {/* ⚪ Picket Fence White Description */}
            <p className="text-white text-xs font-medium max-w-lg italic leading-relaxed opacity-95">
              Your personal AI-powered stylist for footwear and fashion. Mapping your shoebox inventory to premier global destinations.
            </p>
          </div>

          <Button 
            onClick={handleRefreshCalendar} 
            disabled={isPending}
            className="rounded-sm bg-[#8b1a1a] text-white px-6 py-4 h-auto hover:bg-[#a31f1f] transition-all shadow-lg font-bold italic text-xs uppercase tracking-wider border-none"
          >
            {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-2 h-3.5 w-3.5" />}
            Update Style Logic
          </Button>
        </div>

        {/* GALLERY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {events.length > 0 ? (
            events.map((event, index) => (
              <UpcomingEventAdviceCard 
                key={index} 
                eventAdvice={event} 
                cardIndex={index}
                analyzedItems={wardrobeItems} 
              />
            ))
          ) : (
            <div className="col-span-full py-32 text-center border border-dashed border-zinc-900 bg-[#0a0a0a]">
              <p className="text-zinc-500 font-medium italic text-base">
                No active events found. Sync your Google Events via SerpApi to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
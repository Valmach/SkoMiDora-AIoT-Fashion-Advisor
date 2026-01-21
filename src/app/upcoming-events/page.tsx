'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarDays, RotateCcw, Loader2 } from 'lucide-react';
import { Dancing_Script } from 'next/font/google'; 

import { getUpcomingEventsStyleAdviceAction } from '@/app/actions/get-calendar-data';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const dancingScript = Dancing_Script({ 
  subsets: ['latin'], 
  weight: ['400', '700'] 
});

// ✅ FALLBACK DATA (In case closet is empty, we still show SOMETHING)
const MOCK_CLOSET = [
  { id: 'm1', name: 'Classic Leather Jacket', category: 'Outerwear', imageUrl: 'https://images.unsplash.com/photo-1551028919-ac6635f0e5c9?w=800&q=80', color: 'Black' },
  { id: 'm2', name: 'Silk Blouse', category: 'Tops', imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80', color: 'White' },
  { id: 'm3', name: 'Tailored Trousers', category: 'Bottoms', imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80', color: 'Navy' },
];

export default function UpcomingEventsPage() {
  const [mounted, setMounted] = useState(false);
  const [upcomingEventsAdvice, setUpcomingEventsAdvice] = useState<any[]>([]);
  const [analyzedItemsFromCloset, setAnalyzedItemsFromCloset] = useState<any[]>([]);
  const [isLoadingEventsAdvice, startLoadingEventsAdviceTransition] = useTransition();
  const [isLoadingCloset, setIsLoadingCloset] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const cityTitles = ["Paris", "Roma", "Oslo"];

  useEffect(() => {
    setMounted(true);
    if (firestore) {
        const itemsCollectionRef = collection(firestore, 'publicWardrobeItems');
        const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));
        
        const unsubscribeCloset = onSnapshot(q, (snapshot) => {
          const items: any[] = [];
          snapshot.forEach(doc => {
              const data = doc.data();
              items.push({
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
              });
          });
          
          console.log("👗 Closet Items Found:", items.length);
          setAnalyzedItemsFromCloset(items);
          setIsLoadingCloset(false);

          // Trigger AI immediately if we don't have advice yet
          if (upcomingEventsAdvice.length === 0) {
             fetchUpcomingEventsAdvice(items); 
          }

        }, (dbError) => {
          console.error("Error fetching closet:", dbError);
          setIsLoadingCloset(false);
          // On error, try with mock data
          fetchUpcomingEventsAdvice([]);
        });

        return () => unsubscribeCloset();
    }
  }, []);

  const fetchUpcomingEventsAdvice = (currentCloset: any[]) => {
    startLoadingEventsAdviceTransition(async () => {
      setError(null);
      try {
        // ✅ LOGIC FIX: Use Real closet, or fallback to Mock if empty
        const closetToUse = currentCloset.length > 0 ? currentCloset : MOCK_CLOSET;
        
        console.log("🤖 Asking AI for advice using", closetToUse.length, "items");
        
        const adviceResults = await getUpcomingEventsStyleAdviceAction(closetToUse); 
        
        console.log("✨ AI Responded with:", adviceResults.length, "suggestions");
        setUpcomingEventsAdvice(adviceResults);
        
      } catch (e: any) {
        console.error("AI Error:", e);
        setError("Could not generate advice. Please try again.");
      }
    });
  };
  
  const RefreshIcon = isLoadingEventsAdvice ? Loader2 : RotateCcw;
  const isLoading = isLoadingEventsAdvice || isLoadingCloset;

  if (!mounted) {
    return (
        <div className="min-h-screen bg-black text-white p-8 lg:p-16 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-16">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div className="space-y-3">
             <div className="flex items-center gap-3 text-zinc-300">
              <CalendarDays size={24} className="text-[#DC143C]" />
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#DC143C]">
                Schedule & Style
              </span>
            </div>
            
            <h1 className={`${dancingScript.className} text-5xl md:text-6xl text-white tracking-wide`}>
              <span style={{ color: '#DC143C' }}>Upcoming</span> Events
            </h1>
          </div>
          
          <Button 
            onClick={() => fetchUpcomingEventsAdvice(analyzedItemsFromCloset)} 
            variant="outline" 
            className="rounded-full h-14 px-8 border-zinc-700 bg-black text-white hover:bg-zinc-900 uppercase font-bold tracking-wider text-xs"
            disabled={isLoading}
          >
            <RefreshIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "Curating..." : "Refresh Advice"}
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {isLoading && (
             [1, 2, 3].map((i) => (
              <div key={i} className="h-[600px] rounded-[4rem] bg-zinc-900 animate-pulse border border-zinc-800 flex items-center justify-center">
                <span className="text-zinc-700 font-medium">Curating Look {i}...</span>
              </div>
            ))
          )}

          {!isLoading && upcomingEventsAdvice.length > 0 && (
            upcomingEventsAdvice.map((adviceItem, index) => (
              <UpcomingEventAdviceCard 
                key={index} 
                eventAdvice={{
                  ...adviceItem,
                  eventName: cityTitles[index] || adviceItem.eventName, 
                  location: "Fashion Week" 
                }} 
                cardIndex={index}
                // Use fallback closet if real one is empty
                analyzedItems={analyzedItemsFromCloset.length > 0 ? analyzedItemsFromCloset : MOCK_CLOSET} 
              />
            ))
          )}

          {!isLoading && upcomingEventsAdvice.length === 0 && !error && (
            <div className="col-span-full text-center py-20 text-zinc-500">
              <p>No events found. Click refresh to simulate events.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

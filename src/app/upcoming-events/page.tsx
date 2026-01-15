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

export default function UpcomingEventsPage() {
  const [isClient, setIsClient] = useState(false);
  const [upcomingEventsAdvice, setUpcomingEventsAdvice] = useState<any[]>([]);
  const [analyzedItemsFromCloset, setAnalyzedItemsFromCloset] = useState<any[]>([]);
  const [isLoadingEventsAdvice, startLoadingEventsAdviceTransition] = useTransition();
  const [isLoadingCloset, setIsLoadingCloset] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const cityTitles = ["Paris", "Oslo", "London"];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
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
          setAnalyzedItemsFromCloset(items);
          setIsLoadingCloset(false);

          if (upcomingEventsAdvice.length === 0) {
             fetchUpcomingEventsAdvice(items); 
          }

        }, (dbError) => {
          console.error("Error fetching closet:", dbError);
          setIsLoadingCloset(false);
        });

        return () => unsubscribeCloset();
      }
    }
  }, [isClient]);

  const fetchUpcomingEventsAdvice = (currentCloset: any[]) => {
    startLoadingEventsAdviceTransition(async () => {
      setError(null);
      try {
        toast({ title: "Fetching Event Advice...", description: "Consulting AI Stylist..." });
        
        const adviceResults = await getUpcomingEventsStyleAdviceAction(currentCloset); 
        
        setUpcomingEventsAdvice(adviceResults);
        toast({ title: "Style Advice Ready", description: "Your looks have been curated." });

      } catch (e: any) {
        console.error(e);
        setError("Could not generate advice. Please try again.");
        toast({ title: "Error", description: "AI Service Busy", variant: "destructive" });
      }
    });
  };
  
  const RefreshIcon = isLoadingEventsAdvice ? Loader2 : RotateCcw;
  const isLoading = isLoadingEventsAdvice || isLoadingCloset;

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-16">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div className="space-y-3">
             <div className="flex items-center gap-3 text-zinc-300">
              <CalendarDays size={24} className="text-[#DC143C]" />
              {/* UPDATED TEXT HERE */}
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#DC143C]">
                Google Events Calendar
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

        {/* CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {isLoading && upcomingEventsAdvice.length === 0 && (
             [1, 2, 3].map((i) => (
              <div key={i} className="h-[600px] rounded-[3rem] bg-zinc-900 animate-pulse border border-zinc-800"></div>
            ))
          )}

          {!isLoading && upcomingEventsAdvice.length > 0 && (
            upcomingEventsAdvice.map((adviceItem, index) => (
              <UpcomingEventAdviceCard 
                key={index} 
                eventAdvice={{
                  ...adviceItem,
                  city: cityTitles[index] || adviceItem.eventName,
                }} 
                cardIndex={index}
                analyzedItems={analyzedItemsFromCloset} 
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
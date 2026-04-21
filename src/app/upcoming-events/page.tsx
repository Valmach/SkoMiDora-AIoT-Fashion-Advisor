'use client';

import { useState, useEffect } from 'react';
import { getUpcomingEventsStyleAdviceAction } from '@/app/actions/get-calendar-data';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Outfit, Imperial_Script } from "next/font/google"; 

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "700"], 
});

// Configure the Imperial Script font
const imperial = Imperial_Script({
  subsets: ["latin"],
  weight: ["400"], // Normal weight
});

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      let items: any[] = [];
      if (firestore) {
        const snapshot = await getDocs(collection(firestore, 'publicWardrobeItems'));
        items = snapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
          };
        });
        setClosetItems(items);
      }

      const advice = await getUpcomingEventsStyleAdviceAction(items);
      setEvents(advice);
      
    } catch (error) {
      console.error("Error loading events:", error);
      toast({ 
        title: "Error", 
        description: "Could not sync with Google Calendar.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className={`min-h-screen bg-black text-white p-6 md:p-12 ${outfit.className}`}>
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-end border-b border-zinc-800 pb-8 gap-6">
        <div>
           <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">
             <span className="text-[#DC143C]">●</span> Synced Agenda
           </div>
           
           <div className="flex items-center gap-3">
             <Calendar className="h-8 md:h-10 w-8 md:w-10 text-[#DC143C]" />
             {/* Updated to Imperial Script, normal weight, original text */}
             <h1 className={`text-5xl md:text-6xl font-normal tracking-wide ${imperial.className}`}> 
               <span className="text-white">Your Google Calendar </span>
               <span className="text-[#DC143C]">Events</span>
             </h1>
           </div>
        </div>
        
        <Button 
          onClick={fetchData} 
          variant="outline" 
          className="rounded-full border-zinc-700 hover:bg-zinc-800 text-xs uppercase tracking-wider"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Refresh Agenda"}
        </Button>
      </div>

      {/* EVENTS GRID */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#DC143C]" />
            <p className="text-zinc-500 text-sm uppercase tracking-widest">Consulting AI Stylist...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => (
              <UpcomingEventAdviceCard 
                key={index} 
                eventAdvice={event} 
                analyzedItems={closetItems}
                cardIndex={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUpcomingEventsStyleAdviceAction } from '@/app/actions/get-calendar-data';
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';
import { collection, getDocs } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
import { Loader2, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Outfit, Imperial_Script } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const imperial = Imperial_Script({
  subsets: ["latin"],
  weight: ["400"],
});

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
 
  const router = useRouter();

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

      const user = auth.currentUser;
      let calendarEvents: any[] = [];

      if (user) {
        const idToken = await user.getIdToken();

        const calendarResponse = await fetch(
          "/api/google-calendar/events?days=365&maxResults=100",
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            cache: "no-store",
          }
        );

        if (calendarResponse.ok) {
          const payload = await calendarResponse.json();
          calendarEvents = Array.isArray(payload.events) ? payload.events : [];
        }
      }

      const advice =
        await getUpcomingEventsStyleAdviceAction(
          items,
          calendarEvents,
        );

      setEvents(advice || []);
     
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
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-end border-b border-zinc-900 pb-8 gap-6">
        <div>
           <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
             <span className="text-[#9A1B22]">●</span> Synced Agenda
           </div>
           
           <div className="flex items-center gap-4">
             <Calendar className="h-8 md:h-10 w-8 md:w-10 text-[#9A1B22]" />
             <h1 className={`text-5xl md:text-6xl font-normal tracking-wide ${imperial.className}`}>
               <span className="text-white">Your Google Calendar </span>
               <span className="text-[#9A1B22]">Events</span>
             </h1>
           </div>
        </div>
       
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
          onClick={fetchData}
          variant="outline"
          className="h-9 shrink-0 rounded-none border-white/70 bg-black px-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:border-[#9A1B22] hover:bg-[#9A1B22] hover:text-white"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : "Refresh Agenda"}
        </Button>
        </div>
      </div>

      {/* EVENTS GRID & EMPTY STATE */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#9A1B22]" />
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-medium">Consulting AI Stylist...</p>
          </div>
        ) : events.length === 0 ? (
          /* --- NEW EMPTY STATE UI --- */
          <div className="flex flex-col items-center justify-center py-32 space-y-6 border border-zinc-900 bg-zinc-950/30 rounded-sm">
            <Calendar className="h-12 w-12 text-zinc-800" />
            <div className="text-center space-y-2">
              <h3 className="text-xl text-white font-serif">No Upcoming Events Found</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Your synced agenda is currently empty. Add upcoming engagements to your Google Calendar to receive curated styling advice.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => {
             
              const currentEventName = event.summary || event.title || event.name || "Upcoming Event";
              const currentWeather = event.weatherForecast || event.weather || event.temperature || event.weatherContext || "Weather data unavailable";

              return (
                <div key={index} className="flex flex-col h-full space-y-4 group">
                  <div className="flex-grow">
                    <UpcomingEventAdviceCard
                      eventAdvice={event}
                      analyzedItems={closetItems}
                      cardIndex={index}
                    />
                  </div>

                  <Button
                    onClick={() => {
                      router.push(`/stylist?event=${encodeURIComponent(currentEventName)}&weather=${encodeURIComponent(currentWeather)}`);
                    }}
                    className="w-full bg-[#9A1B22] text-white hover:bg-[#7A151B] uppercase tracking-[0.2em] text-[11px] font-bold py-7 rounded-none flex items-center justify-center gap-3 transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(154,27,34,0.2)]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Style This Event
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
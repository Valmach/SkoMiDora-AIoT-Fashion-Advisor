'use client';

/**
 * FILE: src/app/recommendations/page.tsx
 * NAME: Outfit Recommendations (Camel Case & Purple Rain Edge)
 * THEME: Dashboard Noir, Picket Fence White, & Crimson
 */

import { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Sparkles, Database, ShieldCheck } from 'lucide-react';

// STABLE SERVER ACTIONS (Keep this logic as it fixes the image proxy issues)
import { getCalendarDataAction } from '@/app/actions/get-calendar-data';
import { getClosetDataAdmin } from '@/app/actions/get-closet-data';

// COMPONENTS
import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';

export default function OutfitRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [closet, setCloset] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();

  // 1. Initial Load (Server-Side Admin SDK to bypass proxy)
  useEffect(() => {
    const init = async () => {
      try {
        const data = await getClosetDataAdmin();
        setCloset(data || []);
      } catch (err) {
        console.error("Initial Sync Failed:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    init();
  }, []);

  // 2. Refresh Logic
  const handleRefresh = () => {
    const safeCloset = closet || [];
    startTransition(async () => {
      try {
        // Fetch fresh data
        const currentCloset = await getClosetDataAdmin();
        setCloset(currentCloset);

        // Sanitize & AI Handshake
        const plainCloset = JSON.parse(JSON.stringify(currentCloset));
        const data = await getCalendarDataAction(plainCloset);
        
        if (data && data.length > 0) {
          setRecommendations(data);
          toast({ title: "Style Logic Updated", description: "Calendar & Wardrobe Synced." });
        } else {
          toast({ title: "No Matches", description: "AI could not find outfits." });
        }
      } catch (err) {
        console.error("AI Sync Error:", err);
        toast({ title: "Stylist Timeout", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Alegreya', serif" }}>
      <div className="container mx-auto py-12 px-6">
        
        {/* HEADER: Aligned with Upcoming Events Page */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8 border-b border-zinc-900 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
               <div className="bg-[#8b1a1a] p-1.5 rounded-sm shadow-md">
                  <Sparkles className="h-4 w-4 text-white" />
               </div>
               <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#8b1a1a]">
                 SkomiDora Intelligence
               </span>
            </div>
            
            {/* 🐫 Camel Case Title */}
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tight text-white">
              Outfit <span className="text-[#8b1a1a]">Recommendations</span>
            </h1>
            
            {/* ⚪ Picket Fence White Description */}
            <div className="flex flex-col gap-1">
              <p className="text-white text-xs font-medium max-w-lg italic leading-relaxed opacity-95">
                Your personal AI-powered stylist. Curating your digital wardrobe for London's premier fashion events.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <ShieldCheck className="h-3 w-3 text-green-500" />
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                  Inventory Verified: {closet.length} Items
                </span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleRefresh} 
            disabled={isPending || isInitialLoading} 
            className="rounded-sm bg-[#8b1a1a] text-white px-6 py-4 h-auto hover:bg-[#a31f1f] transition-all shadow-[0_0_15px_rgba(139,26,26,0.4)] font-bold italic text-xs uppercase tracking-wider border-none"
          >
            {isPending ? <Loader2 className="animate-spin mr-2 h-3.5 w-3.5" /> : <RotateCcw className="mr-2 h-3.5 w-3.5" />}
            Update Style Logic
          </Button>
        </div>

        {/* GRID: 3-Card Layout with Purple Rain Edge */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {isInitialLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#8b1a1a]" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Accessing Digital Closet...</p>
            </div>
          ) : recommendations.length > 0 ? (
            recommendations.map((rec, idx) => (
              // 🔮 THE EDGE: Prince Purple Rain Gradient Border
              <div 
                key={idx} 
                className="relative group rounded-3xl p-[1px] bg-gradient-to-br from-zinc-800 via-[#0a0a0a] to-[#8839d4] hover:shadow-[0_0_25px_rgba(136,57,212,0.15)] transition-all duration-500"
              >
                <div className="bg-[#0a0a0a] rounded-[23px] h-full overflow-hidden">
                  <UpcomingEventAdviceCard 
                    eventAdvice={rec} 
                    cardIndex={idx} 
                    analyzedItems={closet} 
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center border border-dashed border-zinc-900 bg-[#0a0a0a] rounded-3xl">
               <Database className="h-8 w-8 text-zinc-800 mx-auto mb-4" />
               <p className="text-zinc-500 font-medium italic text-base">
                  Your inventory is ready. <br/> Click <span className="text-[#8b1a1a] font-bold">Update Style Logic</span> to view recommendations.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
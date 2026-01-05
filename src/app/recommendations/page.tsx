'use client';

/**
 * FILE: src/app/recommendations/page.tsx
 * NAME: Outfit Recommendations
 * THEME: Picket Fence White & Crimson
 * FIX: Resolved runtime crash, restored Grid, applied Camel Case title.
 */

import { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Sparkles, Database, ShieldCheck } from 'lucide-react';

// STABLE SERVER ACTIONS
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

  // 1. Initial Load via Admin SDK (Bypasses Client Network Errors)
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

  // 2. Refresh Style Logic (Handshake with AI)
  const handleRefresh = () => {
    if (closet.length === 0) {
      toast({ title: "Closet Empty", description: "Sync your items first." });
      return;
    }

    startTransition(async () => {
      try {
        const currentCloset = await getClosetDataAdmin();
        setCloset(currentCloset);

        // Sanitize data for Server Action
        const plainCloset = JSON.parse(JSON.stringify(currentCloset));
        const data = await getCalendarDataAction(plainCloset);
        
        if (data && data.length > 0) {
          setRecommendations(data);
          toast({ title: "Logic Updated", description: "3 Outfits Curated." });
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
    <div className="min-h-screen bg-[#f3f4f6] text-zinc-900" style={{ fontFamily: "'Alegreya', serif" }}>
      
      {/* HEADER: Camel Case Title */}
      <div className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                 <div className="bg-[#8b1a1a] p-1.5 rounded-sm shadow-md">
                    <Sparkles className="h-4 w-4 text-white" />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8b1a1a]">
                   SkomiDora Intelligence
                 </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black italic tracking-tight text-zinc-900 leading-tight">
                Outfit <span className="text-[#8b1a1a]">Recommendations</span>
              </h1>
              
              <div className="flex items-center gap-3">
                <p className="text-zinc-500 text-xs font-medium italic">
                  Inventory Verified: {closet.length} Items
                </p>
                <ShieldCheck className="h-3 w-3 text-green-600" />
              </div>
            </div>

            <Button 
              onClick={handleRefresh} 
              disabled={isPending || isInitialLoading} 
              className="rounded-full bg-zinc-900 text-white px-8 py-5 h-auto hover:bg-[#8b1a1a] transition-all shadow-lg font-bold italic text-xs uppercase tracking-widest border-none"
            >
              {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Update Style Logic
            </Button>
          </div>
        </div>
      </div>

      {/* GRID: 3-Card Layout */}
      <div className="container mx-auto py-16 px-6">
        {isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#8b1a1a]" />
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Accessing Digital Closet...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {recommendations.map((rec, idx) => (
              <UpcomingEventAdviceCard 
                key={idx} 
                eventAdvice={rec} 
                cardIndex={idx} 
                analyzedItems={closet} 
              />
            ))}
          </div>
        ) : (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-200 rounded-[2.5rem] bg-white">
             <Database className="h-8 w-8 text-zinc-200 mx-auto mb-4" />
             <p className="text-zinc-400 font-medium italic text-base">
                Your inventory is ready. <br/> Click <span className="text-[#8b1a1a] font-bold">Update Style Logic</span> to view recommendations.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
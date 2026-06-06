"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { generateShoppingRecommendations } from '@/app/actions/generate-shopping-recommendations';
import ShoppingRecommendations, { Recommendation } from '@/components/ShoppingRecommendations';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Search, CalendarHeart } from "lucide-react";
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500'] });

function StylistContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isStyling, setIsStyling] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  
  // THE CONNECTION: Reading the URL from the Events page
  const urlEvent = searchParams.get('event');
  const weatherContext = searchParams.get('weather') || ""; 
  
  // Fallback if they just click the sidebar without selecting an event first
  const displayHighlight = urlEvent || "General Wardrobe Refresh";
  
  const handleGenerateLooks = async () => {
    setIsStyling(true);
    try {
      const result = await generateShoppingRecommendations(displayHighlight, weatherContext);
      if (result.success && result.recommendations) {
        setRecs(result.recommendations);
      } else {
        toast({ title: "Styling failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Styling failed:", error);
      toast({ title: "Error", description: "Something went wrong generating looks.", variant: "destructive" });
    } finally {
      setIsStyling(false);
    }
  };

  return (
    <div className={`container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto scrollbar-hide bg-black text-zinc-100 ${inter.className} max-w-5xl pt-8`}>
      
      {/* LUXURY CONCIERGE HEADER CARD */}
      <div className="bg-[#050505] p-10 md:p-14 border border-zinc-900 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#9A1B22]" />
        
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <CalendarHeart className="h-5 w-5 text-[#9A1B22]" />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              Personal Shopper
            </span>
          </div>
          
          {/* NATIVE PLAYBILL FONT */}
          <h1 
            className="text-5xl md:text-7xl font-normal text-white mb-6 tracking-wide leading-tight"
            style={{ fontFamily: 'Playbill, Impact, sans-serif', letterSpacing: '0.05em' }}
          >
            Styling Consultation
          </h1>
          
          <div className="flex flex-col gap-1.5">
            <p className="text-zinc-400 text-xl font-light tracking-wide">
              Find pieces for this event: <span className="text-white font-medium italic">{displayHighlight}</span>
            </p>
            {weatherContext && (
              <p className="text-[#9A1B22] text-sm font-medium tracking-widest uppercase mt-2">
                • {weatherContext}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleGenerateLooks} 
          disabled={isStyling}
          className="bg-[#9A1B22] text-white hover:bg-[#7A151B] rounded-none px-12 py-7 font-bold uppercase tracking-[0.15em] text-xs transition-all shadow-lg w-full md:w-auto"
        >
          {isStyling ? (
            <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Consulting Stylist...</>
          ) : (
            <><Search className="mr-3 h-4 w-4" /> Find Missing Pieces</>
          )}
        </Button>
      </div>

      {/* RECOMMENDATIONS RESULTS */}
      {recs.length > 0 && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center gap-3 mb-8 px-2 border-b border-zinc-900 pb-5">
            <Sparkles className="h-6 w-6 text-[#9A1B22]" />
            <h2 
              className="text-4xl font-normal text-white tracking-wide"
              style={{ fontFamily: 'Playbill, Impact, sans-serif', letterSpacing: '0.05em' }}
            >
              Curated for: <span className="text-[#9A1B22]">{displayHighlight}</span>
            </h2>
          </div>
          <ShoppingRecommendations eventContext={displayHighlight} recommendations={recs} />
        </div>
      )}

    </div>
  );
}

export default function StylistPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-[85vh] bg-black"><Loader2 className="h-8 w-8 animate-spin text-[#9A1B22]" /></div>}>
      <StylistContent />
    </Suspense>
  );
}
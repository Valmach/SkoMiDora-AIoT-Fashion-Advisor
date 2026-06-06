"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { generateShoppingRecommendations } from '@/app/actions/generate-shopping-recommendations';
import ShoppingRecommendations, { Recommendation } from '@/components/ShoppingRecommendations';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Search } from "lucide-react";
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500'] });

function StylistContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isStyling, setIsStyling] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  
  // DYNAMIC CONTEXT LOGIC
  // If no event is passed in the URL, default to a generic shopping trip rather than assuming an event.
  const urlEvent = searchParams.get('event');
  const eventName = urlEvent || "General Wardrobe Refresh"; 
  const weatherContext = searchParams.get('weather') || "Seasonal transition pieces"; 

  const handleGenerateLooks = async () => {
    setIsStyling(true);
    try {
      const result = await generateShoppingRecommendations(eventName, weatherContext);
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
      <div className="bg-[#050505] p-10 border border-zinc-900 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#9A1B22]" />
        
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#9A1B22]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Personal Shopper
            </span>
          </div>
          
          <h1 className={`${playfair.className} text-4xl md:text-5xl font-bold text-white mb-3 tracking-wide`}>
            {urlEvent ? "Event Consultation" : "Styling Consultation"}
          </h1>
          
          <div className="flex flex-col gap-1">
            <p className="text-zinc-300 text-lg font-medium">
              Curating pieces for: <span className="text-white font-semibold">{eventName}</span>
            </p>
            {urlEvent && (
              <p className="text-zinc-500 text-sm">
                Focusing on: {weatherContext}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleGenerateLooks} 
          disabled={isStyling}
          className="bg-[#9A1B22] text-white hover:bg-[#7A151B] rounded-none px-10 py-6 font-bold uppercase tracking-[0.15em] text-xs transition-all shadow-lg w-full md:w-auto"
        >
          {isStyling ? (
            <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Analyzing Trends...</>
          ) : (
            <><Search className="mr-3 h-4 w-4" /> Find Missing Pieces</>
          )}
        </Button>
      </div>

      {/* RECOMMENDATIONS RESULTS */}
      {recs.length > 0 && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center gap-3 mb-8 px-2 border-b border-zinc-900 pb-4">
            <Sparkles className="h-5 w-5 text-[#9A1B22]" />
            <h2 className={`${playfair.className} text-2xl font-bold text-white tracking-wide`}>
              Curated for: <span className="text-[#9A1B22]">{eventName}</span>
            </h2>
          </div>
          <ShoppingRecommendations eventContext={eventName} recommendations={recs} />
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
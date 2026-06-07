"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { generateShoppingRecommendations } from '@/app/actions/generate-shopping-recommendations';
import ShoppingRecommendations, { Recommendation } from '@/components/ShoppingRecommendations';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Search, CalendarHeart, Tag, MapPin } from "lucide-react";
import { Inter, Great_Vibes } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });
const greatVibes = Great_Vibes({ subsets: ['latin'], weight: ['400'] });

const CATEGORIES = [
  "Any Missing Piece", 
  "Blouse", 
  "Jacket", 
  "Skirt", 
  "Trousers", 
  "Dress", 
  "Shoe", 
  "Handbag", 
  "Jewelry"
];

function StylistContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isStyling, setIsStyling] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Any Missing Piece");
  
  // Create an editable state for the event/destination
  const [eventContext, setEventContext] = useState("");
  
  const weatherContext = searchParams.get('weather') || ""; 

  // Pre-fill the input if they clicked here from a specific calendar event
  useEffect(() => {
    const urlEvent = searchParams.get('event');
    if (urlEvent) {
      setEventContext(urlEvent);
    }
  }, [searchParams]);
  
  const handleGenerateLooks = async () => {
    // Fallback to a general refresh if they leave the input completely blank
    const finalContext = eventContext.trim() || "General Wardrobe Refresh";

    setIsStyling(true);
    setRecs([]); 
    try {
      const result = await generateShoppingRecommendations(finalContext, weatherContext, activeCategory);
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
          
          <h1 className={`${greatVibes.className} text-6xl md:text-8xl font-normal text-white mb-6 tracking-wide leading-tight`}>
            Styling Consultation
          </h1>
          
          {/* EDITABLE DESTINATION & EVENT INPUT */}
          <div className="max-w-2xl">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2">
              <MapPin className="h-3 w-3 text-[#9A1B22]" /> 
              Destination & Event Context
            </label>
            <input 
              type="text"
              value={eventContext}
              onChange={(e) => setEventContext(e.target.value)}
              placeholder="e.g., Winter trip to Oslo, Gala in Paris, London business trip..."
              className="w-full bg-black border border-zinc-800 text-white px-5 py-4 text-sm font-light tracking-wide focus:border-[#9A1B22] focus:ring-1 focus:ring-[#9A1B22] outline-none transition-all placeholder:text-zinc-700"
            />
            {weatherContext && (
              <p className="text-[#9A1B22] text-xs font-medium tracking-widest uppercase mt-3">
                • Predicted Weather: {weatherContext}
              </p>
            )}
          </div>
        </div>
        
        {/* CATEGORY FILTER STRIP */}
        <div className="mb-8 mt-8 border-t border-zinc-900/50 pt-8">
          <div className="flex items-center gap-2 mb-4">
             <Tag className="h-3 w-3 text-[#9A1B22]" />
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Target Specific Garment</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 text-[11px] font-semibold tracking-widest uppercase transition-all
                  ${activeCategory === cat 
                    ? 'bg-[#9A1B22] text-white shadow-md' 
                    : 'bg-black text-zinc-500 border border-zinc-800 hover:border-zinc-500 hover:text-white'}
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleGenerateLooks} 
          disabled={isStyling}
          className="bg-[#9A1B22] text-white hover:bg-[#7A151B] rounded-none px-12 py-7 font-bold uppercase tracking-[0.15em] text-xs transition-all shadow-lg w-full md:w-auto mt-2"
        >
          {isStyling ? (
            <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Consulting Stylist...</>
          ) : (
            <><Search className="mr-3 h-4 w-4" /> Find {activeCategory === "Any Missing Piece" ? "Missing Pieces" : activeCategory}</>
          )}
        </Button>
      </div>

      {/* RECOMMENDATIONS RESULTS */}
      {recs.length > 0 && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center gap-3 mb-8 px-2 border-b border-zinc-900 pb-5">
            <Sparkles className="h-6 w-6 text-[#9A1B22]" />
            <h2 className={`${greatVibes.className} text-5xl font-normal text-white tracking-wide`}>
              Curated <span className="text-[#9A1B22]">{activeCategory !== "Any Missing Piece" ? activeCategory + "s" : "Pieces"}</span>
            </h2>
          </div>
          <ShoppingRecommendations eventContext={eventContext || "General Wardrobe Refresh"} recommendations={recs} />
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
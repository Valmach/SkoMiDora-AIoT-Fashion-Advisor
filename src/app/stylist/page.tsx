"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { generateShoppingRecommendations } from '@/app/actions/generate-shopping-recommendations';
import ShoppingRecommendations, { Recommendation } from '@/components/ShoppingRecommendations';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarHeart, CloudSun, Sparkles } from "lucide-react";

function StylistContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isStyling, setIsStyling] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  
  const eventName = searchParams.get('event') || "Everyday Styling"; 
  const weatherContext = searchParams.get('weather') || "Current local weather - comfortable seasonal wear"; 

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
    <div className="container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto scrollbar-hide text-white max-w-4xl pt-8">
      
      {/* HEADER CARD */}
      <div className="bg-black p-8 rounded-3xl border border-zinc-800 shadow-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white mb-2">
            <CalendarHeart className="h-8 w-8 text-[#DC143C]" />
            Upcoming Event
          </h1>
          <p className="text-zinc-300 text-lg">{eventName}</p>
          <p className="text-zinc-500 text-sm mt-3 flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-[#DC143C]" />
            {weatherContext}
          </p>
        </div>
        
        <Button 
          onClick={handleGenerateLooks} 
          disabled={isStyling}
          className="bg-[#DC143C] text-white hover:bg-red-700 rounded-xl px-8 py-6 font-bold uppercase tracking-widest text-sm transition-all shadow-lg shadow-red-900/20 w-full md:w-auto"
        >
          {isStyling ? (
            <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Consulting Stylist...</>
          ) : (
            "Find Missing Pieces"
          )}
        </Button>
      </div>

      {/* RECOMMENDATIONS RESULTS */}
      {recs.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 mb-6 px-2">
            <Sparkles className="h-6 w-6 text-[#E1AD01]" />
            <h2 className="text-2xl font-serif text-white">
              Curated for: <span className="text-[#E1AD01]">{eventName}</span>
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
    <Suspense fallback={<div className="flex justify-center items-center h-[85vh]"><Loader2 className="h-8 w-8 animate-spin text-[#DC143C]" /></div>}>
      <StylistContent />
    </Suspense>
  );
}
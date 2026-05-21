'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink } from "lucide-react";

export type Recommendation = {
  suggestedBrand: string;
  itemType: string;
  description: string;
  shopUrl: string;
};

interface ShoppingRecommendationsProps {
  eventContext: string;
  recommendations: Recommendation[];
}

export default function ShoppingRecommendations({ eventContext, recommendations }: ShoppingRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 border-b border-border/50 pb-4">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="text-xl font-medium tracking-tight">
          Curated for: <span className="font-semibold text-amber-500/90">{eventContext}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => {
          // Extract the first letter of the brand for a sleek background monogram
          const monogram = rec.suggestedBrand.charAt(0).toUpperCase();

          return (
            <Card key={index} className="overflow-hidden border-zinc-800 bg-zinc-950 hover:border-zinc-600 transition-all duration-300 group shadow-lg">
              <CardContent className="p-0 flex flex-col h-full relative">
                
                {/* Sleek Typographic Header (Replaces the empty image box) */}
                <div className="h-32 bg-gradient-to-br from-zinc-900 to-black border-b border-zinc-800 flex items-center justify-center relative overflow-hidden">
                   {/* Giant faded letter in the background */}
                   <span className="text-[10rem] font-serif text-zinc-800/40 absolute -bottom-10 -right-4 select-none group-hover:scale-110 group-hover:text-zinc-700/30 transition-all duration-700">
                     {monogram}
                   </span>
                   
                   {/* Brand Name */}
                   <h4 className="font-medium text-lg tracking-[0.25em] uppercase text-zinc-100 z-10 text-center px-4">
                     {rec.suggestedBrand}
                   </h4>
                </div>
                
                {/* Content Section */}
                <div className="p-6 flex flex-col flex-grow relative z-20">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="font-normal tracking-[0.1em] text-xs border-zinc-700 text-zinc-300 uppercase">
                      {rec.itemType}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-zinc-400 leading-relaxed flex-grow mb-8 font-light">
                    {rec.description}
                  </p>

                  {/* Action Button - Styled sharper for luxury feel */}
                  <Button asChild className="w-full bg-zinc-100 text-black hover:bg-white group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all mt-auto rounded-sm tracking-wide">
                    <a href={rec.shopUrl} target="_blank" rel="noopener noreferrer">
                      Shop the Look
                      <ExternalLink className="ml-2 h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
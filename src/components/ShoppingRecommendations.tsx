'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => {
          // Extract the first letter of the CATEGORY for the sleek background monogram
          const categoryMonogram = rec.itemType.charAt(0).toUpperCase();

          return (
            <Card key={index} className="overflow-hidden border-zinc-900 bg-[#050505] hover:border-[#9A1B22]/50 transition-all duration-500 group shadow-2xl relative rounded-none">
              {/* Subtle top border glow on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9A1B22]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-30" />
              
              <CardContent className="p-0 flex flex-col h-full relative">
                
                {/* Sleek Typographic Header - Now Category Focused */}
                <div className="h-32 bg-black border-b border-zinc-900 flex items-center justify-center relative overflow-hidden">
                   {/* Giant faded letter of the Category */}
                   <span className="text-[10rem] font-serif text-zinc-900/30 absolute -bottom-10 -right-4 select-none group-hover:scale-110 group-hover:text-zinc-800/40 transition-all duration-700">
                     {categoryMonogram}
                   </span>
                   
                   {/* Category Name */}
                   <h4 className="font-medium text-xl tracking-[0.3em] uppercase text-white z-10 text-center px-4">
                     {rec.itemType}
                   </h4>
                </div>
                
                {/* Content Section */}
                <div className="p-8 flex flex-col flex-grow relative z-20">
                  <div className="flex justify-between items-start mb-5">
                    {/* Brand name moved to the badge */}
                    <Badge variant="outline" className="font-medium tracking-[0.15em] text-[10px] border-[#9A1B22]/30 text-[#9A1B22] bg-[#9A1B22]/5 uppercase px-3 py-1 rounded-none">
                      {rec.suggestedBrand}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-zinc-400 leading-relaxed flex-grow mb-8 font-light italic">
                    &ldquo;{rec.description}&rdquo;
                  </p>

                  {/* Action Button - Styled for Midnight Oxblood Luxury */}
                  <Button asChild className="w-full bg-[#9A1B22] text-white hover:bg-[#7A151B] group-hover:shadow-[0_0_20px_rgba(154,27,34,0.2)] transition-all mt-auto rounded-none tracking-[0.15em] uppercase text-xs h-12 font-bold">
                    <a href={rec.shopUrl} target="_blank" rel="noopener noreferrer">
                      Shop the Look
                      <ExternalLink className="ml-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
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
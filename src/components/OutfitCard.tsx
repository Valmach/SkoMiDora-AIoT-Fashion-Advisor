'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OutfitCardProps {
  outfit: {
    eventName?: string;
    eventTime?: string;
    location?: string;
    weather?: string;
    outfitIdea: string;
    reasoning: string;
    items: string[];
    colorPalette?: string;
  };
  index: number;
  analyzedItems: any[];
}

export default function OutfitCard({ outfit, index, analyzedItems }: OutfitCardProps) {
  
  // HELPER: Find the real image URL
  const findClosetImage = (itemName: string) => {
    if (!analyzedItems || analyzedItems.length === 0) return null;

    const exact = analyzedItems.find(i => 
      i.itemName?.toLowerCase() === itemName.toLowerCase()
    );
    if (exact?.imageUrl) return exact.imageUrl;

    const fuzzy = analyzedItems.find(i => 
      i.itemName?.toLowerCase().includes(itemName.toLowerCase()) || 
      itemName.toLowerCase().includes(i.itemName?.toLowerCase())
    );
    
    return fuzzy?.imageUrl || null;
  };

  return (
    // INCREASED HEIGHT: min-h-[800px] for maximum vertical real estate
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col min-h-[800px] hover:border-zinc-700 transition-colors duration-300">
      
      {/* HEADER SECTION */}
      <CardHeader className="pb-3 bg-zinc-950/50 border-b border-zinc-800/50 px-4 pt-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">
              <span className="text-[#DC143C]">0{index + 1}</span>
              <span>•</span>
              <span>{outfit.location || "Curated Look"}</span>
            </div>
            <CardTitle className="text-base text-white font-serif tracking-wide leading-snug">
              {outfit.outfitIdea}
            </CardTitle>
          </div>
          {outfit.weather && (
            <Badge variant="outline" className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[9px] px-1.5 py-0.5 shrink-0">
              {outfit.weather}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* CONTENT SECTION */}
      <CardContent className="flex-1 flex flex-col gap-5 pt-4 px-4 pb-6">
        
        {/* VISUAL ITEMS GRID */}
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 h-full content-start">
            {outfit.items.slice(0, 4).map((item, i) => { 
              const imageUrl = findClosetImage(item);
              
              return (
                <div key={i} className="flex flex-col gap-2">
                  {/* Image Container */}
                  <div className="relative aspect-[3/4] rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden shadow-sm w-full p-1">
                    {imageUrl ? (
                      <Image 
                        src={imageUrl} 
                        alt={item} 
                        fill 
                        // FIX: Changed from 'object-cover' to 'object-contain'
                        // This ensures the whole image is visible, never cropped.
                        className="object-contain"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-2 gap-1">
                         <span className="text-[24px] opacity-20">👕</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata */}
                  <p className="text-xs text-zinc-300 font-medium leading-tight">
                    {item}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* REASONING TEXT */}
        <div className="relative pl-3 border-l-2 border-[#DC143C]/30 mt-4">
          <p className="text-sm text-zinc-300 leading-relaxed italic">
            "{outfit.reasoning}"
          </p>
        </div>

        {/* Palette Footer */}
        {outfit.colorPalette && (
          <div className="mt-2 pt-3 border-t border-zinc-800/50 flex flex-col gap-1">
             <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Color Palette</span>
             <span className="text-xs text-zinc-400 font-serif italic">{outfit.colorPalette}</span>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
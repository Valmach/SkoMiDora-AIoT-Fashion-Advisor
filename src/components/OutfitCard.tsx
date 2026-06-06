"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import WardrobeMedia from "@/components/WardrobeMedia"; 

interface OutfitCardProps {
  outfit: {
    eventName?: string;
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
  if (!outfit) return null;
  const items = outfit.items || [];
  
  const VIDEO_URL = "https://media.w3.org/2010/05/sintel/trailer_hd.mp4";
  
  // IMAGE FINDER
  const findClosetImage = (itemName: string) => {
    if (!analyzedItems || analyzedItems.length === 0) return null;
    const exact = analyzedItems.find(i => i.itemName?.toLowerCase() === itemName.toLowerCase());
    if (exact?.imageUrl) return exact.imageUrl;
    const fuzzy = analyzedItems.find(i => 
      i.itemName?.toLowerCase().includes(itemName.toLowerCase()) || 
      itemName.toLowerCase().includes(i.itemName?.toLowerCase())
    );
    return fuzzy?.imageUrl || null;
  };

  return (
    <Card className="bg-[#050505] border-zinc-900 overflow-hidden flex flex-col h-full min-h-[800px] hover:border-[#9A1B22]/50 transition-all duration-300 group">
      
      {/* HEADER - Changed to h-auto so text can breathe */}
      <CardHeader className="pb-3 bg-black border-b border-zinc-900 px-5 pt-5 relative h-auto min-h-[120px] shrink-0">
        <div className="flex justify-between items-start gap-4 relative z-10 h-full">
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-[0.2em]">
              <span className="text-[#9A1B22]">0{index + 1}</span>
              <span>•</span>
              <span>{outfit.location || "Curated Look"}</span>
            </div>
            {/* Removed line-clamp-3 so titles don't get cut off */}
            <CardTitle className="text-sm text-zinc-200 font-serif font-normal tracking-wide leading-relaxed">
              {outfit.outfitIdea}
            </CardTitle>
          </div>
          {outfit.weather && (
            <Badge variant="outline" className="bg-black text-zinc-500 border-zinc-800 text-[9px] px-2 py-1 shrink-0 mt-1 uppercase tracking-widest">
              {outfit.weather}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="flex-1 flex flex-col gap-4 pt-5 px-5 pb-6 bg-[#050505] overflow-hidden">
        
        {/* 1. WARDROBE GRID */}
        <div className="w-full">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 h-full content-start">
            {items.slice(0, 4).map((item, i) => { 
              const imageUrl = findClosetImage(item);
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="relative aspect-[3/4] rounded-sm bg-black border border-zinc-900 overflow-hidden shadow-sm w-full p-1 group/item">
                    {imageUrl ? (
                      <Image 
                        src={imageUrl} alt={item} fill 
                        className="object-contain opacity-80 group-hover/item:opacity-100 transition-opacity duration-500"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black text-2xl opacity-20">👕</div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium tracking-[0.1em] uppercase truncate" title={item}>
                    {item}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. VIDEO STRIP */}
        <div className="relative w-full h-32 bg-black border border-zinc-900 group/video overflow-hidden shrink-0">
          <WardrobeMedia src={VIDEO_URL} alt="Style Motion" />
           <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 opacity-90">
              <Sparkles size={12} className="text-[#9A1B22]" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-white font-bold drop-shadow-md">Style Motion</span>
           </div>
        </div>

       {/* 3. REASONING TEXT */}
       <div className="relative pl-4 border-l-2 border-[#9A1B22]/50 h-auto min-h-[60px] mt-2">
          <p className="text-xs text-zinc-400 font-light leading-loose italic">
            &ldquo;{outfit.reasoning}&rdquo;
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
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
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col h-full min-h-[800px] hover:border-[#DC143C]/30 transition-all duration-300 group">
      
      {/* HEADER */}
      <CardHeader className="pb-3 bg-zinc-950/50 border-b border-zinc-800/50 px-4 pt-4 relative h-[120px] shrink-0">
        <div className="flex justify-between items-start gap-4 relative z-10 h-full">
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">
              <span className="text-[#DC143C]">0{index + 1}</span>
              <span>•</span>
              <span>{outfit.location || "Curated Look"}</span>
            </div>
            <CardTitle className="text-sm text-zinc-200 font-serif font-normal tracking-wide leading-relaxed line-clamp-3">
              {outfit.outfitIdea}
            </CardTitle>
          </div>
          {outfit.weather && (
            <Badge variant="outline" className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[9px] px-1.5 py-0.5 shrink-0 mt-1">
              {outfit.weather}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* CONTENT - Reduced gap-5 to gap-3 for tighter stacking */}
      <CardContent className="flex-1 flex flex-col gap-3 pt-4 px-4 pb-6 bg-zinc-900 overflow-hidden">
        
        {/* 1. WARDROBE GRID - Removed flex-1 so it no longer pushes the video away */}
        <div className="w-full">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 h-full content-start">
            {items.slice(0, 4).map((item, i) => { 
              const imageUrl = findClosetImage(item);
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="relative aspect-[3/4] rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden shadow-sm w-full p-1 group/item">
                    {imageUrl ? (
                      <Image 
                        src={imageUrl} alt={item} fill 
                        className="object-contain opacity-90 group-hover/item:opacity-100 transition-opacity"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-2xl opacity-20">👕</div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-light tracking-wider uppercase truncate" title={item}>
                    {item}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. VIDEO STRIP */}
        <div className="relative w-full h-32 bg-zinc-950 rounded-lg border border-zinc-800 group/video overflow-hidden shrink-0 shadow-inner">
          <WardrobeMedia src={VIDEO_URL} alt="Style Motion" />
           <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 opacity-80">
              <Sparkles size={10} className="text-[#DC143C]" />
              <span className="text-[9px] uppercase tracking-wider text-white font-medium text-shadow-sm">Style Motion</span>
           </div>
        </div>

      {/* 3. REASONING TEXT - Removed mt-auto so it snaps tight to the video strip */}
      <div className="relative pl-3 border-l-2 border-[#DC143C]/30 h-auto min-h-[60px]">
          <p className="text-xs text-zinc-400 font-light leading-relaxed italic line-clamp-4">
            &ldquo;{outfit.reasoning}&rdquo;
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
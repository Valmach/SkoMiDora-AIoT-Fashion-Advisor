'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Sparkles } from "lucide-react";
import { useState, useRef } from "react";

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
  
  // --- VIDEO LOGIC ---
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const VIDEO_URL = "http://googleusercontent.com/generated_video_content/766333651433314653";

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // HELPER: Find image URL
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
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col min-h-[850px] hover:border-purple-500/30 transition-all duration-300 group">
      
      {/* HEADER SECTION */}
      <CardHeader className="pb-3 bg-zinc-950/50 border-b border-zinc-800/50 px-4 pt-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/0 via-purple-900/0 to-purple-900/0 group-hover:via-purple-900/10 transition-all duration-500 pointer-events-none" />

        <div className="flex justify-between items-start gap-4 relative z-10">
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
      <CardContent className="flex-1 flex flex-col gap-5 pt-4 px-4 pb-6 bg-zinc-900">
        
        {/* 1. VISUAL ITEMS GRID (Wardrobe) */}
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 h-full content-start">
            {outfit.items.slice(0, 4).map((item, i) => { 
              const imageUrl = findClosetImage(item);
              
              return (
                <div key={i} className="flex flex-col gap-2">
                  <div className="relative aspect-[3/4] rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden shadow-sm w-full p-1 group/item">
                    {imageUrl ? (
                      <Image 
                        src={imageUrl} 
                        alt={item} 
                        fill 
                        className="object-contain opacity-90 group-hover/item:opacity-100 transition-opacity"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-2 gap-1">
                          <span className="text-[24px] opacity-20">👕</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 font-medium leading-tight">
                    {item}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. VIDEO STRIP (Moved Here: Below Wardrobe, Above Text) */}
        <div className="relative w-full h-32 bg-black rounded-lg border border-zinc-800 group/video overflow-hidden shrink-0 shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none" />
          
          <video 
            ref={videoRef}
            className={`w-full h-full object-cover transition-all duration-700 ${isPlaying ? 'opacity-100 scale-100' : 'opacity-60 grayscale scale-105'}`}
            src={VIDEO_URL}
            loop
            playsInline
            muted
          />

          {/* Play Button */}
          <div 
             className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
             onClick={togglePlay}
           >
              <div className={`rounded-full bg-purple-600/90 p-2 text-white backdrop-blur-sm hover:bg-purple-500 transition-all shadow-lg ${isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"}`}>
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </div>
           </div>
           
           <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 opacity-80">
              <Sparkles size={10} className="text-purple-400" />
              <span className="text-[9px] uppercase tracking-wider text-white font-medium text-shadow-sm">Style Motion</span>
           </div>
        </div>

        {/* 3. REASONING TEXT (Bottom Text) */}
        <div className="relative pl-3 border-l-2 border-[#DC143C]/30">
          <p className="text-sm text-zinc-300 leading-relaxed italic">
            &ldquo;{outfit.reasoning}&rdquo;
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
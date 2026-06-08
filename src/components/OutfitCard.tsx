"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CloudRain, Snowflake, Sun } from "lucide-react";

const SafeImage = ({ src, alt }: { src: string, alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 border border-zinc-800 p-2 text-center">
        <span className="text-[8px] text-zinc-500 uppercase tracking-widest">{alt || "Item Unavailable"}</span>
      </div>
    );
  }

  return (
    <Image 
      src={src} 
      alt={alt} 
      fill 
      className="object-contain opacity-80 group-hover/item:opacity-100 transition-opacity duration-500"
      sizes="(max-width: 768px) 50vw, 33vw"
      onError={() => setHasError(true)} 
    />
  );
};

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

  // 1. UPDATED SOURCE IMAGES: Explicitly bright, daytime, high-saturation photos
  const getCityContext = () => {
    const textContext = `${outfit.location || ""} ${outfit.outfitIdea || ""} ${outfit.reasoning || ""}`.toLowerCase();
    
    if (textContext.includes('paris') || textContext.includes('france')) return { bg: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800", label: "Paris" }; // Bright Eiffel Tower
    if (textContext.includes('oslo') || textContext.includes('nordic') || textContext.includes('norway')) return { bg: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&q=80&w=800", label: "Oslo" }; // Bright Norwegian coast
    if (textContext.includes('london') || textContext.includes('uk')) return { bg: "https://images.unsplash.com/photo-1520939817805-64a23d865b16?auto=format&fit=crop&q=80&w=800", label: "London" }; // Bright London street
    if (textContext.includes('rome') || textContext.includes('italy')) return { bg: "https://images.unsplash.com/photo-1533676802871-efa80c98696b?auto=format&fit=crop&q=80&w=800", label: "Rome" }; // Sunny Rome
    if (textContext.includes('new york') || textContext.includes('nyc')) return { bg: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800", label: "New York" }; // Daytime NYC
    if (textContext.includes('tokyo') || textContext.includes('japan')) return { bg: "https://images.unsplash.com/photo-1536098561-6c4ffcb36fb7?auto=format&fit=crop&q=80&w=800", label: "Tokyo" }; // Bright Tokyo
    if (textContext.includes('milan')) return { bg: "https://images.unsplash.com/photo-1534346761502-3c220c32d4af?auto=format&fit=crop&q=80&w=800", label: "Milan" }; // Sunny Duomo

    const fallbackLabel = outfit.location && outfit.location.toLowerCase() !== "curated style" ? outfit.location.split(',')[0] : "Atmosphere";
    return { bg: "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?auto=format&fit=crop&q=80&w=800", label: fallbackLabel }; // Bright luxury street
  };

  // 2. CSS FIX: Stripped out the heavy black overlays, using ultra-light tints
  const getWeatherEffect = () => {
    const w = `${outfit.weather || ""} ${outfit.reasoning || ""}`.toLowerCase();
    
    if (w.includes('rain') || w.includes('drizzle') || w.includes('wet')) return { overlay: "bg-slate-900/10", icon: <CloudRain size={12} className="text-slate-100" /> };
    if (w.includes('snow') || w.includes('cold') || w.includes('winter')) return { overlay: "bg-white/10", icon: <Snowflake size={12} className="text-white" /> };
    if (w.includes('sun') || w.includes('warm') || w.includes('hot') || w.includes('clear') || w.includes('summer')) return { overlay: "bg-amber-400/10", icon: <Sun size={12} className="text-amber-400" /> };
    
    return { overlay: "bg-transparent", icon: <MapPin size={12} className="text-zinc-200" /> };
  };

  const { bg: bgImage, label: cityLabel } = getCityContext();
  const { overlay, icon } = getWeatherEffect();

  return (
    <Card className="bg-[#050505] border-zinc-900 overflow-hidden flex flex-col h-full min-h-[800px] hover:border-[#9A1B22]/50 transition-all duration-500 group shadow-2xl rounded-none">
      
      <CardHeader className="pb-4 bg-black border-b border-zinc-900 px-5 pt-5 relative h-auto shrink-0">
        <div className="flex flex-col gap-3 relative z-10 w-full">
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] shrink-0 mt-1">
              <span className="text-[#9A1B22]">0{index + 1}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">{cityLabel.toUpperCase()}</span>
            </div>
            {outfit.weather && (
              <Badge variant="outline" className="bg-black text-zinc-500 border-zinc-800 text-[8px] px-2 py-0.5 uppercase tracking-widest text-right max-w-[50%] line-clamp-2 leading-tight rounded-none">
                {outfit.weather}
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm text-zinc-200 font-serif font-normal tracking-wide leading-relaxed w-full">
            {outfit.outfitIdea}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pt-5 px-5 pb-6 bg-[#050505] overflow-hidden">
        
        {/* 1. WARDROBE GRID */}
        <div className="w-full">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 h-full content-start">
            {items.slice(0, 4).map((item, i) => { 
              const imageUrl = findClosetImage(item);
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="relative aspect-[3/4] rounded-sm bg-black border border-zinc-900 overflow-hidden shadow-sm w-full p-1 group/item">
                    <SafeImage src={imageUrl || ""} alt={item} />
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium tracking-[0.1em] uppercase truncate" title={item}>
                    {item}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. DYNAMIC CITY ATMOSPHERICS */}
        <div className="relative w-full h-36 border border-zinc-900 group/city overflow-hidden shrink-0 mt-2 bg-zinc-900 rounded-sm">
           <img 
             src={bgImage} 
             alt={cityLabel}
             // FIX: opacity-100 instead of 90 so no dark background bleeds through
             className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover/city:scale-105 transition-transform duration-1000 ease-in-out"
             loading="lazy"
             onError={(e) => {
               e.currentTarget.style.display = 'none';
             }}
           />
           <div className={`absolute inset-0 z-10 ${overlay}`} />
           
           {/* FIX: Reduced gradient height from h-1/2 to h-1/3 and lightened from black/80 to black/50 */}
           <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent z-10" />
           
           <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 opacity-100 backdrop-blur-sm bg-black/30 px-3 py-1.5 border border-zinc-800/50">
              {icon}
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-100 font-bold drop-shadow-md">
                {cityLabel}
              </span>
           </div>
        </div>

       {/* 3. REASONING TEXT */}
       <div className="relative pl-4 border-l-2 border-[#9A1B22]/50 h-auto min-h-[60px] mt-4">
          <p className="text-xs text-zinc-400 font-light leading-loose italic">
            &ldquo;{outfit.reasoning}&rdquo;
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
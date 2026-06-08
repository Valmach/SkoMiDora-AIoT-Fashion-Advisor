"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CloudRain, Snowflake, Sun } from "lucide-react";

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
  
  // IMAGE FINDER FOR WARDROBE GRID
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

  // 1. DEEP SEARCH CITY MATCHER
  const getCityContext = () => {
    // Scan everything the AI generated to hunt for destination clues
    const textContext = `${outfit.location || ""} ${outfit.outfitIdea || ""} ${outfit.reasoning || ""}`.toLowerCase();
    
    if (textContext.includes('paris') || textContext.includes('france')) return { bg: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800", label: "Paris" };
    if (textContext.includes('oslo') || textContext.includes('nordic') || textContext.includes('norway')) return { bg: "https://images.unsplash.com/photo-1517457210515-32c0f209ddc6?auto=format&fit=crop&q=80&w=800", label: "Oslo" };
    if (textContext.includes('london') || textContext.includes('uk')) return { bg: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=800", label: "London" };
    if (textContext.includes('rome') || textContext.includes('italy')) return { bg: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=800", label: "Rome" };
    if (textContext.includes('new york') || textContext.includes('nyc')) return { bg: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800", label: "New York" };
    if (textContext.includes('tokyo') || textContext.includes('japan')) return { bg: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=800", label: "Tokyo" };
    if (textContext.includes('milan')) return { bg: "https://images.unsplash.com/photo-1534346761502-3c220c32d4af?auto=format&fit=crop&q=80&w=800", label: "Milan" };

    // Upgraded Fallback: An actual sweeping luxury city street scape
    const fallbackLabel = outfit.location && outfit.location.toLowerCase() !== "curated style" ? outfit.location.split(',')[0] : "Atmosphere";
    return { bg: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=800", label: fallbackLabel };
  };

  // 2. DYNAMIC WEATHER CSS OVERLAY
  const getWeatherEffect = () => {
    const w = `${outfit.weather || ""} ${outfit.reasoning || ""}`.toLowerCase();
    
    if (w.includes('rain') || w.includes('drizzle') || w.includes('wet')) return { overlay: "bg-gradient-to-b from-slate-900/90 via-slate-800/50 to-black", icon: <CloudRain size={12} className="text-slate-400" /> };
    if (w.includes('snow') || w.includes('cold') || w.includes('winter')) return { overlay: "bg-gradient-to-b from-zinc-200/20 via-transparent to-black mix-blend-screen", icon: <Snowflake size={12} className="text-zinc-300" /> };
    if (w.includes('sun') || w.includes('warm') || w.includes('hot') || w.includes('clear') || w.includes('summer')) return { overlay: "bg-gradient-to-b from-amber-500/20 via-transparent to-black mix-blend-overlay", icon: <Sun size={12} className="text-amber-500" /> };
    
    return { overlay: "bg-gradient-to-t from-black via-black/60 to-transparent", icon: <MapPin size={12} className="text-zinc-500" /> };
  };

  const { bg: bgImage, label: cityLabel } = getCityContext();
  const { overlay, icon } = getWeatherEffect();

  return (
    <Card className="bg-[#050505] border-zinc-900 overflow-hidden flex flex-col h-full min-h-[800px] hover:border-[#9A1B22]/50 transition-all duration-500 group shadow-2xl rounded-none">
      
      {/* HEADER */}
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

        {/* 2. DYNAMIC CITY ATMOSPHERICS */}
        <div className="relative w-full h-36 border border-zinc-900 group/city overflow-hidden shrink-0 mt-2 bg-black rounded-sm">
           {/* Black & White Desaturated City Image */}
           <img 
             src={bgImage} 
             alt={cityLabel}
             className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity group-hover/city:scale-105 transition-transform duration-1000 ease-in-out"
             loading="lazy"
           />
           {/* Weather-Responsive CSS Overlay */}
           <div className={`absolute inset-0 z-10 ${overlay}`} />
           
           {/* Sleek Context Label */}
           <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 opacity-90 backdrop-blur-sm bg-black/40 px-3 py-1.5 border border-zinc-800/50">
              {icon}
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-300 font-bold drop-shadow-md">
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
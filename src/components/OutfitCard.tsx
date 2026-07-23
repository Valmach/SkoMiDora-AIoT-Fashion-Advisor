"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CloudRain, Snowflake, Sun } from "lucide-react";
// ✅ Pulled in fonts
import { Gelasio, Great_Vibes } from 'next/font/google';

const gelasio = Gelasio({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic']
});

const greatVibes = Great_Vibes({ 
  subsets: ['latin'], 
  weight: ['400'] 
});

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
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-contain opacity-80 group-hover/item:opacity-100 transition-opacity duration-500"
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

const CITY_GALLERIES: Record<string, string[]> = {
  'oslo': [
    "https://images.pexels.com/photos/33377313/pexels-photo-33377313.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/19549105/pexels-photo-19549105.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/30297579/pexels-photo-30297579.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ],
  'paris': [
    "https://images.pexels.com/photos/33320737/pexels-photo-33320737.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/30297579/pexels-photo-30297579.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/5659303/pexels-photo-5659303.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ],
  'rome': [
    "https://images.pexels.com/photos/5659303/pexels-photo-5659303.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/33008929/pexels-photo-33008929.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/33320737/pexels-photo-33320737.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ],
  'london': [
    "https://images.pexels.com/photos/30297579/pexels-photo-30297579.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/33320737/pexels-photo-33320737.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/19549105/pexels-photo-19549105.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ],
  'new york': [
    "https://images.pexels.com/photos/33008929/pexels-photo-33008929.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/33320737/pexels-photo-33320737.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/30297579/pexels-photo-30297579.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ],
  'default': [
    "https://images.pexels.com/photos/33320737/pexels-photo-33320737.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/5659303/pexels-photo-5659303.jpeg?auto=compress&cs=tinysrgb&w=1000",
    "https://images.pexels.com/photos/30297579/pexels-photo-30297579.jpeg?auto=compress&cs=tinysrgb&w=1000"
  ]
};

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

  const getCityData = () => {
    const strictContext = `${outfit.location || ""} ${outfit.eventName || ""}`.toLowerCase();
    let cityKey = 'default';
    
    let label = outfit.location && outfit.location.toLowerCase() !== "curated style" && outfit.location.toLowerCase() !== "global destination" 
      ? outfit.location.split(',')[0].trim() 
      : "Destination";

    if (strictContext.includes('oslo') || strictContext.includes('nordic') || strictContext.includes('norway')) { 
      cityKey = 'oslo'; 
      label = label === "Destination" ? "Oslo" : label; 
    }
    else if (strictContext.includes('paris') || strictContext.includes('france')) { 
      cityKey = 'paris'; 
      label = label === "Destination" ? "Paris" : label; 
    }
    else if (strictContext.includes('london') || strictContext.includes('uk')) { 
      cityKey = 'london'; 
      label = label === "Destination" ? "London" : label; 
    }
    else if (strictContext.includes('rome') || strictContext.includes('italy')) { 
      cityKey = 'rome'; 
      label = label === "Destination" ? "Rome" : label; 
    }
    else if (strictContext.includes('new york') || strictContext.includes('nyc')) { 
      cityKey = 'new york'; 
      label = label === "Destination" ? "New York" : label; 
    }

    const imageArray = CITY_GALLERIES[cityKey] || CITY_GALLERIES['default'];
    const baseImage = imageArray[index % imageArray.length];
    
    const bgImage = baseImage.includes('?') ? `${baseImage}&v=forceUpdate` : `${baseImage}?v=forceUpdate`;

    return { bg: bgImage, label: label, cityKey: cityKey }; 
  };

  const getWeatherEffect = () => {
    const w = `${outfit.weather || ""} ${outfit.reasoning || ""}`.toLowerCase();
    if (w.includes('rain') || w.includes('drizzle') || w.includes('wet')) return { overlay: "bg-slate-900/10", icon: <CloudRain size={12} className="text-slate-100" /> };
    if (w.includes('snow') || w.includes('cold') || w.includes('winter')) return { overlay: "bg-white/10", icon: <Snowflake size={12} className="text-white" /> };
    if (w.includes('sun') || w.includes('warm') || w.includes('hot') || w.includes('clear') || w.includes('summer')) return { overlay: "bg-amber-400/10", icon: <Sun size={12} className="text-amber-400" /> };
    return { overlay: "bg-transparent", icon: <MapPin size={12} className="text-zinc-200" /> };
  };

  const { bg: bgImage, label: displayLocation } = getCityData();
  const { overlay, icon } = getWeatherEffect();

  return (
    <Card className="bg-[#050505] border-zinc-900 overflow-hidden flex flex-col hover:border-[#9A1B22]/50 transition-all duration-500 group shadow-2xl rounded-none">
      
      <CardHeader className="pb-4 bg-black border-b border-zinc-900 px-5 pt-5 relative h-auto shrink-0 overflow-hidden">
        <div className="flex flex-col gap-3 relative z-10 w-full">
          
          <div className="flex items-start justify-between gap-3 w-full">
            <div className={`${gelasio.className} flex items-center gap-2 text-[11px] text-zinc-300 uppercase tracking-[0.15em] shrink-0 mt-1`}>
              <span className="text-[#9A1B22] font-bold">0{index + 1}</span>
              <span className="text-zinc-700 font-sans">•</span>
              <span className="truncate max-w-[160px] font-medium">{displayLocation}</span>
            </div>
            
            {outfit.weather && (
              <Badge 
                variant="outline" 
                title={outfit.weather}
                className="bg-zinc-900/50 text-zinc-400 border-zinc-800 text-[8px] px-2 py-0.5 uppercase tracking-wider text-right max-w-[45%] truncate whitespace-nowrap overflow-hidden rounded-sm block"
              >
                {outfit.weather}
              </Badge>
            )}
          </div>
          
          <CardTitle className="text-sm text-zinc-200 font-serif font-normal tracking-wide leading-relaxed w-full line-clamp-2">
            {outfit.outfitIdea}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pt-5 px-5 pb-6 bg-[#050505]">
        
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

        <div className="relative w-full h-36 border border-zinc-900 group/city overflow-hidden shrink-0 mt-2 bg-zinc-900 rounded-sm">
           <img 
             src={bgImage} 
             alt={displayLocation}
             className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover/city:scale-105 transition-transform duration-1000 ease-in-out"
             loading="lazy"
             onError={(e) => {
               e.currentTarget.src = CITY_GALLERIES['default'][index % CITY_GALLERIES['default'].length];
             }}
           />
           <div className={`absolute inset-0 z-10 ${overlay}`} />
           <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent z-10" />
           
           <div className={`${gelasio.className} absolute bottom-3 right-3 z-20 flex items-center gap-2 opacity-100 backdrop-blur-sm bg-black/30 px-3 py-1.5 border border-zinc-800/50 max-w-[80%]`}>
              {icon}
              <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-100 font-medium drop-shadow-md truncate">
                {displayLocation}
              </span>
           </div>
        </div>

       <div className="relative pl-4 border-l-2 border-[#9A1B22]/50 h-auto min-h-[60px] mt-4 flex-1">
          <p className="text-xs text-zinc-400 font-light leading-loose italic line-clamp-4">
            &ldquo;{outfit.reasoning}&rdquo;
          </p>
        </div>

        {/* ========================================== */}
        {/* FIND MISSING BITS BUTTON (LUXURY ROLLOVER) */}
        {/* ========================================== */}
        <div className="mt-6 flex justify-center pb-2">
          <Link href={`/stylist?event=${encodeURIComponent(outfit.eventName || displayLocation || "Upcoming Event")}&weather=${encodeURIComponent(outfit.weather || "")}`}>
            <button className="group relative flex h-12 w-[220px] items-center justify-center overflow-hidden border border-zinc-800 bg-transparent transition-all duration-500 hover:border-zinc-600 hover:bg-black">
              
              {/* Default State: Sleek, minimal uppercase text */}
              <span className="absolute text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-all duration-500 group-hover:-translate-y-6 group-hover:opacity-0">
                Find Missing Bits
              </span>
              
              {/* Hover State: White cursive text that slides in */}
              <span className={`absolute text-2xl text-white opacity-0 transition-all duration-500 translate-y-6 group-hover:translate-y-0 group-hover:opacity-100 ${greatVibes.className}`}>
                Find Missing Bits
              </span>
              
            </button>
          </Link>
        </div>

      </CardContent>
    </Card>
  );
}
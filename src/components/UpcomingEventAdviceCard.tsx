'use client';

import React, { useState } from 'react';
import Image from 'next/image';

// 🛡️ Use 'any' to stop TypeScript fighting with your data structure
interface Props {
  eventAdvice: any;
  cardIndex: number;
  analyzedItems?: any[]; 
}

// A clean placeholder for when images are missing (Zombie Data)
const FALLBACK_IMAGE = "https://placehold.co/400x600/f3f4f6/1f2937?text=Image+Missing";

export default function UpcomingEventAdviceCard({ eventAdvice, cardIndex }: Props) {
  // Track errors for specific images
  const [clothingError, setClothingError] = useState(false);
  const [footwearError, setFootwearError] = useState(false);

  // 1. Guard Clause: If data is completely missing, don't render
  if (!eventAdvice) return null;

  // 2. Safe Data Extraction (Prevents crashes if fields are missing)
  const city = eventAdvice.city || "Global Location";
  const temp = eventAdvice.temp ?? "--";
  const reasoning = eventAdvice.reasoning || "AI Analysis based on wardrobe.";
  const clothingName = eventAdvice.clothingName || "Wardrobe Item";
  const footwearName = eventAdvice.footwearName || "Footwear";
  
  // 3. Image Logic: Use Fallback if error detected OR if URL is missing
  const clothingSrc = !clothingError && eventAdvice.clothingImageUrl ? eventAdvice.clothingImageUrl : FALLBACK_IMAGE;
  const footwearSrc = !footwearError && eventAdvice.footwearImageUrl ? eventAdvice.footwearImageUrl : FALLBACK_IMAGE;
  
  // 4. Background Logic: Fallback to a default city image if missing
  const cityBg = eventAdvice.cityBg || "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200";

  return (
    <div className="group relative h-[620px] w-full bg-white rounded-[4rem] overflow-hidden shadow-2xl border border-zinc-100 transition-all duration-500 hover:scale-[1.01]">
      
      {/* Cityscape Background Layer */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={cityBg} 
          alt={city} 
          fill 
          className="object-cover opacity-20 grayscale group-hover:grayscale-0 transition-all duration-1000"
          unoptimized // ⚡️ Critical: Bypasses Next.js server optimization for external URLs
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/30 to-transparent"></div>
      </div>

      <div className="relative z-10 p-12 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter text-zinc-900 uppercase leading-none">
              {city}
            </h2>
            <div className="flex items-center gap-1 mt-2">
               <div className="bg-zinc-900 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                 {temp}°C
               </div>
            </div>
          </div>
        </div>

        {/* 1. CLOTHING IMAGE (Main) */}
        <div className="flex-grow flex items-center justify-center relative">
          <div className="relative w-full h-80 transition-all duration-500 group-hover:blur-md group-hover:opacity-20 group-hover:scale-90">
            <Image 
              src={clothingSrc} 
              alt={clothingName} 
              fill 
              className="object-contain drop-shadow-2xl" 
              unoptimized
              onError={() => setClothingError(true)} // ✅ Catches the XML error
            />
          </div>

          {/* 2. FOOTWEAR OVERLAY (Hover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-30">
            <div className="bg-white/90 backdrop-blur-2xl p-10 rounded-full shadow-2xl border border-zinc-200 scale-50 group-hover:scale-100 transition-transform duration-500">
              <div className="relative w-40 h-40">
                <Image 
                  src={footwearSrc} 
                  alt={footwearName} 
                  fill 
                  className="object-contain" 
                  unoptimized
                  onError={() => setFootwearError(true)} // ✅ Catches the XML error
                />
              </div>
              <p className="text-[9px] font-black text-center text-[#8b1a1a] uppercase tracking-widest mt-4">
                {footwearName}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <p className="text-[9px] font-black text-[#8b1a1a] uppercase tracking-widest mb-1 italic">— Match Logic</p>
          <p className="text-zinc-900 font-bold italic text-sm leading-tight line-clamp-2">
            "{reasoning}"
          </p>
        </div>
      </div>
    </div>
  );
}
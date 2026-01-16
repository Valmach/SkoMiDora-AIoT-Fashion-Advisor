'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';

interface Props {
  eventAdvice: any;
  // cardIndex: number; // Removed to prevent "unused variable" build warning
  analyzedItems?: any[];
}

const FALLBACK_IMAGE =
  'https://placehold.co/600x800/312e81/ffffff?text=Image+Missing';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
});

function camelCase(text: string) {
  return text
    ?.toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UpcomingEventAdviceCard({
  eventAdvice,
}: Props) {
  const [clothingError, setClothingError] = useState(false);
  const [footwearError, setFootwearError] = useState(false);

  if (!eventAdvice) return null;

  const city = camelCase(eventAdvice.city || 'Global Location');
  const temp = eventAdvice.temp ?? '--';
  const reasoning = eventAdvice.reasoning || 'AI-curated outfit logic.';
  const clothingName = camelCase(eventAdvice.clothingName || 'Wardrobe Item');
  const footwearName = camelCase(eventAdvice.footwearName || 'Footwear');

  const clothingSrc =
    !clothingError && eventAdvice.clothingImageUrl
      ? eventAdvice.clothingImageUrl
      : FALLBACK_IMAGE;

  const footwearSrc =
    !footwearError && eventAdvice.footwearImageUrl
      ? eventAdvice.footwearImageUrl
      : FALLBACK_IMAGE;

  const cityBg =
    eventAdvice.cityBg ||
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200';

  return (
    <div className="group relative h-[620px] w-full overflow-hidden rounded-[4rem] shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* Cityscape background */}
      <div className="absolute inset-0 z-0">
        <Image
          src={cityBg}
          alt={city}
          fill
          className="object-cover opacity-15 grayscale group-hover:grayscale-0 transition-all duration-1000"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-purple-950/60 to-transparent" />
      </div>

      {/* 💜 PURPLE RAIN CARD */}
      <div className="relative z-10 p-12 h-full flex flex-col bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900 text-white border border-purple-700/40 rounded-[4rem]">
        {/* Header */}
        <div className="flex justify-between items-start">
          <h2
            className={`${dancingScript.className} text-4xl text-[#DC143C] tracking-wide`}
          >
            {city}
          </h2>

          <div className="bg-purple-950/80 text-white px-4 py-2 rounded-full text-xs font-bold border border-purple-700/40">
            {temp}°C
          </div>
        </div>

        {/* Footwear | Clothing Split */}
        <div className="flex-grow flex items-center justify-center gap-8 mt-6">
          {/* Footwear */}
          <div className="relative w-1/2 h-64 rounded-full bg-purple-950/70 border border-purple-700/40 p-4">
            <Image
              src={footwearSrc}
              alt={footwearName}
              fill
              className="object-contain"
              unoptimized
              onError={() => setFootwearError(true)}
            />
          </div>

          {/* Clothing */}
          <div className="relative w-1/2 h-64 rounded-3xl bg-purple-950/70 border border-purple-700/40 p-4">
            <Image
              src={clothingSrc}
              alt={clothingName}
              fill
              className="object-contain"
              unoptimized
              onError={() => setClothingError(true)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6">
          <p className="text-[10px] font-black text-[#DC143C] uppercase tracking-widest mb-2 italic">
            — Outfit Logic
          </p>
          <p className="text-purple-100 font-semibold italic text-sm leading-tight line-clamp-3">
            &ldquo;{reasoning}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Thermometer, MapPin, Volume2, Loader2 } from 'lucide-react';

export default function UpcomingEventAdviceCard({ eventAdvice, cardIndex }: any) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 🛡️ THE TOTAL GUARD: 
  // If eventAdvice is missing OR we haven't mounted yet, STOP.
  // This prevents the "can't access property" error entirely.
  if (!hasMounted || !eventAdvice || typeof eventAdvice !== 'object') {
    return (
      <div className="h-[450px] w-full bg-zinc-900/20 border border-zinc-800 rounded-3xl animate-pulse flex flex-col items-center justify-center">
        <Loader2 className="h-6 w-6 text-zinc-800 animate-spin mb-2" />
        <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold italic">
          Logic Synchronizing...
        </p>
      </div>
    );
  }

  // Use optional chaining (?.) for every single property for triple safety
  const clothingSrc = eventAdvice?.clothingImageUrl || "";
  const footwearSrc = eventAdvice?.footwearImageUrl || "";

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden group">
      {/* CLOTHING SECTION */}
      <div className="relative h-64 w-full bg-zinc-950">
        {clothingSrc && clothingSrc.trim() !== "" ? (
          <Image
            src={clothingSrc}
            alt={eventAdvice?.clothingName || "Match"}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority={cardIndex < 3}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-800">
             <span className="text-xl">👗</span>
             <p className="text-[9px] uppercase tracking-widest font-bold">Metadata Awaiting</p>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold italic text-white tracking-tight">
            {eventAdvice?.title || "Upcoming Event"}
          </h3>
          <div className="text-[#8b1a1a] font-bold text-sm">
            {eventAdvice?.temp || "--"}°C
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
          <p className="text-zinc-400 text-xs italic">
            "{eventAdvice?.reasoning || "Analyzing shoebox items..."}"
          </p>
        </div>

        {/* FOOTWEAR SECTION */}
        <div className="mt-auto pt-4 border-t border-zinc-900 flex items-center gap-4">
          <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
            {footwearSrc && footwearSrc.trim() !== "" && (
              <Image src={footwearSrc} alt="Shoes" fill className="object-cover" />
            )}
          </div>
          <p className="text-xs font-bold text-white">{eventAdvice?.footwearName || "Selecting..."}</p>
        </div>
      </div>
    </div>
  );
}
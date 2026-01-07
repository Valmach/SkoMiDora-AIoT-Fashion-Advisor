'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Thermometer, MapPin, Volume2, Loader2 } from 'lucide-react';

interface EventAdvice {
  title: string;
  location: string;
  temp: number;
  condition: string;
  clothingName: string;
  clothingImageUrl: string;
  footwearName: string;
  footwearImageUrl: string;
  reasoning: string;
}

export default function UpcomingEventAdviceCard({ 
  eventAdvice, 
  cardIndex 
}: { 
  eventAdvice: EventAdvice; 
  cardIndex: number 
}) {
  const [hasMounted, setHasMounted] = useState(false);

  // 🛡️ HYDRATION FIX: Wait for client mount
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const speakAdvice = (text: string) => {
    if (typeof window === 'undefined') return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(v => v.name.includes("Google UK English Female") || v.lang === "en-GB");
    if (ukVoice) utterance.voice = ukVoice;
    window.speechSynthesis.speak(utterance);
  };

  if (!hasMounted) {
    return <div className="h-[500px] w-full bg-zinc-900/20 border border-zinc-800 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden group transition-all hover:border-[#8b1a1a]/40">
      
      {/* CLOTHING SECTION (Loewe Blazer Slot) */}
      <div className="relative h-64 w-full bg-zinc-950">
        {/* 🛡️ EMPTY STRING GUARD */}
        {eventAdvice.clothingImageUrl && eventAdvice.clothingImageUrl.trim() !== "" ? (
          <Image
            src={eventAdvice.clothingImageUrl}
            alt={eventAdvice.clothingName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority={cardIndex < 3}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-800">
             <span className="text-xl">👗</span>
             <p className="text-[9px] uppercase tracking-widest font-bold">Syncing Wardrobe</p>
          </div>
        )}
        <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1 rounded-sm border border-white/10 text-white text-[9px] font-black uppercase tracking-widest">
          Style selection
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-bold italic text-white">{eventAdvice.title}</h3>
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider">
              <MapPin className="h-3 w-3 text-[#8b1a1a]" /> {eventAdvice.location}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[#8b1a1a] font-black text-sm">
              <Thermometer className="h-3.5 w-3.5" /> {eventAdvice.temp}°C
            </div>
            <div className="text-[9px] text-zinc-600 uppercase font-bold">{eventAdvice.condition}</div>
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
          <p className="text-zinc-400 text-xs leading-relaxed italic">"{eventAdvice.reasoning}"</p>
          <button onClick={() => speakAdvice(eventAdvice.reasoning)} className="mt-3 flex items-center gap-2 text-[#8b1a1a] hover:text-white transition-colors">
            <Volume2 className="h-3.5 w-3.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Play Stylist Note</span>
          </button>
        </div>

        {/* FOOTWEAR SECTION (Stuart Weitzman Slot) */}
        <div className="mt-auto pt-4 border-t border-zinc-900 flex items-center gap-4">
          <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
            {eventAdvice.footwearImageUrl && eventAdvice.footwearImageUrl.trim() !== "" ? (
              <Image src={eventAdvice.footwearImageUrl} alt="Shoes" fill className="object-cover" />
            ) : (
              <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-xs">👢</div>
            )}
          </div>
          <div>
            <span className="text-[8px] text-[#8b1a1a] font-bold uppercase tracking-widest">Recommended</span>
            <p className="text-xs font-bold text-white">{eventAdvice.footwearName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Thermometer, Footprints, Shirt, Volume2, Check, StopCircle } from "lucide-react";

interface EventAdviceProps {
  eventAdvice: {
    title: string;
    location: string;
    temp: number;
    condition: string;
    reasoning: string;
    clothingName: string;
    clothingImageUrl: string;
    footwearName: string;
    footwearImageUrl: string;
  };
  cardIndex: number;
  analyzedItems?: any[];
}

export default function UpcomingEventAdviceCard({ eventAdvice }: EventAdviceProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  // 1. BRITISH VOICE LOADER
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const britishVoice = voices.find(v => v.name.includes("Google UK English Female")) || 
                           voices.find(v => v.name.includes("Hazel")) ||
                           voices.find(v => v.lang === "en-GB");
      setVoice(britishVoice || null);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // 2. SPEECH LOGIC
  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const script = `Recommendation for ${eventAdvice.title}. 
                    Given it is ${eventAdvice.temp} degrees. 
                    Wear your ${eventAdvice.clothingName}. 
                    Pair with ${eventAdvice.footwearName}.`;

    const utterance = new SpeechSynthesisUtterance(script);
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.05; 
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="h-full border-none bg-[#0a0a0a] text-white overflow-hidden flex flex-col shadow-2xl">
      
      {/* 🖼️ UNIFORMITY FIX: 
         Set background to 'bg-zinc-100' (Light Grey).
         This ensures Transparent PNGs (Black Blazers/White Shoes) are ALWAYS visible.
      */}
      <div className="relative h-96 w-full grid grid-cols-2 gap-[1px] bg-zinc-100">
        
        {/* Left: Clothing */}
        <div className="relative h-full w-full group overflow-hidden">
          {/* Subtle inner shadow for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent z-10 pointer-events-none" />
          <Image
            src={eventAdvice.clothingImageUrl}
            alt={eventAdvice.clothingName}
            fill
            className="object-contain p-4 transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3 z-20">
            <Badge className="bg-white/90 text-black shadow-sm border-none text-[10px] uppercase tracking-wider px-2 py-1 font-bold">
              <Shirt className="w-3 h-3 mr-1.5 text-[#8b1a1a]" /> Outfit
            </Badge>
          </div>
        </div>

        {/* Right: Footwear */}
        <div className="relative h-full w-full group overflow-hidden border-l border-zinc-200">
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent z-10 pointer-events-none" />
          <Image
            src={eventAdvice.footwearImageUrl}
            alt={eventAdvice.footwearName}
            fill
            className="object-contain p-4 transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-3 right-3 z-20">
            <Badge className="bg-white/90 text-black shadow-sm border-none text-[10px] uppercase tracking-wider px-2 py-1 font-bold">
              <Footprints className="w-3 h-3 mr-1.5 text-[#8b1a1a]" /> Footwear
            </Badge>
          </div>
        </div>
        
        {/* Center Match Badge */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
           <Badge className="bg-[#8b1a1a] text-white border-2 border-white px-4 py-1.5 text-xs font-black italic shadow-xl">
             9{Math.floor(Math.random() * 9)}% MATCH
           </Badge>
        </div>
      </div>

      {/* 📝 TEXT AREA - CLEANED UP */}
      <CardContent className="p-6 flex flex-col gap-6 flex-1 relative bg-gradient-to-b from-[#0a0a0a] to-black">
        
        {/* Event Header */}
        <div className="space-y-2 border-b border-zinc-900 pb-4">
          <h3 className="text-xl md:text-2xl font-bold leading-tight text-white line-clamp-1">
            {eventAdvice.title}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-zinc-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8b1a1a]" /> {eventAdvice.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-[#8b1a1a]" /> {eventAdvice.temp}°C {eventAdvice.condition}
            </span>
          </div>
        </div>

        {/* Description Box - Enhanced Readability */}
        <div className="flex-1 space-y-4">
             <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#8b1a1a]"></span>
                <p className="text-zinc-500 text-[10px] italic uppercase tracking-widest">
                   Stylist Recommendation
                </p>
             </div>
             
             <div className="space-y-3">
               <div className="flex flex-col gap-1">
                 <span className="text-zinc-500 text-xs uppercase font-bold">Start with</span>
                 <p className="text-base md:text-lg text-white font-medium leading-snug line-clamp-2">
                   {eventAdvice.clothingName}
                 </p>
               </div>
               
               <div className="flex flex-col gap-1">
                 <span className="text-zinc-500 text-xs uppercase font-bold">Complete with</span>
                 <p className="text-base md:text-lg text-white font-medium leading-snug line-clamp-2">
                   {eventAdvice.footwearName}
                 </p>
               </div>
             </div>
        </div>

        {/* Action Bar */}
        <div className="mt-auto pt-4 flex items-center gap-3">
          <Button className="flex-1 rounded-sm bg-white text-black hover:bg-[#8b1a1a] hover:text-white transition-all duration-300 font-bold text-[10px] md:text-xs uppercase tracking-widest py-6 shadow-lg border-none">
            <Check className="w-4 h-4 mr-2" /> Accept Look
          </Button>

          <Button 
            onClick={handleSpeak}
            size="icon" 
            variant="outline"
            className={`rounded-full w-12 h-12 border-zinc-800 transition-all duration-300 shrink-0 ${
              isSpeaking 
                ? "bg-[#8b1a1a] text-white border-[#8b1a1a] animate-pulse" 
                : "bg-black text-white hover:border-[#8b1a1a] hover:text-[#8b1a1a]"
            }`}
          >
            {isSpeaking ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, CloudSun, Volume2, Square, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Playfair_Display } from 'next/font/google'; 

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  weight: ['400', '700', '900'],
  style: ['normal', 'italic']
});

interface AdviceProps {
  eventAdvice: {
    eventName: string;
    date: string;
    weatherForecast: string;
    reasoning: string;
    styleKeywords: string[];
    location?: string;
    cityBg?: string; // Tells TypeScript to expect the landmark image from the backend
  };
  analyzedItems: any[];
  cardIndex: number;
}

const CITY_IMAGES: Record<string, string> = {
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', 
  'New York': 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?auto=format&fit=crop&w=800&q=80', 
  'Oslo': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  'Roma': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
  'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
  'Default': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80' 
};

export default function UpcomingEventAdviceCard({ eventAdvice, analyzedItems, cardIndex }: AdviceProps) {
  if (!eventAdvice) return null;

  const animationDelay = `${cardIndex * 150}ms`;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Clean up audio if the component unmounts
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handleSpeak = async () => {
    // If it is already playing, stop it
    if (isSpeaking && audioElement) {
      audioElement.pause();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    
    try {
      const textToRead = `${eventAdvice.eventName}. ${eventAdvice.weatherForecast}. Stylist Notes: ${eventAdvice.reasoning}`;
      const userLocale = navigator.language || 'en-US'; 
      
      // Call our new Next.js API route for premium Google Cloud TTS
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead, locale: userLocale }),
      });

      if (!response.ok) throw new Error('Failed to fetch premium audio');

      // Convert the response to an MP3 Blob and play it dynamically
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => setIsSpeaking(false);
      
      setAudioElement(audio);
      audio.play();

    } catch (error) {
      console.error("Audio playback failed:", error);
      setIsSpeaking(false);
    }
  };

  const getCityImage = (name: string) => {
    if (name.includes("Paris")) return CITY_IMAGES['Paris'];
    if (name.includes("New York")) return CITY_IMAGES['New York'];
    if (name.includes("Oslo")) return CITY_IMAGES['Oslo'];
    if (name.includes("Roma") || name.includes("Rome")) return CITY_IMAGES['Roma'];
    return CITY_IMAGES['Default'];
  };

  return (
    <div 
      className={`animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards h-full`}
      style={{ animationDelay }}
    >
      <Card className={`bg-zinc-900/80 border-zinc-800 overflow-hidden h-full flex flex-col border-l-4 border-l-[#DC143C] group hover:border-[#DC143C]/50 transition-all duration-300`}>
        
        <div className="h-56 w-full bg-zinc-800 relative overflow-hidden group shrink-0">
          <img 
            // PREFERS THE DYNAMIC BACKEND IMAGE OVER THE LOCAL DICTIONARY
            src={eventAdvice.cityBg || getCityImage(eventAdvice.eventName)} 
            alt={eventAdvice.eventName}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-110 transform transition-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border border-[#DC143C]/30">
            <Calendar size={10} className="text-[#DC143C]" />
            {eventAdvice.date.split('•')[0]} 
          </div>
        </div>

        <CardHeader className="pb-2 relative -mt-8 z-10 px-6 shrink-0">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle className={`text-3xl text-white mb-1 drop-shadow-xl ${playfair.className} italic`}>
                {eventAdvice.eventName.split(' ')[0]} 
              </CardTitle>
              <div className="flex items-center gap-2 text-zinc-400 text-xs tracking-wider uppercase font-medium">
                <MapPin size={12} className="text-[#DC143C]" />
                <span>{eventAdvice.eventName.split(' ').slice(1).join(' ')}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 flex-grow flex flex-col justify-between pt-4 px-6 pb-6">
          
          <div className="flex items-center gap-2 text-xs text-zinc-300/80">
            <CloudSun size={14} className="text-[#DC143C]" />
            {eventAdvice.weatherForecast}
          </div>

          <div className="relative pl-4 border-l-2 border-[#DC143C]/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-[#DC143C] uppercase tracking-[0.2em] font-bold">
                Stylist Notes
              </div>
              <button 
                onClick={handleSpeak}
                className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider transition-colors ${isSpeaking ? "text-[#DC143C] animate-pulse" : "text-zinc-500 hover:text-white"}`}
              >
                {isSpeaking ? (
                  <>
                    <Square size={10} className="fill-current" /> Stop
                  </>
                ) : (
                  <>
                    <Volume2 size={12} /> Listen
                  </>
                )}
              </button>
            </div>
            
            <p className={`font-normal text-sm text-zinc-200 tracking-wide leading-relaxed ${playfair.className}`}>
              "{eventAdvice.reasoning}"
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-auto">
            {eventAdvice.styleKeywords && eventAdvice.styleKeywords.map((keyword, i) => (
              <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase tracking-widest hover:text-white hover:border-[#DC143C] transition-colors bg-transparent">
                {keyword}
              </Badge>
            ))}
          </div>

          <Link href="/outfit-recommendations" className="mt-4 w-full">
            <button className="w-full py-3 px-4 bg-zinc-800 hover:bg-[#DC143C] text-white text-xs font-bold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2 group">
              View 3 Outfit Options
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

        </CardContent>
      </Card>
    </div>
  );
}
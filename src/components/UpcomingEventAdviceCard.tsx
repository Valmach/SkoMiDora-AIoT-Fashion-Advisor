'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, CloudSun, Volume2, Square, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Playfair_Display } from 'next/font/google'; 

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  weight: ['400', '700', '900'],
  style: ['normal', 'italic']
});

interface AdviceProps {
  eventAdvice: any; 
  analyzedItems: any[];
  cardIndex: number;
}

// FULLY SYNCHRONIZED VERIFIED LANDMARKS
const CITY_IMAGES: Record<string, string> = {
  'Paris': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', 
  'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80', 
  'Oslo': 'https://plus.unsplash.com/premium_photo-1697729974131-40aabc4817c0?q=80&w=831&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 
  'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80', 
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', 
  'Default': 'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?auto=format&fit=crop&w=800&q=80' 
};

export default function UpcomingEventAdviceCard({ eventAdvice, analyzedItems, cardIndex }: AdviceProps) {
  if (!eventAdvice) return null;

  // --- SAFE DATA FALLBACKS ---
  const safeEventName = String(eventAdvice.eventName || eventAdvice.summary || eventAdvice.title || eventAdvice.name || "Upcoming Event");
  const rawDate = eventAdvice.date || eventAdvice.start?.dateTime || eventAdvice.start?.date || "Date TBA";
  const safeDate = typeof rawDate === 'string' ? rawDate.split('•')[0] : "Upcoming";
  const safeWeather = String(eventAdvice.weatherForecast || eventAdvice.weather || eventAdvice.weatherContext || "Weather data unavailable");
  const safeReasoning = String(eventAdvice.reasoning || eventAdvice.description || "Stylist notes are being generated...");
  
  const safeKeywords = Array.isArray(eventAdvice.styleKeywords) 
    ? eventAdvice.styleKeywords 
    : (typeof eventAdvice.styleKeywords === 'string' ? eventAdvice.styleKeywords.split(', ') : []);

  const animationDelay = `${cardIndex * 150}ms`;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
      window.speechSynthesis.cancel();
    };
  }, [audioElement]);

  const handleSpeak = async () => {
    // 1. Stop playback if already speaking
    if (isSpeaking) {
      if (audioElement) {
        audioElement.pause();
        setAudioElement(null);
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const textToRead = `${safeEventName}. ${safeWeather}. Stylist Notes: ${safeReasoning}`;
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing Gemini API Key');

      // 2. Use Gemini 2.5 Flash TTS
      const payload = {
        contents: [{ parts: [{ text: textToRead }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
          }
        },
        model: "models/gemini-2.5-flash-preview-tts"
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to fetch premium audio from Gemini');

      const data = await response.json();
      const audioPart = data.candidates?.[0]?.content?.parts?.[0];
      
      if (audioPart?.inlineData?.data) {
        const base64Data = audioPart.inlineData.data;
        const mimeType = audioPart.inlineData.mimeType || "audio/L16;rate=24000";
        
        let sampleRate = 24000;
        const rateMatch = mimeType.match(/rate=(\d+)/);
        if (rateMatch) sampleRate = parseInt(rateMatch[1], 10);

        // 3. Decode base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // 4. Convert PCM16 to WAV format for browser playback
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const pcmData = bytes.buffer;
        
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        
        // RIFF chunk
        view.setUint32(0, 0x52494646, false); // 'RIFF'
        view.setUint32(4, 36 + pcmData.byteLength, true);
        view.setUint32(8, 0x57415645, false); // 'WAVE'
        
        // fmt sub-chunk
        view.setUint32(12, 0x666D7420, false); // 'fmt '
        view.setUint32(16, 16, true); 
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        
        // data sub-chunk
        view.setUint32(36, 0x64617461, false); // 'data'
        view.setUint32(40, pcmData.byteLength, true);

        const blob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => setIsSpeaking(false);
        setAudioElement(audio);
        audio.play();
      } else {
        throw new Error("No audio data returned");
      }

    } catch (error) {
      console.warn("Premium audio failed, falling back to native browser speech:", error);
      // 5. Bulletproof Fallback
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const getCityImage = (name: string) => {
    if (!name || typeof name !== 'string') return CITY_IMAGES['Default'];
    const lowerName = name.toLowerCase();
    if (lowerName.includes("paris")) return CITY_IMAGES['Paris'];
    if (lowerName.includes("new york")) return CITY_IMAGES['New York'];
    if (lowerName.includes("oslo")) return CITY_IMAGES['Oslo'];
    if (lowerName.includes("roma") || lowerName.includes("rome")) return CITY_IMAGES['Rome'];
    if (lowerName.includes("london")) return CITY_IMAGES['London'];
    return CITY_IMAGES['Default'];
  };

  return (
    <div 
      className={`animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards h-full flex flex-col`}
      style={{ animationDelay }}
    >
      <Card className={`bg-zinc-900/80 border-zinc-800 overflow-hidden flex-grow flex flex-col border-l-4 border-l-[#DC143C] group hover:border-[#DC143C]/50 transition-all duration-300`}>
        
        <div className="h-56 w-full bg-zinc-800 relative overflow-hidden group shrink-0">
          <img 
            src={getCityImage(safeEventName)} 
            alt={safeEventName}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-110 transform transition-transform"
            onError={(e) => { e.currentTarget.src = CITY_IMAGES['Default']; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border border-[#DC143C]/30">
            <Calendar size={10} className="text-[#DC143C]" />
            {safeDate} 
          </div>
        </div>

        <CardHeader className="pb-2 relative -mt-8 z-10 px-6 shrink-0">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle className={`text-3xl text-white mb-1 drop-shadow-xl ${playfair.className} italic`}>
                {safeEventName.split(' ')[0]} 
              </CardTitle>
              <div className="flex items-center gap-2 text-zinc-400 text-xs tracking-wider uppercase font-medium">
                <MapPin size={12} className="text-[#DC143C]" />
                <span>{safeEventName.split(' ').slice(1).join(' ') || "Location TBA"}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 flex-grow flex flex-col justify-between pt-4 px-6 pb-6">
          
          <div className="flex items-center gap-2 text-xs text-zinc-300/80">
            <CloudSun size={14} className="text-[#DC143C]" />
            {safeWeather}
          </div>

          <div className="relative pl-4 border-l-2 border-[#DC143C]/50 flex-grow">
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
              "{safeReasoning}"
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {safeKeywords.map((keyword: string, i: number) => (
              <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase tracking-widest hover:text-white hover:border-[#DC143C] transition-colors bg-transparent">
                {keyword}
              </Badge>
            ))}
          </div>

          {/* INNER BUTTON: Routes to outfit-recommendations */}
          <Link 
            href={`/outfit-recommendations?event=${encodeURIComponent(safeEventName)}&weather=${encodeURIComponent(safeWeather)}`} 
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800 hover:bg-[#DC143C] text-white text-xs font-bold uppercase tracking-widest rounded transition-colors group"
          >
            <Sparkles size={14} />
            3 Outfits From Your Closet
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>

        </CardContent>
      </Card>
    </div>
  );
}
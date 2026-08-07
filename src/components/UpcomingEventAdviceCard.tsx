'use client';

function getPreferredBritishFemaleVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();

  const preferredVoiceNames = [
    "Google UK English Female",
    "Microsoft Sonia Online",
    "Microsoft Sonia",
    "Serena",
    "Kate",
    "Susan",
    "Hazel",
    "Emma",
  ];

  return (
    voices.find((voice) =>
      preferredVoiceNames.some((name) =>
        voice.name.toLowerCase().includes(name.toLowerCase())
      )
    ) ||
    voices.find((voice) =>
      voice.lang?.toLowerCase() === "en-gb" &&
      /female|sonia|serena|kate|susan|hazel|emma/i.test(voice.name)
    ) ||
    voices.find((voice) => voice.lang?.toLowerCase() === "en-gb") ||
    null
  );
}



import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, CloudSun, Volume2, Square, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Playfair_Display } from 'next/font/google'; 
import { useToast } from "@/hooks/use-toast"; // Lisätty virheilmoituksia varten

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
  const { toast } = useToast();

  // NOTE: all hooks are declared here, unconditionally, BEFORE the
  // `if (!eventAdvice) return null;` early return below. Hooks must run in
  // the same order on every render — declaring them after an early return
  // breaks that guarantee the moment eventAdvice is ever null on some
  // renders and truthy on others for the same component instance.
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs, not state: state updates are async and batched, so a rapid second
  // click could read stale `isSpeaking`/`audioElement` values and start a
  // SECOND independent audio stream on top of the first one still playing.
  // Refs are updated synchronously, so the guard below is race-safe.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isBusyRef = useRef(false); // true from the moment of click until playback actually starts (or fails)
  const playTokenRef = useRef(0); // invalidates a stale in-flight fetch if the user stops/re-clicks before it resolves

  const stopPlayback = () => {
    playTokenRef.current += 1; // any in-flight fetch/response for a prior click is now stale and will be ignored
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isBusyRef.current = false;
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSpeak = async () => {
    // Covers BOTH cases: already playing (isSpeaking true), and mid-fetch

    // before playback has started (isBusyRef true but isSpeaking still
    // false). The second case is exactly the gap that let a second click
    // sneak a parallel audio stream through before.
    if (isSpeaking || isBusyRef.current) {
      stopPlayback();
      return;
    }

    isBusyRef.current = true;
    const myToken = ++playTokenRef.current;

    const rawText = `${safeEventName}. ${safeWeather}. Stylist Notes: ${safeReasoning}`;

    const cleanTextToRead = rawText
      .replace(/[*#_`~\[\]]/g, "")
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 900);

    if (!cleanTextToRead) {
      isBusyRef.current = false;
      toast({
        title: "Nothing to read",
        description: "No event advice text was available.",
        variant: "destructive",
      });
      return;
    }

    // Trying Google UK female TTS first for a less synthetic voice.
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanTextToRead,
          locale: "en-GB",
        }),
      });

      // The user stopped, or clicked again, while this fetch was in flight.
      // Discard this response instead of starting a stream nobody asked for anymore.
      if (myToken !== playTokenRef.current) {
        return;
      }

      if (response.ok) {
        const audioBlob = await response.blob();

        if (myToken !== playTokenRef.current) {
          return; // stopped/superseded while the blob was downloading
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audioRef.current = audio;
        isBusyRef.current = false;
        setIsSpeaking(true);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          setIsSpeaking(false);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          setIsSpeaking(false);
          console.warn("Google TTS audio playback failed. Falling back to browser speech.");
        };

        await audio.play();
        return;
      }

      console.warn("Google TTS route failed. Falling back to browser speech:", await response.text());
    } catch (error) {
      console.warn("Google TTS unavailable. Falling back to browser speech:", error);
    }

    if (myToken !== playTokenRef.current) {
      isBusyRef.current = false;
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      isBusyRef.current = false;
      toast({
        title: "Audio unavailable",
        description: "This browser does not support built-in speech playback.",
        variant: "destructive",
      });
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanTextToRead);
    utterance.lang = "en-GB";
    utterance.rate = 1.08;
    utterance.pitch = 1.0;

    const preferredVoice = getPreferredBritishFemaleVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.volume = 1;

    utterance.onend = () => {
      isBusyRef.current = false;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      isBusyRef.current = false;
      setIsSpeaking(false);
      toast({
        title: "Playback error",
        description: "The browser speech engine could not play this note.",
        variant: "destructive",
      });
    };

    isBusyRef.current = false;
    setIsSpeaking(true);

    let started = false;

    const speakNow = () => {
      if (started) return;
      if (myToken !== playTokenRef.current) return; // superseded before the browser voice list was ready
      started = true;

      const preferredVoice = getPreferredBritishFemaleVoice();

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log("SkoMiDora selected UK voice:", {
          name: preferredVoice.name,
          lang: preferredVoice.lang,
          localService: preferredVoice.localService,
        });
      } else {
        console.warn("SkoMiDora: no UK female browser voice found. Using browser en-GB fallback.");
      }

      synth.speak(utterance);
    };

    if (synth.getVoices().length > 0) {
      speakNow();
    } else {
      synth.onvoiceschanged = speakNow;
      setTimeout(speakNow, 250);
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
'use client';

/**
 * FILE: src/components/UpcomingEventAdviceCard.tsx
 * FIX: Explicitly defined Props to resolve ts(2322) 
 * FEATURE: Global City Hero with Footwear Rollover & British TTS
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Check, Footprints, Sparkles, Trophy, Volume2, Loader2 } from 'lucide-react';

interface UpcomingEventAdviceCardProps {
  eventAdvice: any;
  cardIndex: number;
  analyzedItems: any[];
}

export default function UpcomingEventAdviceCard({ 
  eventAdvice, 
  cardIndex, 
  analyzedItems 
}: UpcomingEventAdviceCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const matchScore = eventAdvice?.suitabilityScore ?? 90;
  const isHighMatch = matchScore >= 95;

  /**
   * TTS Logic: British Female Voice
   */
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any current speech to prevent overlapping
    window.speechSynthesis.cancel();

    const script = `
      Regarding the ${eventAdvice.eventName} in ${eventAdvice.city}. 
      Recommended for ${eventAdvice.city} conditions. 
      I suggest pairing this with your ${eventAdvice.footwearName}.
    `;

    const utterance = new SpeechSynthesisUtterance(script);
    const voices = window.speechSynthesis.getVoices();
    
    // Find British Female voice
    const britishFemale = voices.find(v => 
      (v.lang.includes('en-GB') || v.lang.includes('en_GB')) && 
      (v.name.includes('Female') || v.name.includes('Hazel') || v.name.includes('UK'))
    );

    if (britishFemale) utterance.voice = britishFemale;
    utterance.rate = 0.9; // Posh, steady pace

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Pre-trigger voice loading
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  return (
    <Card className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white transition-all">
      
      {/* HERO SECTION: Global City Image */}
      <div className="relative h-64 w-full overflow-hidden bg-zinc-200">
        <img
          src={eventAdvice.cityUrl || '/images/city-fallback.jpg'}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:blur-sm"
          alt={eventAdvice.city}
        />

        {/* 👞 ROLLOVER: Footwear Suggestion from Smart Shoebox */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-6 text-center backdrop-blur-[2px]">
          <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-3">Smart Shoebox Suggestion</p>
          <div className="h-32 w-32 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 shadow-2xl">
            <img 
              src={eventAdvice.footwearImageUrl || '/images/closet-fallback.jpg'} 
              className="h-full w-full object-contain drop-shadow-2xl" 
              alt="Footwear" 
            />
          </div>
          <p className="mt-3 text-xs font-bold text-white uppercase tracking-widest">{eventAdvice.footwearName}</p>
        </div>

        {/* Match Percentage Notification Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Badge className={`${isHighMatch ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-white'} border-none px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg`}>
            {isHighMatch ? <Trophy className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-yellow-400" />}
            <span className="font-black text-[10px] tracking-tight">{matchScore}% MATCH</span>
          </Badge>
        </div>
      </div>

      <CardHeader className="pt-6 px-8 pb-2">
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">
          <MapPin className="h-3 w-3" />
          {eventAdvice.city}
        </div>
        <CardTitle className="text-2xl font-black text-zinc-900 leading-tight italic uppercase tracking-tighter">
          {eventAdvice.eventName}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-8 pb-8 space-y-5">
        <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
          <Footprints className="h-5 w-5 text-zinc-900 shrink-0" />
          <p className="text-[11px] font-medium text-zinc-500 leading-relaxed italic">
            Recommended for {eventAdvice.city} conditions. Pair with your <span className="text-zinc-900 font-bold">{eventAdvice.footwearName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button className={`flex-1 rounded-full h-12 gap-2 shadow-lg font-bold transition-all active:scale-95 ${isHighMatch ? 'bg-amber-400 text-black hover:bg-amber-500' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
            <Check className="h-4 w-4" /> 
            <span className="text-xs uppercase tracking-tight">{isHighMatch ? 'Accept Elite Match' : 'Accept Style'}</span>
          </Button>
          
          {/* 🔊 TEXT TO SPEECH BUTTON */}
          <Button 
            variant="outline"
            size="icon"
            onClick={handleSpeak}
            disabled={isSpeaking}
            className="h-12 w-12 rounded-full border-zinc-200 hover:bg-zinc-50 hover:text-[#8b1a1a] transition-colors shadow-sm"
          >
            {isSpeaking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
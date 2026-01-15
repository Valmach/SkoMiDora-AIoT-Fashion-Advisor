'use client';

import React from 'react';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';
import { Calendar, CloudSun, MapPin } from 'lucide-react';

interface Props {
  eventAdvice: any;
  cardIndex: number;
  analyzedItems?: any[]; // Kept for compatibility, but ignored for now
}

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
});

function camelCase(text: string) {
  return text?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UpcomingEventAdviceCard({ eventAdvice }: Props) {
  if (!eventAdvice) return null;

  // 1. EXTRACT DATA (Focusing on City, Event, Weather)
  const city = camelCase(eventAdvice.city || 'Global Destination');
  const eventName = eventAdvice.eventName || 'Scheduled Event';
  const time = eventAdvice.eventStartDateTime || 'Upcoming';
  const temp = eventAdvice.temp ?? '--';
  const weather = eventAdvice.weatherCondition || 'Forecast Pending';
  
  // 2. BACKGROUND IMAGE (Cityscape)
  const cityBg = eventAdvice.cityBg || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80';

  return (
    <div className="group relative h-[600px] w-full overflow-hidden rounded-[3rem] shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-zinc-800">
      
      {/* BACKGROUND: Cityscape Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={cityBg}
          alt={city}
          fill
          className="object-cover transition-transform duration-1000 group-hover:scale-110"
          unoptimized
        />
        {/* Gradient Overlay to make text readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
      </div>

      {/* CONTENT LAYER */}
      <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
        
        {/* TOP: Weather Badge */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <CloudSun size={18} className="text-[#DC143C]" />
            <span className="text-sm font-medium">{temp}°F • {weather}</span>
          </div>
        </div>

        {/* CENTER: Empty space to let the image shine */}
        <div className="flex-grow" />

        {/* BOTTOM: Event Details */}
        <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border border-white/10 space-y-4">
          
          {/* City Name (Dancing Script) */}
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-[#DC143C]" />
            <h2 className={`${dancingScript.className} text-5xl text-white tracking-wide`}>
              {city}
            </h2>
          </div>

          <div className="h-px bg-white/20 w-full" />

          {/* Event Name & Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#DC143C] text-xs font-bold uppercase tracking-widest">
              <Calendar size={14} />
              <span>Google Calendar Event</span>
            </div>
            <h3 className="text-xl font-semibold text-white">{eventName}</h3>
            <p className="text-zinc-300 text-sm">{time}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
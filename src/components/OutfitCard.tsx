"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoogleCalendarEvent, SingleOutfitOutput } from "@/types";

interface OutfitCardProps {
  outfit: SingleOutfitOutput;
  index: number;
  eventDetails: GoogleCalendarEvent;
  /** Optional fallback image URL when the AI does not return outfitImageDataUri */
  fallbackImageUrl?: string;
}

export default function OutfitCard({
  outfit,
  index,
  eventDetails,
  fallbackImageUrl,
}: OutfitCardProps) {
  const eventDate = new Date(eventDetails.eventStartDateTime);

  /** ⛑️ SSR-Safe Condition — don't use outfit image on server */
  const isServer = typeof window === "undefined";

  /** 🖼️ Priority: AI Image → fallback → placeholder */
  const displayImageSrc = !isServer
    ? outfit.outfitImageDataUri ||
      fallbackImageUrl ||
      "https://placehold.co/400x600?text=Outfit"
    : "https://placehold.co/400x600?text=Loading…";

  /* ============================================================
     🛠️ SkoMiDora Logic Fix: Numeric Sanitization
     This ensures the Suitability Score is a pure number for 
     hardware triggering (Motorized Shelves & LED pulses).
     ============================================================ */
  const getNumericScore = (score: any): number => {
    if (typeof score === 'number') return score;
    if (typeof score === 'string') return parseFloat(score) || 0;
    // Fallback for cases where TS detects a function/ReactNode union
    return 0;
  };

  const finalScore = getNumericScore(outfit.suitabilityScore);

  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          {eventDetails.eventName}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {eventDate.toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          • {eventDetails.eventType}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 text-xs">
        <p className="leading-snug">{outfit.outfitDescription}</p>

        {outfit.chosenShoe && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Shoe focus: <span className="font-medium">{outfit.chosenShoe}</span>
          </p>
        )}

        <p className="mt-1 text-[11px] text-muted-foreground">
          Suitability score:{" "}
          <span className="font-medium">
            {/* ✅ FIXED: Math.round now receives a guaranteed number */}
            {Math.round(finalScore)}/100
          </span>
        </p>

        {/* 🖼️ SSR-Safe Image */}
        <RobustOutfitImage uri={displayImageSrc} />
      </CardContent>
    </Card>
  );
}

/* ============================================================
   🔐 SkoMiDora Patch: Robust Client-Side Image Renderer
   ============================================================ */
function RobustOutfitImage({ uri }: { uri?: string }) {
  if (!uri || uri.length < 20) {
    return (
      <div className="mt-2 w-full h-48 bg-muted rounded-md border flex items-center justify-center text-muted-foreground">
        <span>📷 Image unavailable</span>
      </div>
    );
  }

  return (
    <div className="mt-2 relative w-full aspect-[3/4] rounded-md overflow-hidden bg-muted">
      <Image
        src={uri}
        alt="Outfit image"
        fill
        className="object-cover"
        unoptimized // safest for blob:data, Firestore URLs, Gemini, etc.
      />
    </div>
  );
}
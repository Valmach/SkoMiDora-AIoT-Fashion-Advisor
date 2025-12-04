// src/components/OutfitCard.tsx
"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoogleCalendarEvent, SingleOutfitOutput } from "@/types";

interface OutfitCardProps {
  outfit: SingleOutfitOutput;
  index: number;
  eventDetails: GoogleCalendarEvent; // ✅ add this
}

export default function OutfitCard({
  outfit,
  index,
  eventDetails,
}: OutfitCardProps) {
  // avoid “unused variable” by actually using eventDetails
  const eventDate = new Date(eventDetails.eventStartDateTime);

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
        {/* Outfit description */}
        <p className="leading-snug">{outfit.outfitDescription}</p>

        {/* Optional: show shoe + score if present */}
        {outfit.chosenShoe && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Shoe focus: <span className="font-medium">{outfit.chosenShoe}</span>
          </p>
        )}

        <p className="mt-1 text-[11px] text-muted-foreground">
          Suitability score:{" "}
          <span className="font-medium">{outfit.suitabilityScore}/100</span>
        </p>

        {/* Optional image – only render if we have one */}
        {outfit.outfitImageDataUri && (
          <div className="mt-2 relative w-full aspect-[3/4] rounded-md overflow-hidden bg-muted">
            <Image
              src={outfit.outfitImageDataUri}
              alt={`Outfit for ${eventDetails.eventName}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

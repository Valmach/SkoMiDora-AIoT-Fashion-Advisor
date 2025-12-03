"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDays,
  MapPin,
  CloudSun,
  Lightbulb,
  Briefcase,
  PartyPopper,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  AlertTriangle,
  Info,
  Volume2,
  StopCircle,
} from "lucide-react";
import type { ElementType } from "react";
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SHOE_PLACEHOLDER_IMAGE = "https://placehold.co/200x200.png";

interface UpcomingEventAdviceCardProps {
  eventAdvice: UpcomingEventStyleAdvice;
  cardIndex: number;
}

// ------------------------
// Image Hints
// ------------------------
const imageHintsByEventType: Record<string, string[]> = {
  business: ["professional attire", "office chic", "corporate style"],
  meeting: ["business casual", "meeting outfit", "smart separates"],
  professional: ["power suit", "executive look", "boardroom fashion"],
  conference: ["conference wear", "business formal", "networking style"],
  client: ["client meeting", "impressive outfit", "polished look"],
  social: ["social gathering", "party dress", "evening wear"],
  chic: ["chic outfit", "trendy fashion", "stylish look"],
  art: ["gallery opening", "artistic style", "creative outfit"],
  fashion: ["fashion event", "runway look", "designer wear"],
  opening: ["event opening", "statement piece", "celebration style"],
  formal: ["formal event", "gala dress", "black tie"],
  gala: ["gala attire", "evening gown", "luxury fashion"],
  "black-tie": ["tuxedo style", "formal gown", "elegant evening"],
  charity: ["charity event", "sophisticated dress", "benefit gala"],
  party: ["party outfit", "festive wear", "celebration dress"],
  brunch: [
    "brunch style",
    "casual chic",
    "daytime fashion",
    "Paris restaurant",
  ],
  default: ["stylish event", "modern fashion", "elegant attire"],
};

const getEventImageHint = (eventType: string): string => {
  const typeLower = eventType.toLowerCase();

  if (typeLower.includes("brunch")) {
    return "Paris restaurant";
  }

  for (const keyword in imageHintsByEventType) {
    if (typeLower.includes(keyword)) {
      const hints = imageHintsByEventType[keyword];
      return hints[Math.floor(Math.random() * hints.length)];
    }
  }
  const defaultHints = imageHintsByEventType.default;
  return defaultHints[Math.floor(Math.random() * defaultHints.length)];
};

// ------------------------
// MAIN COMPONENT
// ------------------------
export default function UpcomingEventAdviceCard({
  eventAdvice,
  cardIndex,
}: UpcomingEventAdviceCardProps) {
  const safeLocation = eventAdvice.eventLocation ?? ""; // 🔥 MAIN FIX
  const safeCountry = eventAdvice.eventCountry ?? "";   // if you store country separately
  const [liveWeather, setLiveWeather] = useState<{
    temperature: number;
    condition: string;
  } | null>(null);
  const [liveWeatherError, setLiveWeatherError] = useState<string | null>(null);

  const [formattedEventTime, setFormattedEventTime] =
    useState<string | null>(null);
  const [decision, setDecision] = useState<
    "accepted" | "rejected" | "modified" | null
  >(null);

  const [tooltipShoeImageUrl, setTooltipShoeImageUrl] = useState(
    DEFAULT_SHOE_PLACEHOLDER_IMAGE
  );
  const [tooltipShoeText, setTooltipShoeText] = useState("Suggested Footwear");

  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // -------------------------------
  // 1. Tooltip Shoe Logic
  // -------------------------------
  useEffect(() => {
      (item) => item.itemType === "Shoes"
    );
    if (closetShoes.length > 0) {
      const eventNameLength = eventAdvice.eventName.length;
      const shoeIndex = (cardIndex + eventNameLength) % closetShoes.length;
      const randomShoe = closetShoes[shoeIndex];

      if (randomShoe?.imageUrl) {
        setTooltipShoeImageUrl(randomShoe.imageUrl);
        setTooltipShoeText(randomShoe.itemName);
      }
    } else {
      setTooltipShoeImageUrl(DEFAULT_SHOE_PLACEHOLDER_IMAGE);
      setTooltipShoeText("Add shoes to your closet!");
    }

  // -------------------------------
  // 2. Google Maps → Lat/Lon → Weather
  // -------------------------------
  useEffect(() => {
    const fetchWeather = async () => {
      if (!safeLocation.trim()) {
        setLiveWeather(null);
        setLiveWeatherError(null);
        return;
      }

      try {
        const res = await fetch(
          `/api/eventWeather?location=${encodeURIComponent(safeLocation)}`
        );

        if (!res.ok) {
          throw new Error(`Weather API error: ${res.status}`);
        }

        const data = await res.json();

        if (data?.temperature && data?.condition) {
          setLiveWeather({
            temperature: data.temperature,
            condition: data.condition,
          });
          setLiveWeatherError(null);
        } else {
          setLiveWeather(null);
          setLiveWeatherError("Weather unavailable");
        }
      } catch (err: any) {
        setLiveWeather(null);
        setLiveWeatherError("Weather unavailable");
      }
    };

    fetchWeather();
  }, [safeLocation]);

  // -------------------------------
  // 3. Format Event Time
  // -------------------------------
  useEffect(() => {
    if (eventAdvice.eventStartDateTime && eventAdvice.eventEndDateTime) {
      try {
        const startDate = parseISO(eventAdvice.eventStartDateTime);
        const endDate = parseISO(eventAdvice.eventEndDateTime);
        const startStr = format(startDate, "EEE, d MMM 'at' p", {
          locale: enUS,
        });
        const endStr = format(endDate, "p (zzz)", { locale: enUS });

        if (format(startDate, "yyyyMMdd") === format(endDate, "yyyyMMdd")) {
          setFormattedEventTime(`${startStr} - ${endStr}`);
        } else {
          const fullEndStr = format(
            endDate,
            "EEE, d MMM 'at' p (zzz)",
            { locale: enUS }
          );
          setFormattedEventTime(`${startStr} - ${fullEndStr}`);
        }
      } catch {
        setFormattedEventTime("Event time not available");
      }
    }
  }, [eventAdvice.eventStartDateTime, eventAdvice.eventEndDateTime]);

  // -------------------------------
  // 4. Feedback buttons
  // -------------------------------
  const handleFeedback = (userAction: "accepted" | "rejected" | "modified") => {
    setDecision(userAction);
    const messages = {
      accepted: "Glad you found the style advice helpful!",
      rejected: "Thanks for the feedback. We'll improve our suggestions.",
      modified: "Modify functionality coming soon.",
    };
    toast({
      title:
        "Advice " + userAction.charAt(0).toUpperCase() + userAction.slice(1),
      description: messages[userAction],
    });
  };

  // -------------------------------
  // 5. Text-to-Speech
  // -------------------------------
  const handleSpeak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const weatherPhrase = liveWeather
      ? `The forecast is ${liveWeather.temperature} degrees and ${liveWeather.condition}.`
      : "Weather data is currently unavailable.";

    const adviceText = eventAdvice.advice || "No advice available.";

    const utterance = new SpeechSynthesisUtterance(
      `${weatherPhrase} Based on this, here is my suggestion. ${adviceText}`
    );

    utteranceRef.current = utterance;
    utterance.rate = 1.1;

    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
      utterance.lang = preferredVoiceRef.current.lang;
    } else {
      utterance.lang = "en-GB";
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  // -------------------------------
  // Event Icon
  // -------------------------------
  let EventIcon: ElementType = CalendarDays;
  const eventTypeLower = eventAdvice.eventType.toLowerCase();
  if (eventTypeLower.includes("business") || eventTypeLower.includes("meeting"))
    EventIcon = Briefcase;
  else if (eventTypeLower.includes("social") || eventTypeLower.includes("party"))
    EventIcon = PartyPopper;
  else if (eventTypeLower.includes("fashion") || eventTypeLower.includes("art"))
    EventIcon = Sparkles;

  // -------------------------------
  // Image generation seed
  // -------------------------------
  const imageSeed = eventAdvice.eventName.replace(/\s+/g, "") + cardIndex;
  const imageSrc = `https://picsum.photos/seed/${imageSeed}/400/250`;
  const imageHint = getEventImageHint(eventAdvice.eventType);

  // -------------------------------
  // Weather badge logic
  // -------------------------------
  const isWeatherError = !!liveWeatherError;
  const weatherText = liveWeather
    ? `${liveWeather.temperature}°C, ${liveWeather.condition}`
    : liveWeatherError || "Weather unavailable";

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <Card
      className={cn(
        "flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card/80 backdrop-blur-sm h-full fade-in-up",
        {
          "ring-2 ring-green-500": decision === "accepted",
          "ring-2 ring-red-700": decision === "rejected",
          "ring-2 ring-amber-500": decision === "modified",
        }
      )}
      style={{ animationDelay: `${cardIndex * 100}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <CardTitle className="text-md font-semibold">
              {eventAdvice.eventName}
            </CardTitle>

            {formattedEventTime && (
              <CardDescription className="text-xs text-muted-foreground">
                <CalendarDays className="inline h-3 w-3 mr-1" />
                {formattedEventTime}
              </CardDescription>
            )}

            {safeLocation && (
              <CardDescription className="text-xs text-muted-foreground">
                <MapPin className="inline h-3 w-3 mr-1" />
                {safeLocation}
              </CardDescription>
            )}
          </div>

          <EventIcon className="h-5 w-5 text-accent ml-2" />
        </div>
      </CardHeader>

      {/* ---------- IMAGE ---------- */}
      <CardContent className="flex-grow flex flex-col">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="aspect-[16/10] w-full relative rounded-md mb-3 bg-secondary/50">
              <Image
                src={imageSrc}
                alt={`Style advice for ${eventAdvice.eventName}`}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                data-ai-hint={imageHint}
              />
            </div>
          </TooltipTrigger>

          {/* SHOE TOOLTIP */}
          <TooltipContent className="p-2 bg-card border shadow-lg rounded-md">
            <div className="w-32 h-32 relative bg-muted rounded overflow-hidden">
              <Image
                src={tooltipShoeImageUrl}
                alt={tooltipShoeText}
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
            <p className="text-[11px] mt-1 text-center truncate">
              {tooltipShoeText}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* WEATHER + EVENT TYPE */}
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isWeatherError
                ? "border-red-600 text-red-600 bg-red-600/10"
                : "border-accent/70 text-accent"
            )}
          >
            {isWeatherError ? (
              <AlertTriangle className="h-3 w-3 mr-1" />
            ) : (
              <CloudSun className="h-3 w-3 mr-1" />
            )}
            {weatherText}
          </Badge>

          <Badge variant="secondary" className="text-xs capitalize">
            {eventAdvice.eventType}
          </Badge>
        </div>

        {/* ADVICE TEXT */}
        <div className="text-xs text-foreground mb-2 leading-normal h-20 overflow-y-auto p-1 rounded bg-muted/30">
          <Lightbulb className="h-3.5 w-3.5 mr-2 float-left text-accent" />
          {eventAdvice.advice}
        </div>
      </CardContent>

      {/* ---------- FOOTER ---------- */}
      <CardFooter className="flex flex-col items-start space-y-2 pt-3 border-t">
        <div className="w-full space-y-2">
          <div className="flex gap-2 w-full">
            <Button
              onClick={() => handleFeedback("rejected")}
              variant={decision === "rejected" ? "default" : "outline"}
              className={cn(
                "flex-1",
                decision === "rejected"
                  ? "bg-red-700 hover:bg-red-800 text-white"
                  : "border-red-600 text-red-600 hover:bg-red-600/10"
              )}
              size="sm"
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Reject
            </Button>

            <Button
              onClick={() => handleFeedback("modified")}
              variant={decision === "modified" ? "default" : "outline"}
              className={cn(
                "flex-1",
                decision === "modified"
                  ? "bg-amber-500 hover:bg-amber-600 text-black"
                  : "border-amber-500 text-amber-500 hover:bg-amber-500/10"
              )}
              size="sm"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Modify
            </Button>
          </div>

          <Button
            onClick={() => handleFeedback("accepted")}
            variant={decision === "accepted" ? "default" : "outline"}
            className={cn(
              "w-full",
              decision === "accepted"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-green-500 text-green-500 hover:bg-green-500/10"
            )}
            size="sm"
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Accept
          </Button>
        </div>

        {/* SPEECH BUTTON */}
        <div className="w-full pt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSpeak}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                {isSpeaking ? (
                  <StopCircle className="mr-2 h-4 w-4" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )}
                {isSpeaking ? "Stop" : "Listen"}
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>{isSpeaking ? "Stop speaking" : "Listen to advice"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardFooter>
    </Card>
  );
}

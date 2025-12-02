
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
import type { UpcomingEventStyleAdvice, AnalyzedItem } from "@/types";
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SHOE_PLACEHOLDER_IMAGE = "https://placehold.co/200x200.png";

interface UpcomingEventAdviceCardProps {
  eventAdvice: UpcomingEventStyleAdvice;
  cardIndex: number;
  analyzedItems?: AnalyzedItem[];
}

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

  // Use a specific image for brunch
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

const Award = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-5 w-5", className)}
  >
    <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 17.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z"></path>
  </svg>
);

export default function UpcomingEventAdviceCard({
  eventAdvice,
  cardIndex,
  analyzedItems = [],
}: UpcomingEventAdviceCardProps) {
  const [formattedEventTime, setFormattedEventTime] = useState<string | null>(
    null,
  );
  const [decision, setDecision] = useState<
    "accepted" | "rejected" | "modified" | null
  >(null);
  const [tooltipShoeImageUrl, setTooltipShoeImageUrl] = useState<string>(
    DEFAULT_SHOE_PLACEHOLDER_IMAGE,
  );
  const [tooltipShoeText, setTooltipShoeText] =
    useState<string>("Suggested Footwear");
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const closetShoes = analyzedItems.filter(
      (item) => item.itemType === "Shoes",
    );
    if (closetShoes.length > 0) {
      const eventNameLength = eventAdvice.eventName.length;
      const shoeIndex = (cardIndex + eventNameLength) % closetShoes.length;
      const randomShoe = closetShoes[shoeIndex];

      if (randomShoe && randomShoe.imageUrl) {
        setTooltipShoeImageUrl(randomShoe.imageUrl);
        setTooltipShoeText(randomShoe.itemName);
      }
    } else {
      setTooltipShoeImageUrl(DEFAULT_SHOE_PLACEHOLDER_IMAGE);
      setTooltipShoeText("Add shoes to your closet!");
    }
  }, [analyzedItems, cardIndex, eventAdvice.eventName]);

  useEffect(() => {
    const findAndSetPreferredVoice = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        if (
          window.speechSynthesis.onvoiceschanged !==
          findAndSetPreferredVoiceWrapper
        ) {
          window.speechSynthesis.onvoiceschanged =
            findAndSetPreferredVoiceWrapper;
        }
        return;
      }

      let selectedVoice: SpeechSynthesisVoice | undefined;
      const highQualityBritishKeywords = [
        "google uk english female",
        "microsoft zira",
        "microsoft sonia",
        "microsoft libby",
        "apple fiona",
        "apple ava",
        "daniel (enhanced)",
        "kate (enhanced)",
        "serena (enhanced)",
        "wavenet",
        "neural",
        "premium",
        "professional",
        "enhanced",
      ];
      const standardBritishFemaleKeywords = [
        "uk english female",
        "english (united kingdom) female",
        "en-gb female",
      ];
      const genericEnglishKeywords = [
        "english female",
        "english uk female",
        "en-us female",
      ];

      selectedVoice = voices.find(
        (voice) =>
          voice.lang.toLowerCase().startsWith("en-gb") &&
          highQualityBritishKeywords.some((keyword) =>
            voice.name.toLowerCase().includes(keyword),
          ),
      );
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (voice) =>
            voice.lang.toLowerCase().startsWith("en-gb") &&
            standardBritishFemaleKeywords.some((keyword) =>
              voice.name.toLowerCase().includes(keyword),
            ),
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find((voice) =>
          voice.lang.toLowerCase().startsWith("en-gb"),
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (voice) =>
            voice.lang.toLowerCase().startsWith("en") &&
            genericEnglishKeywords.some((keyword) =>
              voice.name.toLowerCase().includes(keyword),
            ),
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find((voice) =>
          voice.lang.toLowerCase().startsWith("en"),
        );
      }

      if (selectedVoice) {
        preferredVoiceRef.current = selectedVoice;
      } else {
        preferredVoiceRef.current = null;
      }
      if (
        window.speechSynthesis.onvoiceschanged ===
        findAndSetPreferredVoiceWrapper
      ) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
    const findAndSetPreferredVoiceWrapper = () => findAndSetPreferredVoice();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        findAndSetPreferredVoice();
      } else {
        window.speechSynthesis.onvoiceschanged =
          findAndSetPreferredVoiceWrapper;
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        if (
          window.speechSynthesis.onvoiceschanged ===
          findAndSetPreferredVoiceWrapper
        ) {
          window.speechSynthesis.onvoiceschanged = null;
        }
        if (
          utteranceRef.current &&
          window.speechSynthesis.speaking &&
          window.speechSynthesis.onvoiceschanged !==
            findAndSetPreferredVoiceWrapper
        ) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      }
    };
  }, [cardIndex]);

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
          const fullEndStr = format(endDate, "EEE, d MMM 'at' p (zzz)", {
            locale: enUS,
          });
          setFormattedEventTime(`${startStr} - ${fullEndStr}`);
        }
      } catch {
        setFormattedEventTime("Event time not available");
      }
    }
  }, [eventAdvice.eventStartDateTime, eventAdvice.eventEndDateTime]);

  const handleFeedback = (userAction: "accepted" | "rejected" | "modified") => {
    setDecision(userAction);
    const messages = {
      accepted: "Glad you found the style advice helpful!",
      rejected: "Thanks for the feedback. We'll improve our suggestions.",
      modified: "Functionality to modify advice is under development.",
    };
    toast({
      title: `Advice ${userAction.charAt(0).toUpperCase() + userAction.slice(1)}`,
      description: messages[userAction],
    });
  };

  const handleSpeak = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const weatherText = `The forecast is ${eventAdvice.temperature} degrees Celsius and ${eventAdvice.weatherCondition}.`;
      const adviceText = eventAdvice.advice || "No advice to read.";
      const textToSpeak = `${weatherText} Based on this, here is my suggestion. ${adviceText}`;

      const newUtterance = new SpeechSynthesisUtterance(textToSpeak);
      utteranceRef.current = newUtterance;

      newUtterance.rate = 1.1;

      if (preferredVoiceRef.current) {
        newUtterance.voice = preferredVoiceRef.current;
        newUtterance.lang = preferredVoiceRef.current.lang;
      } else {
        newUtterance.lang = "en-GB";
      }

      newUtterance.onstart = () => setIsSpeaking(true);
      newUtterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      newUtterance.onerror = (event) => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        if (event.error === "interrupted" || event.error === "canceled") {
          // console.warn(`UpcomingEventAdviceCard ${cardIndex} - SPEECH_DEBUG: Speech synthesis intentionally stopped: ${event.error}`);
        } else {
          toast({
            title: "Speech Error",
            description: `Could not play audio: ${event.error}`,
            variant: "destructive",
          });
        }
      };
      window.speechSynthesis.speak(newUtterance);
    } else {
      toast({
        title: "Speech Not Supported",
        description: "Your browser does not support text-to-speech.",
        variant: "destructive",
      });
    }
  };

  let EventIcon: ElementType = CalendarDays;
  const eventTypeLower = eventAdvice.eventType.toLowerCase();
  if (eventTypeLower.includes("business") || eventTypeLower.includes("meeting"))
    EventIcon = Briefcase;
  else if (
    eventTypeLower.includes("social") ||
    eventTypeLower.includes("party")
  )
    EventIcon = PartyPopper;
  else if (eventTypeLower.includes("fashion") || eventTypeLower.includes("art"))
    EventIcon = Sparkles;
  else if (eventTypeLower.includes("formal") || eventTypeLower.includes("gala"))
    EventIcon = Award;

  const imageSeed = eventAdvice.eventName.replace(/\s+/g, "") + cardIndex;
  const imageSrc = `https://picsum.photos/seed/${imageSeed}/400/250`;
  const imageHint = getEventImageHint(eventAdvice.eventType);

  const weatherConditionLower = eventAdvice.weatherCondition.toLowerCase();
  const isWeatherError =
    weatherConditionLower.includes("unavailable") ||
    weatherConditionLower.includes("error");
  const isMockData =
    !isWeatherError && eventAdvice.weatherCondition.includes("(Mock Data)");

  return (
    <Card
      className={cn(
        "flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card/80 backdrop-blur-sm h-full fade-in-up",
        {
          "ring-2 ring-green-500": decision === "accepted",
          "ring-2 ring-red-700": decision === "rejected",
          "ring-2 ring-amber-500": decision === "modified",
        },
      )}
      style={{ animationDelay: `${cardIndex * 100}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <CardTitle className="text-md font-semibold text-foreground mb-1 leading-tight">
              {eventAdvice.eventName}
            </CardTitle>
            {formattedEventTime && (
              <CardDescription className="text-xs text-muted-foreground leading-tight mt-0.5">
                <CalendarDays className="inline-block h-3 w-3 mr-1 relative -top-px" />
                {formattedEventTime}
              </CardDescription>
            )}
            {eventAdvice.eventLocation && (
              <CardDescription className="text-xs text-muted-foreground mt-0.5 leading-tight">
                <MapPin className="inline-block h-3 w-3 mr-1 relative -top-px" />
                {eventAdvice.eventLocation.replace(" / ", " / ")}
              </CardDescription>
            )}
          </div>
          <EventIcon className="h-5 w-5 text-accent ml-2 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="aspect-[16/10] w-full relative rounded-md mb-3 bg-secondary/50">
              <Image
                src={imageSrc}
                alt={`Style advice for ${eventAdvice.eventName}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
                data-ai-hint={imageHint}
                priority={cardIndex < 3}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="p-2 bg-card border shadow-lg rounded-md">
            <div className="w-32 h-32 relative rounded overflow-hidden bg-muted">
              <Image
                src={tooltipShoeImageUrl}
                alt={tooltipShoeText}
                fill
                sizes="128px"
                className="object-contain"
                data-ai-hint="shoe footwear"
                unoptimized={
                  !tooltipShoeImageUrl.startsWith("https://picsum.photos")
                }
              />
            </div>
            <p className="text-[11px] text-center mt-1 text-card-foreground max-w-[128px] truncate">
              {tooltipShoeText}
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={
              isWeatherError
                ? "destructive"
                : isMockData
                  ? "outline"
                  : "outline"
            }
            className={cn(
              "text-xs",
              isWeatherError
                ? "bg-destructive/20 border-destructive text-destructive-foreground"
                : isMockData
                  ? "border-yellow-500/70 text-yellow-600 bg-yellow-500/10"
                  : "border-accent/70 text-accent",
            )}
          >
            {isWeatherError ? (
              <AlertTriangle className="h-3 w-3 mr-1.5" />
            ) : isMockData ? (
              <Info className="h-3 w-3 mr-1.5" />
            ) : (
              <CloudSun className="h-3 w-3 mr-1.5" />
            )}
            {isWeatherError
              ? "Weather unavailable"
              : `${eventAdvice.temperature}°C, ${eventAdvice.weatherCondition}`}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {eventAdvice.eventType}
          </Badge>
        </div>
        <div className="text-xs text-foreground mb-2 leading-normal h-20 overflow-y-auto p-1 rounded bg-muted/30">
          <Lightbulb className="h-3.5 w-3.5 mr-1.5 float-left text-accent relative top-0.5" />
          {eventAdvice.advice}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-2 pt-3 border-t">
        <div className="w-full space-y-2">
          <div className="flex w-full gap-2">
            <Button
              onClick={() => handleFeedback("rejected")}
              variant={decision === "rejected" ? "default" : "outline"}
              className={cn(
                "flex-1",
                decision === "rejected"
                  ? "bg-red-700 hover:bg-red-800 text-white"
                  : "border-red-600 text-red-600 hover:bg-red-600/10 hover:text-red-500",
              )}
              size="sm"
              aria-label="Reject this advice"
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
                  : "border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400",
              )}
              size="sm"
              aria-label="Modify this advice"
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
                : "border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500",
            )}
            size="sm"
            aria-label="Accept this advice"
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Accept
          </Button>
        </div>
        <div className="w-full pt-1">
          <Tooltip>
            <TooltipTrigger asChild className="w-full">
              <Button
                onClick={handleSpeak}
                variant="secondary"
                size="sm"
                className="w-full text-secondary-foreground hover:bg-secondary/90"
                aria-label={isSpeaking ? "Stop speaking" : "Speak event advice"}
              >
                {isSpeaking ? (
                  <StopCircle key="icon-stop-event" className="mr-2 h-4 w-4" />
                ) : (
                  <Volume2 key="icon-play-event" className="mr-2 h-4 w-4" />
                )}
                {isSpeaking ? (
                  <span key="text-stop-event">Stop</span>
                ) : (
                  <span key="text-listen-event">Listen</span>
                )}
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

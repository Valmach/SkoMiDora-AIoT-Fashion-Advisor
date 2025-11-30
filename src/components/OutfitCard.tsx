
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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shirt,
  Footprints,
  Star,
  CalendarDays,
  CloudSun,
  Briefcase,
  PartyPopper,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Link as LinkIcon,
  Volume2,
  StopCircle,
  Lightbulb,
  Edit3,
  Loader2,
  Box,
  ShoppingBag,
  Globe,
} from "lucide-react";
import type { ElementType } from "react";
import { useState, useEffect, useRef, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  EventDetailsForFeedbackAction,
  OutfitForFeedbackAction,
  GoogleCalendarEvent,
  AnalyzedItem,
  OutfitOutput,
} from "@/types";
import { processOutfitFeedbackAction } from "@/app/actions";

interface OutfitCardProps {
  outfit: OutfitOutput;
  index: number;
  eventDetails?: GoogleCalendarEvent | null;
  styleDNA?: string | null;
  analyzedItems?: AnalyzedItem[];
}

const DEFAULT_OUTFIT_PLACEHOLDER_IMAGE = "https://placehold.co/400x400.png";
const DEFAULT_SHOE_TOOLTIP_PLACEHOLDER_IMAGE =
  "https://placehold.co/200x200.png";

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

const parseCountryOfOrigin = (specifications?: string): string | null => {
  if (!specifications) return null;
  const lines = specifications.split("\n");
  for (const line of lines) {
    if (line.toLowerCase().startsWith("origin:")) {
      return line.substring("origin:".length).trim();
    }
  }
  return null;
};

export default function OutfitCard({
  outfit,
  index,
  eventDetails,
  styleDNA,
  analyzedItems = [],
}: OutfitCardProps) {
  const [decision, setDecision] = useState<
    "accepted" | "rejected" | "modified" | null
  >(null);
  const [formattedEventTime, setFormattedEventTime] = useState<string | null>(
    null,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessingFeedback, startProcessingFeedback] = useTransition();
  const { toast } = useToast();
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [mainOutfitImageUrl, setMainOutfitImageUrl] = useState<string>(
    DEFAULT_OUTFIT_PLACEHOLDER_IMAGE,
  );
  const [mainOutfitImageHint, setMainOutfitImageHint] =
    useState<string>("stylish outfit");
  const [tooltipFinalShoeImageUrl, setTooltipFinalShoeImageUrl] =
    useState<string>(DEFAULT_SHOE_TOOLTIP_PLACEHOLDER_IMAGE);
  const [tooltipFinalShoeImageHint, setTooltipFinalShoeImageHint] =
    useState<string>("shoe footwear");
  const [matchedShoeDesigner, setMatchedShoeDesigner] = useState<
    string | null | undefined
  >(null);
  const [matchedShoeOrigin, setMatchedShoeOrigin] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const currentOutfit = outfit || {};
    const displayUrl =
      currentOutfit.outfitImageDataUri || DEFAULT_OUTFIT_PLACEHOLDER_IMAGE;
    let hint = "stylish outfit";

    if (currentOutfit.outfitImageDataUri) {
      hint = (
        currentOutfit.outfitDescription || "AI generated outfit"
      ).substring(0, 30);
    } else if (currentOutfit.outfitDescription) {
      const descKeywords = currentOutfit.outfitDescription
        .toLowerCase()
        .match(/\b(\w+)\b/g);
      if (descKeywords && descKeywords.length > 0) {
        const commonClothingTypes = [
          "dress",
          "suit",
          "jacket",
          "trousers",
          "skirt",
          "blouse",
          "coat",
          "top",
          "shirt",
        ];
        const foundType = commonClothingTypes.find((type) =>
          descKeywords.includes(type),
        );
        if (foundType) {
          hint = foundType;
          const colorMatch = currentOutfit.outfitDescription
            .toLowerCase()
            .match(
              /(black|white|red|blue|green|yellow|pink|purple|orange|brown|gray|beige|navy)/,
            );
          if (colorMatch) hint += ` ${colorMatch[0]}`;
        } else {
          hint = descKeywords.slice(0, 2).join(" ");
        }
      }
    } else if (eventDetails?.eventType) {
      hint = eventDetails.eventType.split(" ")[0];
    }
    setMainOutfitImageUrl(displayUrl);
    setMainOutfitImageHint(hint.substring(0, 30));

    const chosenShoeName = currentOutfit.chosenShoe || "";
    let finalTooltipUrl = DEFAULT_SHOE_TOOLTIP_PLACEHOLDER_IMAGE; // Default
    let finalTooltipHint = "shoe footwear"; // Default
    let designer: string | null | undefined = null;
    let origin: string | null = null;

    const cardIdentifier = `OutfitCard #${index} (Event: ${eventDetails?.eventName || "N/A"}, AI Shoe: "${chosenShoeName}")`;
    console.log(`${cardIdentifier}: Starting shoe matching process.`);

    if (chosenShoeName && analyzedItems && analyzedItems.length > 0) {
      const closetShoes = analyzedItems.filter(
        (item) => item.itemType === "Shoes",
      );
      console.log(
        `${cardIdentifier}: AI Chosen Shoe: "${chosenShoeName}". Digital Closet Shoes available for matching: ${closetShoes.length}`,
        closetShoes.map((s) => `"${s.itemName}" (ID: ${s.id})`),
      );

      const aiShoeNameLower = chosenShoeName.toLowerCase().trim();
      const matchedShoe = closetShoes.find((item) => {
        const closetItemNameLower = item.itemName?.toLowerCase().trim();
        // console.log(`${cardIdentifier}: Comparing AI: "${aiShoeNameLower}" WITH Closet: "${closetItemNameLower}"`);
        return closetItemNameLower === aiShoeNameLower;
      });

      if (matchedShoe) {
        console.log(
          `${cardIdentifier}: >>> MATCH FOUND! AI shoe "${chosenShoeName}" matched with Digital Closet item "${matchedShoe.itemName}" (ID: ${matchedShoe.id}). Image URL: ${matchedShoe.imageUrl || "Not Available"}`,
        );
        if (matchedShoe.imageUrl && matchedShoe.imageUrl.trim() !== "") {
          finalTooltipUrl = matchedShoe.imageUrl;
          finalTooltipHint =
            (matchedShoe.itemName || "selected shoe") +
            " " +
            (matchedShoe.color || "");
          designer = matchedShoe.designerName;
          origin = parseCountryOfOrigin(matchedShoe.detailedSpecifications);
        } else {
          console.warn(
            `${cardIdentifier}: Matched shoe "${matchedShoe.itemName}" but it has NO imageUrl or it's empty. Tooltip will use placeholder.`,
          );
          finalTooltipHint = `${chosenShoeName} (image missing in closet)`;
        }
      } else {
        console.log(
          `${cardIdentifier}: --- NO MATCH FOUND --- for AI shoe "${chosenShoeName}" in Digital Closet. Tooltip will use placeholder.`,
        );
        finalTooltipHint = `${chosenShoeName} (not found in closet)`;
      }
    } else if (chosenShoeName) {
      console.log(
        `${cardIdentifier}: AI Chosen Shoe: "${chosenShoeName}", but Digital Closet (analyzedItems prop) is empty or contains no shoes. Tooltip will use placeholder.`,
      );
      finalTooltipHint = `${chosenShoeName} (closet empty/no shoes)`;
    } else {
      console.log(
        `${cardIdentifier}: No chosenShoe name provided by AI for this outfit. Tooltip will use placeholder.`,
      );
      finalTooltipHint = `Specific shoe not chosen`;
    }

    setTooltipFinalShoeImageUrl(finalTooltipUrl);
    setTooltipFinalShoeImageHint(finalTooltipHint.substring(0, 30));
    setMatchedShoeDesigner(designer);
    setMatchedShoeOrigin(origin);
  }, [outfit, analyzedItems, index, eventDetails]);

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
      const anyBritishKeywords = [
        "uk english",
        "english (united kingdom)",
        "en-gb",
      ];
      const genericEnglishKeywords = [
        "english female",
        "english us female",
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
  }, [index]);

  useEffect(() => {
    if (eventDetails?.eventStartDateTime && eventDetails?.eventEndDateTime) {
      try {
        const startDate = parseISO(eventDetails.eventStartDateTime);
        const endDate = parseISO(eventDetails.eventEndDateTime);

        const startStr = format(startDate, "EEE, d MMM 'at' p", {
          locale: enUS,
        });
        const endStr = format(endDate, "p (zzz)", { locale: enUS });

        if (format(startDate, "yyyyMMdd") === format(endDate, "yyyyMMdd")) {
          setFormattedEventTime(startStr + " - " + endStr);
        } else {
          const fullEndStr = format(endDate, "EEE, d MMM 'at' p (zzz)", {
            locale: enUS,
          });
          setFormattedEventTime(startStr + " - " + fullEndStr);
        }
      } catch (error) {
        console.error("Error formatting event dates for outfit card:", error);
        setFormattedEventTime("Event time not available");
      }
    }
  }, [eventDetails]);

  const handleFeedback = (
    userAction: "accepted" | "rejected" | "modified",
    userReason?: string,
  ) => {
    setDecision(userAction);
    if (!eventDetails || !styleDNA || !outfit) {
      toast({
        title: "Cannot Process Feedback",
        description:
          "Missing event details, style DNA, or outfit data to process feedback.",
        variant: "destructive",
      });
      return;
    }

    startProcessingFeedback(async () => {
      try {
        const feedbackInput = {
          outfitDetails: outfit as OutfitForFeedbackAction,
          userAction,
          eventDetails: eventDetails as EventDetailsForFeedbackAction,
          userStyleDNA: styleDNA,
          userReason: userReason || undefined,
        };

        const result = await processOutfitFeedbackAction(feedbackInput);

        if ("error" in result) {
          toast({
            title: "Feedback Error",
            description: result.error,
            variant: "destructive",
          });
        } else {
          if (userAction === "accepted") {
            toast({
              title: "Outfit Accepted!",
              description:
                result.followUpMessage ||
                "Great choice! We're glad you like this recommendation.",
              variant: "default",
            });
          } else if (userAction === "rejected") {
            toast({
              title: "Outfit Rejected",
              description:
                result.followUpMessage ||
                "Thanks for the feedback. We'll try to offer more suitable suggestions next time.",
              variant: "default",
            });
          } else if (userAction === "modified") {
            toast({
              title: "Modify Request Noted",
              description:
                result.followUpMessage ||
                "Functionality to modify this outfit is currently under development.",
              variant: "default",
            });
          }
        }
      } catch (e) {
        const errorMsg =
          e instanceof Error
            ? e.message
            : "An unknown error occurred processing feedback.";
        toast({
          title: "Feedback System Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    });
  };

  const handleModify = () => {
    handleFeedback("modified", "User wants to modify this outfit.");
  };

  const handleAccept = () => {
    handleFeedback("accepted");
  };

  const handleReject = () => {
    handleFeedback("rejected", "User rejected this outfit.");
  };

  const handleSpeak = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }

      const currentOutfit = outfit || {};
      const textToSpeak = `Outfit option ${index + 1}. Chosen shoe: ${currentOutfit?.chosenShoe || "Not specified"}. Outfit description: ${currentOutfit?.outfitDescription || "Not available"}. Reasoning: ${currentOutfit?.reasoning || "Not available"}. Suitability score is ${currentOutfit?.suitabilityScore || 0} percent.`;
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
          // console.warn(`OutfitCard ${index} - SPEECH_DEBUG: Speech synthesis intentionally stopped: ${event.error}`);
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

  const currentOutfit = outfit || {};
  const suitabilityScore =
    typeof currentOutfit.suitabilityScore === "number"
      ? currentOutfit.suitabilityScore
      : 0;
  const suitabilityColor =
    suitabilityScore > 85
      ? "bg-green-500"
      : suitabilityScore > 70
        ? "bg-yellow-500"
        : "bg-red-500";

  let EventSpecificIcon: ElementType = CalendarDays;
  if (eventDetails?.eventType) {
    const eventTypeLower = eventDetails.eventType.toLowerCase();
    if (
      eventTypeLower.includes("business") ||
      eventTypeLower.includes("meeting") ||
      eventTypeLower.includes("conference") ||
      eventTypeLower.includes("professional") ||
      eventTypeLower.includes("presentation") ||
      eventTypeLower.includes("client")
    ) {
      EventSpecificIcon = Briefcase;
    } else if (
      eventTypeLower.includes("social") ||
      eventTypeLower.includes("party") ||
      eventTypeLower.includes("brunch") ||
      eventTypeLower.includes("chic")
    ) {
      EventSpecificIcon = PartyPopper;
    } else if (
      eventTypeLower.includes("fashion event") ||
      eventTypeLower.includes("art gallery") ||
      eventTypeLower.includes("opening")
    ) {
      EventSpecificIcon = Sparkles;
    } else if (
      eventTypeLower.includes("formal") ||
      eventTypeLower.includes("gala") ||
      eventTypeLower.includes("black-tie")
    ) {
      EventSpecificIcon = Award;
    }
  }

  const formattedLocation =
    eventDetails?.eventLocation?.replace(" / ", " / ") ||
    "Location not specified";
  const chosenShoeText = currentOutfit.chosenShoe || "Shoe not specified";
  const outfitDescriptionText =
    currentOutfit.outfitDescription || "Outfit description not available.";
  const reasoningText = currentOutfit.reasoning || "Reasoning not available.";
  const suggestedShoeboxThemeText = currentOutfit.suggestedShoeboxTheme;
  const designerLinksArray = currentOutfit.designerLinks || [];

  const isMainImageFirebase = mainOutfitImageUrl.includes(
    "firebasestorage.googleapis.com",
  );
  const isMainImagePlaceholder =
    mainOutfitImageUrl === DEFAULT_OUTFIT_PLACEHOLDER_IMAGE;
  const isMainImageDataUri = mainOutfitImageUrl.startsWith("data:");

  const isTooltipImageFirebase = tooltipFinalShoeImageUrl.includes(
    "firebasestorage.googleapis.com",
  );
  const isTooltipImagePlaceholder =
    tooltipFinalShoeImageUrl === DEFAULT_SHOE_TOOLTIP_PLACEHOLDER_IMAGE ||
    !tooltipFinalShoeImageUrl;

  // Split description for styling
  const descriptionParts = outfitDescriptionText.split(chosenShoeText);
  const firstPart = descriptionParts[0];
  const secondPart =
    descriptionParts.length > 1
      ? descriptionParts.slice(1).join(chosenShoeText)
      : "";

  return (
    <Card
      className={cn(
        "flex flex-col shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card/80 backdrop-blur-sm h-full",
        "fade-in-up",
        decision === "accepted"
          ? "ring-2 ring-green-500"
          : decision === "rejected"
            ? "ring-2 ring-red-700"
            : decision === "modified"
              ? "ring-2 ring-amber-500"
              : "",
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <CardTitle className="text-md font-semibold text-foreground mb-1 leading-tight">{`Outfit Option #${index + 1}`}</CardTitle>
            {eventDetails?.eventName && (
              <CardDescription className="text-xs font-semibold text-accent leading-tight">
                {eventDetails.eventName}
              </CardDescription>
            )}
            {formattedEventTime && (
              <CardDescription className="text-xs text-muted-foreground leading-tight mt-0.5">
                <CalendarDays className="inline-block h-3 w-3 mr-1 relative -top-px" />{" "}
                {formattedEventTime}
              </CardDescription>
            )}
            {eventDetails?.eventLocation && (
              <CardDescription className="text-xs text-muted-foreground mt-0.5 leading-tight">
                <MapPin className="inline-block h-3 w-3 mr-1 relative -top-px" />{" "}
                {formattedLocation}
              </CardDescription>
            )}
          </div>
          <Shirt className="h-5 w-5 text-accent ml-2 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="aspect-square w-full relative rounded-md mb-3 bg-secondary">
          <Image
            src={mainOutfitImageUrl}
            alt={`Outfit concept for ${eventDetails?.eventName || "event"}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain transition-transform duration-500 hover:scale-105"
            data-ai-hint={mainOutfitImageHint}
            priority={index < 2}
            key={mainOutfitImageUrl}
            unoptimized={
              isMainImageFirebase ||
              isMainImageDataUri ||
              isMainImagePlaceholder
            }
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
                <Footprints className="h-3.5 w-3.5 mr-1.5 text-accent" />{" "}
                Selected Footwear:
              </h4>
              <p className="text-sm text-foreground bg-muted/30 p-2 rounded-md truncate hover:whitespace-normal">
                {chosenShoeText}
              </p>
            </div>
          </TooltipTrigger>
          {chosenShoeText !== "Shoe not specified" && (
            <TooltipContent className="p-2 bg-card border shadow-lg rounded-md">
              <div className="w-32 h-32 relative rounded overflow-hidden">
                <Image
                  src={tooltipFinalShoeImageUrl}
                  alt={`Image of ${chosenShoeText}`}
                  fill
                  sizes="128px"
                  className="object-contain"
                  data-ai-hint={tooltipFinalShoeImageHint}
                  key={tooltipFinalShoeImageUrl}
                  unoptimized={
                    isTooltipImageFirebase ||
                    tooltipFinalShoeImageUrl.startsWith("data:") ||
                    isTooltipImagePlaceholder
                  }
                />
              </div>
              <p className="text-[11px] text-center mt-1 text-card-foreground">
                {chosenShoeText}
              </p>
            </TooltipContent>
          )}
        </Tooltip>

        {matchedShoeDesigner && (
          <div className="mb-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center">
              <ShoppingBag className="h-3 w-3 mr-1.5 text-accent" /> Designer:
            </h4>
            <p className="text-xs text-foreground">{matchedShoeDesigner}</p>
          </div>
        )}

        {matchedShoeOrigin && (
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center">
              <Globe className="h-3 w-3 mr-1.5 text-accent" /> Origin:
            </h4>
            <p className="text-xs text-foreground">{matchedShoeOrigin}</p>
          </div>
        )}

        <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
          Description:
        </h4>
        <p className="text-sm text-foreground mb-3 leading-relaxed h-24 overflow-y-auto p-1 rounded bg-muted/30">
          {firstPart}
          <span className="text-primary font-bold">{chosenShoeText}</span>
          {secondPart}
        </p>

        {reasoningText !== "Reasoning not available." && (
          <div className="mt-1 mb-3">
            <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
              <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-accent" />{" "}
              Reasoning:
            </h4>
            <p className="text-xs text-foreground bg-muted/30 p-2 rounded-md leading-normal">
              {reasoningText}
            </p>
          </div>
        )}

        {suggestedShoeboxThemeText && (
          <div className="mt-1 mb-3">
            <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center">
              <Box className="h-3.5 w-3.5 mr-1.5 text-accent" /> SkoMiDora
              Shoebox:
            </h4>
            <div className="text-xs text-foreground bg-muted/30 p-2 rounded-md leading-normal">
              <p>
                Pairs well with: <strong>{suggestedShoeboxThemeText}</strong>
              </p>
              <a
                href="https://shouraigen.wixsite.com/website-3"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline text-xs"
              >
                Explore SkoMiDora Shoeboxes
              </a>
            </div>
          </div>
        )}

        {designerLinksArray.length > 0 && (
          <div className="mt-1 mb-3">
            <h4 className="text-xs font-semibold text-foreground mb-1.5">
              Designer Spotlight:
            </h4>
            <div className="flex flex-wrap gap-x-2 gap-y-1.5">
              {designerLinksArray.map((link, linkIndex) => (
                <Button
                  key={linkIndex}
                  asChild
                  variant="link"
                  size="sm"
                  className="text-foreground hover:text-foreground/80 h-auto py-1 px-0 text-xs"
                >
                  <a
                    href={link.designerUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${link.designerName || "designer"} website`}
                  >
                    <LinkIcon className="h-3 w-3 mr-1" />
                    {link.designerName || "Visit Designer"}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-auto text-xs text-muted-foreground">
          <span className="flex items-center">
            <CloudSun className="h-4 w-4 mr-1" /> Weather Adaptive
          </span>
          {eventDetails && (
            <span className="flex items-center">
              <EventSpecificIcon className="h-4 w-4 mr-1" /> Event Appropriate
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-3 pt-3 border-t">
        <div className="flex justify-between w-full items-center">
          <span className="text-sm font-medium text-foreground">
            Suitability:
          </span>
          <Badge
            variant="outline"
            className={`text-xs ${suitabilityColor.replace("bg-", "border-").replace("-500", "/70")} ${suitabilityColor.replace("bg-", "text-")}`}
          >
            <Star className="h-3 w-3 mr-1 fill-current" /> {suitabilityScore}%
          </Badge>
        </div>
        <Progress
          value={suitabilityScore}
          aria-label={`Suitability score: ${suitabilityScore}%`}
          className="w-full h-2 [&>div]:bg-accent"
        />
        <div className="w-full pt-2 space-y-2">
          <div className="flex w-full gap-2">
            <Button
              onClick={handleReject}
              variant={decision === "rejected" ? "default" : "outline"}
              className={cn(
                "flex-1",
                decision === "rejected"
                  ? "bg-red-700 hover:bg-red-800 text-white"
                  : "border-red-600 text-red-600 hover:bg-red-600/10 hover:text-red-500",
              )}
              size="sm"
              aria-label="Reject this outfit"
              disabled={isProcessingFeedback}
            >
              {isProcessingFeedback && decision === "rejected" ? (
                <Loader2
                  key="loader-reject"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <ThumbsDown
                  key="thumbdown-reject-outfit"
                  className="mr-2 h-4 w-4"
                />
              )}{" "}
              Reject
            </Button>
            <Button
              onClick={handleModify}
              variant={decision === "modified" ? "default" : "outline"}
              className={cn(
                "flex-1",
                decision === "modified"
                  ? "bg-amber-500 hover:bg-amber-600 text-black"
                  : "border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400",
              )}
              size="sm"
              aria-label="Modify this outfit"
              disabled={isProcessingFeedback}
            >
              {isProcessingFeedback && decision === "modified" ? (
                <Loader2
                  key="loader-modify"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <Edit3 key="edit-modify-outfit" className="mr-2 h-4 w-4" />
              )}{" "}
              Modify
            </Button>
          </div>
          <Button
            onClick={handleAccept}
            variant={decision === "accepted" ? "default" : "outline"}
            className={cn(
              "w-full",
              decision === "accepted"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500",
            )}
            size="sm"
            aria-label="Accept this outfit"
            disabled={isProcessingFeedback}
          >
            {isProcessingFeedback && decision === "accepted" ? (
              <Loader2
                key="loader-accept"
                className="mr-2 h-4 w-4 animate-spin"
              />
            ) : (
              <ThumbsUp key="thumbup-accept-outfit" className="mr-2 h-4 w-4" />
            )}{" "}
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
                aria-label={
                  isSpeaking ? "Stop speaking" : "Speak outfit recommendation"
                }
              >
                {isSpeaking ? (
                  <StopCircle key="icon-stop-outfit" className="mr-2 h-4 w-4" />
                ) : (
                  <Volume2 key="icon-play-outfit" className="mr-2 h-4 w-4" />
                )}
                {isSpeaking ? (
                  <span key="text-stop-outfit">Stop</span>
                ) : (
                  <span key="text-listen-outfit">Listen</span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isSpeaking ? "Stop speaking" : "Listen to recommendation"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardFooter>
    </Card>
  );
}

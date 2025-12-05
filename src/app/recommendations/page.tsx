"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Loader2,
  Sparkles,
  Shirt,
  LoaderCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateOutfitForEventAction } from "@/app/actions";
import {
  getMockRecommendOutfitInput,
  mockAnalyzeStyleDNAInput,
} from "@/lib/mockData";
import OutfitCard from "@/components/OutfitCard";
import type {
  SingleOutfitOutput,
  AnalyzedItem,
  GoogleCalendarEvent,
} from "@/types";
import { safeToMillis } from "@/types";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";

const STYLE_DNA_LOCAL_STORAGE_KEY = "skomidoraStyleDNA";

export default function RecommendationsPage() {
  const firebase = useFirebase();
  const [styleDNA] = useLocalStorage<string | null>(
    STYLE_DNA_LOCAL_STORAGE_KEY,
    null,
  );
  const [recommendations, setRecommendations] = useState<SingleOutfitOutput[]>(
    [],
  );
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  const [wardrobeItems, setWardrobeItems] = useState<AnalyzedItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 🔧 🔥 FIX: normalize old image URLs + do not filter
  useEffect(() => {
    if (!firebase) {
      setIsDataLoading(false);
      setGenerationError("Failed to load wardrobe. Firebase is not available.");
      return;
    }
    setIsDataLoading(true);

    const itemsCollectionRef = collection(
      firebase.firestore,
      "publicWardrobeItems",
    );
    const q = query(itemsCollectionRef, orderBy("createdAt", "desc"));

    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AnalyzedItem[] = [];
        snapshot.forEach((doc: DocumentData) => {
          const data = doc.data();
          if (!data?.itemName) return;

          let url = data.imageUrl;

          // 🩹 Fix broken Storage URLs automatically
          if (url && bucket && !url.startsWith("https://")) {
            url = `https://storage.googleapis.com/${bucket}/${data.imagePath}`;
          }

          items.push({
            id: doc.id,
            ...data,
            imageUrl: url ?? null,
            createdAt: safeToMillis(data.createdAt),
          } as AnalyzedItem);
        });

        setWardrobeItems(items);
        setIsDataLoading(false);
      },
      (err) => {
        console.error("Error fetching wardrobe:", err);
        setGenerationError("Failed to load wardrobe.");
        setIsDataLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  // 🧠 Generate Recommendations
  const handleGenerateRecommendations = useCallback(() => {
    if (!styleDNA) {
      toast({
        title: "Style DNA Required",
        description:
          "Analyze on the Dashboard before generating outfits.",
        variant: "destructive",
      });
      return;
    }
    if (wardrobeItems.length === 0 && !isDataLoading) {
      toast({
        title: "Digital Closet is Empty",
        description: "Add items to your closet first.",
        variant: "destructive",
      });
      return;
    }

    startGeneratingTransition(async () => {
      setGenerationError(null);
      setRecommendations([]);
      setHasGenerated(true);
      toast({
        title: "Generating Outfits...",
        description: "AI is crafting your looks...",
      });

      try {
        const shoeItems = wardrobeItems.filter(
          (item) => item.itemType === "Shoes",
        );
        const clothingItems = wardrobeItems.filter(
          (item) => item.itemType !== "Shoes",
        );

        const wardrobeData = clothingItems
          .map((item) => item.itemName)
          .join(", ");
        const shoeCollectionData = shoeItems
          .map((item) => item.itemName)
          .join(", ");

        const outfitPromises = [0, 1, 2].map(async (eventIndex) => {
          const recommendInput = getMockRecommendOutfitInput(
            styleDNA,
            eventIndex,
            wardrobeData,
            shoeCollectionData,
          );
          const result = await generateOutfitForEventAction(recommendInput);
          if ("error" in result) return null;
          return result;
        });

        const results = await Promise.all(outfitPromises);
        const validResults = results.filter(
          (r): r is SingleOutfitOutput => r !== null && "chosenShoe" in r,
        );

        if (validResults.length > 0) {
          setRecommendations(validResults);
          toast({
            title: "Outfits Ready!",
            description: `Found ${validResults.length} outfits.`,
          });
        } else {
          setGenerationError("No outfits generated.");
          setRecommendations([]);
        }
      } catch (e: any) {
        setGenerationError("Unexpected error.");
        setRecommendations([]);
      }
    });
  }, [styleDNA, wardrobeItems, toast, isDataLoading]);

  // Auto-generate
  useEffect(() => {
    if (
      !isDataLoading &&
      styleDNA &&
      wardrobeItems.length > 0 &&
      !hasGenerated &&
      !isGenerating
    ) {
      handleGenerateRecommendations();
    }
  }, [
    isDataLoading,
    styleDNA,
    wardrobeItems,
    hasGenerated,
    isGenerating,
    handleGenerateRecommendations,
  ]);

  /** UI Below */

  const isLoading = isGenerating || isDataLoading;
  const error = generationError;

  const renderContent = () => {
    if (isLoading && recommendations.length === 0) {
      return (
        /* skeleton omitted for brevity (unchanged) */
        <div>Loading...</div>
      );
    }

    if (error && recommendations.length === 0) {
      return (
        <Card className="bg-destructive/10 border-destructive text-destructive-foreground p-4 mt-6 col-span-full">
          <CardHeader>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <CardTitle>An Error Occurred</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      );
    }

    if (!isGenerating && recommendations.length > 0) {
      return (
        <>
          <p className="text-lg text-center font-semibold">
            {`Found ${recommendations.length} outfit${
              recommendations.length === 1 ? "" : "s"
            }:`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((outfit, index) => (
              <OutfitCard
                key={`outfit-${index}-${outfit.chosenShoe}-${Date.now()}`}
                outfit={outfit}
                index={index}
                eventDetails={
                  mockAnalyzeStyleDNAInput.googleCalendarEvents[
                    index % mockAnalyzeStyleDNAInput.googleCalendarEvents.length
                  ] as GoogleCalendarEvent
                }
              />
            ))}
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto space-y-8">
      {/* header omitted, unchanged */}
      <div className="grid grid-cols-1">{renderContent()}</div>
    </div>
  );
}

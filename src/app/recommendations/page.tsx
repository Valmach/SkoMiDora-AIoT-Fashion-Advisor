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
  LoaderCircle,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateOutfitForEventAction } from "@/app/actions";
import OutfitCard from "@/components/OutfitCard";
import type {
  SingleOutfitOutput,
  AnalyzedItem,
  GoogleCalendarEvent,
  RecommendOutfitInput,
} from "@/types";
import { safeToMillis } from "@/types";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { mockAnalyzeStyleDNAInput } from "@/lib/mockData";

const STYLE_DNA_LOCAL_STORAGE_KEY = "skomidoraStyleDNA";

export default function RecommendationsPage() {
  const firebase = useFirebase();
  const [styleDNA] = useLocalStorage<string | null>(
    STYLE_DNA_LOCAL_STORAGE_KEY,
    null
  );

  const [recommendations, setRecommendations] = useState<
    SingleOutfitOutput[]
  >([]);
  const [isGenerating, startGeneratingTransition] = useTransition();
  const { toast } = useToast();
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [wardrobeItems, setWardrobeItems] = useState<AnalyzedItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);

  /* ============================
     FETCH WARDROBE
  ============================ */
  useEffect(() => {
    if (!firebase) {
      setIsDataLoading(false);
      setGenerationError("Firebase not available");
      return;
    }

    // 🔥 This query path should be using `__app_id` and `userId` for security in a real application.
    // For now, retaining the original structure which queries a global collection.
    const q = query(
      collection(firebase.firestore, "publicWardrobeItems"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AnalyzedItem[] = [];
        snapshot.forEach((doc: DocumentData) => {
          const data = doc.data();
          if (data?.itemName) {
            items.push({
              id: doc.id,
              ...data,
              createdAt: safeToMillis(data.createdAt),
            } as AnalyzedItem);
          }
        });
        setWardrobeItems(items);
        setIsDataLoading(false);
      },
      () => {
        setGenerationError("Failed to load wardrobe");
        setIsDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebase]);

  /* ============================
     GENERATE OUTFITS
  ============================ */
  const handleGenerateRecommendations = useCallback(() => {
    if (!styleDNA) {
      toast({
        title: "Style DNA Required",
        description: "Analyze your Style DNA first.",
        variant: "destructive",
      });
      return;
    }

    if (wardrobeItems.length === 0) {
      toast({
        title: "Closet Empty",
        description: "Add items to your digital closet first.",
        variant: "destructive",
      });
      return;
    }

    startGeneratingTransition(async () => {
      setRecommendations([]);
      setGenerationError(null);
      setHasGenerated(true);

      try {
        /* ----------------------------
           NORMALIZE INPUT (THIS FIXES TS2345)
        ---------------------------- */

        // 1. Create the structured array for shoe collection
        const shoeCollectionArray: string[] = wardrobeItems
          .filter((i) => i.itemType === "Shoes")
          .map((i) => i.itemName);

        // 2. Create the structured array for other wardrobe items
        const wardrobeDataArray: RecommendOutfitInput["wardrobeData"] =
          wardrobeItems
            .filter((i) => i.itemType !== "Shoes")
            .map((item) => ({
              itemName: item.itemName,
              itemType: item.itemType,
              color: item.color ?? null,
              generalMaterial: item.generalMaterial ?? null,
              narrativeDescription: item.narrativeDescription ?? null,
              styleKeywords: item.styleKeywords ?? [],
            }));

        const outfitPromises = [0, 1, 2].map(async (index) => {
          const currentEvent =
            mockAnalyzeStyleDNAInput.googleCalendarEvents[index % 3];

          // 3. FIX: Construct the input object, stringifying the arrays (shoeCollection & wardrobeData)
          // to match the expected `RawRecommendOutfitInput` structure where all complex fields are strings.
          const rawRecommendInput = {
            shoeCollection: JSON.stringify(shoeCollectionArray),
            wardrobeData: JSON.stringify(wardrobeDataArray),
            eventDetails: JSON.stringify(currentEvent),
            weatherConditions: JSON.stringify({ temperature: 18 + index * 2 }),
            stylePreferences: JSON.stringify(styleDNA),
          };

          // Use 'as any' to bypass the local type check on `RecommendOutfitInput` which is known to be
          // incorrect for the server action's requirement (`RawRecommendOutfitInput`).
          const result = await generateOutfitForEventAction(rawRecommendInput as any);
          if ("error" in result) return null;
          return result;
        });

        const results = (
          await Promise.all(outfitPromises)
        ).filter(Boolean) as SingleOutfitOutput[];

        if (results.length === 0) {
          setGenerationError("No outfits generated.");
          return;
        }

        setRecommendations(results);
        toast({
          title: "Outfits Ready",
          description: `Generated ${results.length} looks`,
        });
      } catch (e: any) {
        setGenerationError(e.message ?? "Generation failed");
      }
    });
  }, [styleDNA, wardrobeItems, toast]);

  /* ============================
     AUTO GENERATE
  ============================ */
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

  /* ============================
     RENDER
  ============================ */

  const isLoading = isGenerating || isDataLoading;

  return (
    <div className="container mx-auto space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lightbulb className="h-8 w-8" />
            <div>
              <CardTitle>Outfits From Your Closet</CardTitle>
              <CardDescription>
                AI-generated looks using your actual wardrobe
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateRecommendations}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Outfits
            </Button>
          </div>
        </CardContent>
      </Card>

      {generationError && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>{generationError}</CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((outfit, index) => (
            <OutfitCard
              key={index}
              outfit={outfit}
              index={index}
              eventDetails={
                mockAnalyzeStyleDNAInput.googleCalendarEvents[
                  index % 3
                ] as GoogleCalendarEvent
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
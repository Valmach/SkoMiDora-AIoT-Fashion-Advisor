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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AnalyzedItem[] = [];
        snapshot.forEach((doc: DocumentData) => {
          const data = doc.data();
          if (data && data.itemName && data.imageUrl) {
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
      (err) => {
        console.error("Error fetching wardrobe for recommendations:", err);
        setGenerationError(
          "Failed to load wardrobe. Recommendations may be inaccurate.",
        );
        setIsDataLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const handleGenerateRecommendations = useCallback(() => {
    if (!styleDNA) {
      toast({
        title: "Style DNA Required",
        description:
          "Please analyze your Style DNA on the Dashboard page before generating outfits.",
        variant: "destructive",
      });
      return;
    }
    if (wardrobeItems.length === 0 && !isDataLoading) {
      toast({
        title: "Digital Closet is Empty",
        description: "Please add items to your closet to get recommendations.",
        variant: "destructive",
      });
      return;
    }

    startGeneratingTransition(async () => {
      setGenerationError(null);
      setRecommendations([]);
      toast({
        title: "Generating Outfits...",
        description: "AI is crafting your new looks. This may take a moment...",
      });
      setHasGenerated(true);

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
          if ("error" in result) {
            console.warn(
              `Could not generate outfit for event index ${eventIndex}: ${result.error}`,
            );
            return null;
          }
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
          setGenerationError(
            "No outfits generated. Ensure Digital Closet has items and try again.",
          );
          setRecommendations([]);
        }
      } catch (e: any) {
        setGenerationError(
          `System Error: ${
            e.message ||
            "An unexpected error occurred during recommendation. Please try again."
          }`,
        );
        setRecommendations([]);
      }
    });
  }, [styleDNA, wardrobeItems, toast, isDataLoading]);

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

  const isLoading = isGenerating || isDataLoading;
  const error = generationError;

  const renderContent = () => {
    // loading skeletons…
    if (isLoading && recommendations.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card
              key={`skeleton-outfit-rec-page-${i}`}
              className="animate-pulse"
            >
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-full mt-1"></div>
              </CardContent>
            </Card>
          ))}
        </div>
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
          <p className="text-lg text-center text-foreground font-semibold">
            {`Found ${recommendations.length} outfit${
              recommendations.length === 1 ? "" : "s"
            } for your upcoming events:`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((outfit, index) => (
              <OutfitCard
                key={`outfit-rec-page-${index}-${outfit.chosenShoe}-${Date.now()}`}
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

    if (!isLoading && hasGenerated && recommendations.length === 0) {
      return (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-card col-span-full">
          <Shirt className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-lg font-medium text-foreground">
            No Outfits Generated
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn’t generate outfits right now. Try again later.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto space-y-8">
      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-2xl font-bold text-foreground font-calligraphy">
                Outfits From Your Closet
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Personalized outfits using your Style DNA, Digital Closet, mock
                calendar events, and live weather.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!styleDNA && !isLoading && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">
                Analyze your Style DNA on the Dashboard to personalize outfits
                from your closet.
              </p>
              <Button asChild variant="outline">
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          )}
          {styleDNA && (
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateRecommendations}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isDataLoading && !isGenerating ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}

                {isDataLoading
                  ? "Loading Closet..."
                  : isGenerating
                    ? "Recommending..."
                    : "Get New Outfits"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1">{renderContent()}</div>
    </div>
  );
}

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
import { Lightbulb, Loader2, Shirt, LoaderCircle, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateOutfitForEventAction } from "@/app/actions";
import OutfitCard from "@/components/OutfitCard";
import type { SingleOutfitOutput, AnalyzedItem, GoogleCalendarEvent } from "@/types";
import { safeToMillis } from "@/types";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { mockAnalyzeStyleDNAInput } from "@/lib/mockData";

const STYLE_DNA_LOCAL_STORAGE_KEY = "skomidoraStyleDNA";

export default function RecommendationsPage() {
  const firebase = useFirebase();
  const [styleDNA] = useLocalStorage<string | null>(STYLE_DNA_LOCAL_STORAGE_KEY, null);

  const [recommendations, setRecommendations] = useState<SingleOutfitOutput[]>([]);
  const [isGenerating, startGeneratingTransition] = useTransition();
  const { toast } = useToast();
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [wardrobeItems, setWardrobeItems] = useState<AnalyzedItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);

  /* ============================
      FETCH WARDROBE FROM FIRESTORE
  ============================ */
  useEffect(() => {
    if (!firebase) {
      setIsDataLoading(false);
      setGenerationError("Firebase Not Available");
      return;
    }

    setIsDataLoading(true);
    const q = query(
      collection(firebase.firestore, "publicWardrobeItems"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AnalyzedItem[] = [];
        snapshot.forEach((doc: DocumentData) => {
          const data = doc.data();
          if (data?.itemName && data?.imageUrl) {
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
        setGenerationError("Failed to load wardrobe.");
        setIsDataLoading(false);
      },
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
        description: "Please analyze your Style DNA before generating outfits.",
        variant: "destructive",
      });
      return;
    }

    if (wardrobeItems.length === 0) {
      toast({
        title: "Digital Closet is Empty",
        description: "Add clothing pieces to your closet first.",
        variant: "destructive",
      });
      return;
    }

    startGeneratingTransition(async () => {
      setRecommendations([]);
      setGenerationError(null);
      setHasGenerated(true);

      toast({
        title: "Generating Outfits...",
        description: "AI is crafting your looks.",
      });

      try {
        // Separate shoes & clothing
        const shoeItems = wardrobeItems.filter((i) => i.itemType === "Shoes");
        const clothingItems = wardrobeItems.filter((i) => i.itemType !== "Shoes");

        // Shoes → names only
        const shoeCollection = shoeItems.map((i) => i.itemName).join(", ");

        // Clothing → send structured JSON
        const wardrobeData = JSON.stringify(
          clothingItems.map((item) => ({
            itemName: item.itemName,
            itemType: item.itemType,
            color: item.color ?? null,
            material: item.generalMaterial ?? null,
            description: item.narrativeDescription ?? null,
            styleKeywords: item.styleKeywords ?? [],
          })),
        );

        // Generate 3 different recommendations
        const outfitPromises = [0, 1, 2].map(async (index) => {
          const currentEvent = mockAnalyzeStyleDNAInput.googleCalendarEvents[index % 3];
          const weatherData = { temperature: 18 + index * 2 }; // mock

          const recommendInput = {
            shoeCollection,
            wardrobeData,
            eventDetails: JSON.stringify(currentEvent),
            weatherConditions: JSON.stringify(weatherData),
            stylePreferences: JSON.stringify(styleDNA),
          };

          const result = await generateOutfitForEventAction(recommendInput);
          if ("error" in result) return null;
          return result;
        });

        const results = (await Promise.all(outfitPromises)).filter(Boolean) as SingleOutfitOutput[];

        if (results.length > 0) {
          setRecommendations(results);
          toast({ title: "Outfits Ready!", description: `Generated ${results.length} looks.` });
        } else {
          setGenerationError("No outfits generated. Please try again.");
        }
      } catch (e: any) {
        setGenerationError(`System Error: ${e.message ?? "Unknown failure"}`);
      }
    });
  }, [styleDNA, wardrobeItems, toast]);

  /* ============================
      AUTO-GENERATE
  ============================ */
  useEffect(() => {
    if (!isDataLoading && styleDNA && wardrobeItems.length > 0 && !hasGenerated && !isGenerating) {
      handleGenerateRecommendations();
    }
  }, [isDataLoading, styleDNA, wardrobeItems, hasGenerated, isGenerating, handleGenerateRecommendations]);

  /* ============================
      RENDER
  ============================ */
  const isLoading = isGenerating || isDataLoading;

  return (
    <div className="container mx-auto space-y-8">
      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-2xl font-bold">Outfits From Your Closet</CardTitle>
              <CardDescription className="text-muted-foreground">
                Personalized outfits using your Style DNA, closet, events & weather.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {styleDNA && (
            <div className="flex justify-end">
              <Button onClick={handleGenerateRecommendations} disabled={isLoading} variant="outline">
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isLoading ? "Generating..." : "Get New Outfits"}
              </Button>
            </div>
          )}
          {!styleDNA && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">Analyze Style DNA first.</p>
              <Button asChild variant="outline"><Link href="/">Go to Dashboard</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {generationError && recommendations.length === 0 && (
        <Card className="bg-destructive/10 border-destructive text-destructive-foreground p-4 mt-6">
          <CardHeader>
            <div className="flex items-center"><AlertTriangle className="h-5 w-5 mr-2" /><CardTitle>An Error Occurred</CardTitle></div>
          </CardHeader>
          <CardContent><p>{generationError}</p></CardContent>
        </Card>
      )}

      {!isLoading && recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((outfit, index) => (
            <OutfitCard
              key={index}
              outfit={outfit}
              index={index}
              eventDetails={mockAnalyzeStyleDNAInput.googleCalendarEvents[index % 3] as GoogleCalendarEvent}
              fallbackImageUrl={`https://picsum.photos/seed/FASHION-${index}/400/600`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

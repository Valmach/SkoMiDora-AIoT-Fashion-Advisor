
'use client';

import { useState, useEffect, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, AlertTriangle, Archive } from "lucide-react";
import Link from "next/link";
import { analyzeStyleDNAAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import StyleDnaDisplay from "@/components/StyleDnaDisplay";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";

const STYLE_DNA_LOCAL_STORAGE_KEY = "skomidoraStyleDNA";

export default function DashboardPage() {
  const firebase = useFirebase();
  const [styleDNA, setStyleDNA] = useLocalStorage<string | null>(
    STYLE_DNA_LOCAL_STORAGE_KEY,
    null,
  );
  const [isAnalyzing, startAnalyzingTransition] = useTransition();
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

  const [wardrobeItemCount, setWardrobeItemCount] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);

  useEffect(() => {
    if (!firebase) {
      setIsDataLoading(false);
      setAnalysisError("Could not connect to the wardrobe service. Firebase is not available.");
      return;
    }
    setIsDataLoading(true);
    const itemsCollectionRef = collection(firebase.firestore, "publicWardrobeItems");
    const q = query(itemsCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWardrobeItemCount(snapshot.size);
        setIsDataLoading(false);
      },
      (err) => {
        console.error("Error fetching wardrobe count on dashboard:", err);
        setIsDataLoading(false);
        setAnalysisError("Could not connect to the wardrobe service.");
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const handleAnalyzeDNA = () => {
    if (wardrobeItemCount === 0) {
      toast({
        title: "Your Closet is Empty",
        description:
          "Please add some items to your Digital Closet before analyzing your Style DNA.",
        variant: "destructive",
      });
      return;
    }

    startAnalyzingTransition(async () => {
      setAnalysisError(null);
      setAnalysisCompleted(false);
      toast({
        title: "Analyzing Your Style DNA...",
        description:
          "The AI is looking at your collection. This might take a moment.",
      });
      try {
        const result = await analyzeStyleDNAAction();
        if ("error" in result) {
          throw new Error(result.error);
        }
        if (result.styleDNA) {
          setStyleDNA(result.styleDNA);
          setAnalysisCompleted(true);
          toast({
            title: "Style DNA Updated!",
            description: "Your personalized fashion profile is ready.",
          });
        } else {
            throw new Error("Analysis did not return a valid Style DNA.");
        }
      } catch (e: any) {
        const errorMessage = `Analysis Failed: ${e.message || "An unknown error occurred."}`;
        setAnalysisError(errorMessage);
        toast({
          title: "Analysis Failed",
          description: e.message || "Could not analyze Style DNA.",
          variant: "destructive",
        });
      }
    });
  };

  const isLoading = isAnalyzing || isDataLoading;
  const error = analysisError;

  return (
    <div className="container mx-auto space-y-8">
      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-foreground font-calligraphy">
            Upcoming Events
          </CardTitle>
          <CardDescription className="text-muted-foreground font-sans">
            Manage your upcoming events and get style advice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
         <p> Events content will go here. </p>
        </CardContent>
      </Card>
    </div>
  );
}

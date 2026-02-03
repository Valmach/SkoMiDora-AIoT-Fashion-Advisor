'use client';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState, useEffect, useTransition } from "react";
import { Bonheur_Royale } from "next/font/google"; 
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

const bonheur = Bonheur_Royale({
  subsets: ["latin"],
  weight: ["400"],
});

const STYLE_DNA_LOCAL_STORAGE_KEY = "skomidoraStyleDNA";

export default function DashboardPage() {
  const firebase = useFirebase();
  const [styleDNA, setStyleDNA] = useLocalStorage<string | null>(
    STYLE_DNA_LOCAL_STORAGE_KEY,
    null,
  );
  const [isAnalyzing, startAnalyzingTransition] = useTransition();
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showDna, setShowDna] = useState(false); // Track if DNA should be visible
  const { toast } = useToast();

  const [wardrobeItemCount, setWardrobeItemCount] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!firebase) {
      setIsDataLoading(false);
      return;
    }
    const itemsCollectionRef = collection(firebase.firestore, "publicWardrobeItems");
    const q = query(itemsCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWardrobeItemCount(snapshot.size);
        setIsDataLoading(false);
      },
      (err) => {
        setIsDataLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const handleAnalyzeDNA = () => {
    if (wardrobeItemCount === 0) {
      toast({
        title: "Your Closet is Empty",
        description: "Please add some items to your Digital Closet before analyzing your Style DNA.",
        variant: "destructive",
      });
      return;
    }
  
    startAnalyzingTransition(async () => {
      setAnalysisError(null);
      setShowDna(false); // Hide while loading
      try {
        const result = await analyzeStyleDNAAction();
        if (result && 'styleDNA' in result && result.styleDNA) {
          setStyleDNA(result.styleDNA as string); 
          setShowDna(true); // ✅ Only show after successful click/analysis
          toast({ title: "Style DNA Updated!" });
        }
      } catch (e: any) {
        setAnalysisError("Analysis Failed");
      }
    });
  };

  return (
    <div className="container mx-auto space-y-8">
      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <CardTitle className={`${bonheur.className} text-7xl font-bold pb-2`}>
            <span className="text-white">Welcome to </span>
            <span className="text-[#DC143C]">SkoMiDora</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground font-sans">
            Your personal AIoT Powered stylist for footwear and fashion.
            Lets get you dressed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* ✅ DNA DISPLAY: Only visible when showDna is true (after button click) */}
          {showDna && styleDNA && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <StyleDnaDisplay styleDNA={styleDNA} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              variant="destructive"
              className="flex-1 font-calligraphy text-lg"
            >
              <Link href="/closet">
                <Archive className="mr-2 h-4 w-4" /> My Digital Closet
              </Link>
            </Button>
            <Button
              onClick={handleAnalyzeDNA}
              disabled={isAnalyzing || isDataLoading}
              className="flex-1 font-calligraphy text-lg bg-black hover:bg-destructive text-white"
              variant="secondary"
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyse My Style."}
            </Button>
          </div>
          {analysisError && (
            <div className="text-center py-2 text-destructive-foreground bg-destructive/20 p-2 rounded-md text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> <p>{analysisError}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

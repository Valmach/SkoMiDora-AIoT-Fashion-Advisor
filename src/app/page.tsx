'use client';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState, useEffect, useTransition } from "react";
import { Bonheur_Royale, Corinthia } from "next/font/google"; 
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

// Font Initializations
const bonheur = Bonheur_Royale({
  subsets: ["latin"],
  weight: ["400"],
});

const corinthia = Corinthia({
  subsets: ["latin"],
  weight: ["700"], 
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
  const [showDna, setShowDna] = useState(false);
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
      setShowDna(false); 
      try {
        const result = await analyzeStyleDNAAction();
        if (result && 'styleDNA' in result && result.styleDNA) {
          setStyleDNA(result.styleDNA as string); 
          setShowDna(true); 
          toast({ title: "Style DNA Updated!" });
        }
      } catch (e: any) {
        setAnalysisError("Analysis Failed");
      }
    });
  };

  return (
    <div className="container mx-auto space-y-8 pt-8 px-4 md:px-8">
      <Card className="shadow-2xl border-zinc-900 bg-[#050505]">
        <CardHeader className="pb-8">
          <CardTitle className={`${bonheur.className} text-5xl md:text-8xl font-normal pb-2 tracking-wide`}>
            <span className="text-white">Welcome to </span>
            <span className="text-[#9A1B22]">SkoMiDora</span>
          </CardTitle>
          <CardDescription className="text-zinc-400 font-sans text-sm md:text-base tracking-wide font-light">
            Your personal AIoT Powered stylist for footwear and fashion. Lets get you dressed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* DNA DISPLAY */}
          {showDna && styleDNA && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 mb-8">
              <StyleDnaDisplay styleDNA={styleDNA} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 md:gap-5">
            {/* My Digital Closet Button */}
            <Button
              asChild
              className={`flex-1 ${corinthia.className} text-3xl md:text-4xl py-4 md:py-8 bg-[#9A1B22] hover:bg-[#7A151B] text-white rounded-none transition-all shadow-lg hover:shadow-[#9A1B22]/20`}
            >
              <Link href="/closet" className="flex items-center justify-center">
                <Archive className="mr-3 h-5 w-5 md:h-6 md:w-6" /> My Digital Closet
              </Link>
            </Button>
            
            {/* Analyse My Style Button */}
            <Button
              onClick={handleAnalyzeDNA}
              disabled={isAnalyzing || isDataLoading}
              className={`flex-1 ${corinthia.className} text-3xl md:text-4xl py-4 md:py-8 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-[#9A1B22] text-white rounded-none transition-all shadow-lg`}
            >
              {isAnalyzing ? (
                <Loader2 className="mr-3 h-5 w-5 md:h-6 md:w-6 animate-spin text-[#9A1B22]" />
              ) : (
                <Brain className="mr-3 h-5 w-5 md:h-6 md:w-6 text-[#9A1B22]" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyse My Style."}
            </Button>
          </div>

          {analysisError && (
            <div className="text-center py-3 text-[#9A1B22] bg-[#9A1B22]/10 border border-[#9A1B22]/30 rounded-none text-sm flex items-center justify-center gap-2 mt-4 tracking-wider">
              <AlertTriangle className="h-4 w-4" /> <p>{analysisError}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
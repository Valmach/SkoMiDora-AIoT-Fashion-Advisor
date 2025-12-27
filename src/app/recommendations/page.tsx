'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar } from 'lucide-react';

import { generateOutfitForEventAction } from '@/app/actions/generate-outfit-for-event';
import { normalizeWardrobeType } from '@/lib/normalizeWardrobeType';

/* -----------------------------------------------------------
   TYPES
----------------------------------------------------------- */

type ClosetItem = {
  id: string;
  itemName: string;
  itemType: string;
};

type OutfitRecommendation = {
  eventName: string;
  date: string;
  styleCategory: string;
  description: string;
  footwear: string;
  suitabilityScore: number;
  imageUrl: string;
};

const STYLE_DNA_KEY = 'skomidoraStyleDNA';

/* -----------------------------------------------------------
   PAGE
----------------------------------------------------------- */

export default function RecommendationsPage() {
  const [styleDNA] = useLocalStorage<string | null>(STYLE_DNA_KEY, null);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  // Changed from string to Array of Recommendations
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD CLOSET ---------------- */

  useEffect(() => {
    const loadCloset = async () => {
      const snapshot = await getDocs(
        collection(firestore, 'publicWardrobeItems'),
      );

      const items: ClosetItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.itemName && data?.itemType) {
          items.push({
            id: doc.id,
            itemName: data.itemName,
            itemType: data.itemType,
          });
        }
      });

      setClosetItems(items);
    };

    loadCloset();
  }, []);

  /* ---------------- GENERATE OUTFITS ---------------- */

  const generateOutfit = async () => {
    if (!styleDNA || closetItems.length === 0) return;

    setLoading(true);
    setRecommendations([]);

    const normalizedWardrobe = closetItems.map((item) => ({
      id: item.id,
      name: item.itemName,
      type: normalizeWardrobeType(item.itemType),
    }));

    // This action should now return an array of 3 choices based on Calendar events
    const result = await generateOutfitForEventAction({
      wardrobeItems: normalizedWardrobe,
      styleDNA,
    });

    if (result?.recommendations) {
      setRecommendations(result.recommendations);
    }
    setLoading(false);
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-calligraphy text-white">Outfit Recommendations</h1>
        <Button 
          onClick={generateOutfit} 
          disabled={loading || !styleDNA}
          className="bg-destructive hover:bg-destructive/90"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
          {loading ? 'Consulting AI...' : 'Generate Calendar Outfits'}
        </Button>
      </div>

      {!styleDNA && (
        <Card className="bg-destructive/10 border-destructive/20 text-center py-6">
          <p className="text-destructive font-medium">
            Style DNA is required. Please analyze your style on the dashboard first.
          </p>
        </Card>
      )}

      {/* THREE CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => (
          <Card key={index} className="bg-[#0a0a0a] border-zinc-800 text-white overflow-hidden shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold">{rec.eventName}</CardTitle>
              <p className="text-xs text-zinc-400">
                {rec.date} • <span className="text-zinc-500">{rec.styleCategory}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-300 leading-relaxed min-h-[80px]">
                {rec.description}
              </p>
              
              <div className="space-y-1 py-3 border-t border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Shoe focus: {rec.footwear}</p>
                <p className="text-[10px] text-zinc-500">Suitability score: {rec.suitabilityScore}/100</p>
              </div>

              <div className="aspect-[4/5] relative rounded-md overflow-hidden bg-zinc-900">
                <img 
                  src={rec.imageUrl} 
                  alt={rec.eventName}
                  className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
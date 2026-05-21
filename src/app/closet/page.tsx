"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { generateShoppingRecommendations } from '@/app/actions/generate-shopping-recommendations';
import ShoppingRecommendations, { Recommendation } from '@/components/ShoppingRecommendations';
import { 
  collection, query, orderBy, onSnapshot, Timestamp, 
  addDoc, serverTimestamp, doc, deleteDoc 
} from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes, deleteObject } from "firebase/storage"; 
import { Bonheur_Royale } from 'next/font/google';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  Loader2, Upload, Trash2, AlertCircle, Tag, Palette, Sparkles, FileText, ImageOff, Wand2, CalendarHeart
} from "lucide-react";

import { useFirebase } from "@/firebase/provider";

// --- NEW IMPORT: Bringing in the Aggregator Test Component ---
import AggregatorTest from '@/components/AggregatorTest';

const bonheur = Bonheur_Royale({ 
  subsets: ['latin'], 
  weight: ['400'],
});

type ClosetItem = {
  id: string;
  itemName?: string;
  itemType?: string;
  color?: string;
  narrativeDescription?: string;
  styleKeywords?: string[];
  imagePath?: string;
  imageUrl?: string; 
  createdAt?: any;
};

function normalizeImagePath(path: string): string {
  let p = path;
  if (!p.includes("/") && !p.startsWith("http")) p = `public_wardrobe_items/${p}`;
  if (p.startsWith("public/")) p = p.replace(/^public\//, "public_wardrobe_items/");
  return p.replace(/â€“/g, "–");
}

export default function ClosetPage() {
  const firebase = useFirebase();
  const { toast } = useToast();

  const [items, setItems] = useState<ClosetItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- NEW STYLING ENGINE STATE ---
  const [isStyling, setIsStyling] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const eventName = "Summer Gala at the Met"; 

  const handleGenerateLooks = async () => {
    setIsStyling(true);
    try {
      const result = await generateShoppingRecommendations(eventName);
      if (result.success && result.recommendations) {
        setRecs(result.recommendations);
      } else {
        toast({ title: "Styling failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Styling failed:", error);
      toast({ title: "Error", description: "Something went wrong generating looks.", variant: "destructive" });
    } finally {
      setIsStyling(false);
    }
  };

  /* -----------------------------------------------------------
      FIRESTORE LISTENER
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!firebase || !firebase.firestore) return;

    const q = query(
      collection(firebase.firestore, "publicWardrobeItems"), 
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: ClosetItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
            };
        });
        setItems(next);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to load wardrobe metadata.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firebase]);

  /* -----------------------------------------------------------
      IMAGE RESOLVER
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!firebase || !firebase.storage) return;

    items.forEach(async (item) => {
      if (imageUrls[item.id] || brokenImages.has(item.id)) return;
      if (item.imageUrl && item.imageUrl.startsWith("http")) {
        setImageUrls((prev) => ({ ...prev, [item.id]: item.imageUrl! }));
        return;
      }
      if (!item.imagePath) {
        setBrokenImages((prev) => new Set(prev).add(item.id));
        return;
      }

      try {
        const normalizedPath = normalizeImagePath(item.imagePath);
        const url = await getDownloadURL(ref(firebase.storage, normalizedPath));
        setImageUrls((prev) => ({ ...prev, [item.id]: url }));
      } catch (err: unknown) {
        if (item.imagePath.startsWith("http")) setImageUrls((prev) => ({ ...prev, [item.id]: item.imagePath! }));
        else setBrokenImages((prev) => new Set(prev).add(item.id));
      }
    });
  }, [items, firebase, imageUrls, brokenImages]);

  /* -----------------------------------------------------------
      ACTIONS
  ----------------------------------------------------------- */
  const handleUpload = useCallback(async (file: File) => {
      if (!firebase || !firebase.storage || !firebase.firestore) {
        toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
        return;
      }

      setUploadStatus("uploading");
      toast({ title: "Uploading to cloud...", description: "Please wait." });
      
      try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
        const uniqueFileName = `${Date.now()}-${cleanFileName}`;
        const imagePath = `public_wardrobe_items/${uniqueFileName}`;
        
        const storageRef = ref(firebase.storage, imagePath);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);

        const aiFriendlyName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');

        const newItem = {
          itemName: aiFriendlyName, 
          itemType: "Uncategorized", 
          imagePath: imagePath,
          imageUrl: imageUrl, 
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(firebase.firestore, 'publicWardrobeItems'), newItem);

        toast({ title: "Success!", description: "Item securely added to digital closet." });
      } catch (e: unknown) {
        console.error(e);
        toast({ 
          title: "Upload failed", 
          description: e instanceof Error ? e.message : "An unknown error occurred", 
          variant: "destructive" 
        });
      } finally {
        setUploadStatus("idle");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }, [toast, firebase]);

  const handleDelete = async (item: ClosetItem) => {
    if (!item.id || !firebase) return;
    
    try {
      await deleteDoc(doc(firebase.firestore, "publicWardrobeItems", item.id));
      
      if (item.imagePath && firebase.storage) {
        const normalizedPath = normalizeImagePath(item.imagePath);
        await deleteObject(ref(firebase.storage, normalizedPath)).catch((e) => {
          console.warn("Image file already missing or couldn't be deleted", e);
        });
      }

      setImageUrls((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      
      toast({ title: "Item deleted successfully" });
    } catch (e: unknown) {
      console.error(e);
      toast({ 
        title: "Failed to delete item", 
        description: e instanceof Error ? e.message : "An unknown error occurred", 
        variant: "destructive" 
      });
    }
  };

  if (!firebase) {
    return (
      <div className="flex justify-center items-center h-[85vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* -----------------------------------------------------------
      RENDER
  ----------------------------------------------------------- */
  return (
    <div className="container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto">
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className={`${bonheur.className} text-6xl font-bold tracking-wide`}>Digital Closet</h1>
            <p className="text-muted-foreground">
              {items.length} curated items
            </p>
          </div>

          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus !== "idle"}
          >
            {uploadStatus === "idle" ? (
               <><Upload className="mr-2 h-4 w-4" /> Add Item</>
            ) : (
               <><Wand2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </CardContent>
      </Card>

      {/* --- NEW ADDITION: The Styling/Recommendation Interface --- */}
      <div className="w-full bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarHeart className="h-5 w-5 text-amber-600" />
              Upcoming Event: {eventName}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Nothing to wear in your current wardrobe?</p>
          </div>
          <Button 
            onClick={handleGenerateLooks} 
            disabled={isStyling}
            className="bg-black text-white hover:bg-gray-800"
          >
            {isStyling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Styling...</> : "Find Missing Pieces"}
          </Button>
        </div>

        {recs.length > 0 && (
          <ShoppingRecommendations eventContext={eventName} recommendations={recs} />
        )}
      </div>

      {/* --- NEW ADDITION: The Aggregator Test Interface --- */}
      <div className="w-full">
        <AggregatorTest />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => {
            const url = imageUrls[item.id];
            const isBroken = brokenImages.has(item.id);

            return (
              <div
                key={item.id}
                className="bg-card p-5 rounded-2xl border shadow-sm space-y-4"
              >
                <h2 className="text-xl font-bold text-center">
                  {item.itemName ?? "Untitled Item"}
                </h2>

                <div className="rounded-xl bg-muted flex items-center justify-center min-h-[300px] overflow-hidden">
                  {!url || isBroken ? (
                    <div className="flex flex-col items-center justify-center">
                      <ImageOff className="h-10 w-10 opacity-30" />
                      <span className="text-xs text-muted-foreground">
                        Image unavailable
                      </span>
                    </div>
                  ) : (
                    <Image
                      src={url}
                      alt={item.itemName ?? "Closet item"}
                      width={360}
                      height={360}
                      className="object-contain max-h-[300px] w-auto transition-transform duration-300 hover:scale-105"
                      unoptimized 
                    />
                  )}
                </div>

                <Button variant="destructive" onClick={() => handleDelete(item)} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>

                <div className="space-y-3 pt-4">
                  <div className="flex items-center space-x-3">
                    <Tag className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="font-semibold text-sm">Type:</span>
                    <Badge variant="secondary" className="capitalize">
                      {item.itemType || "Uncategorized"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Palette className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="font-semibold text-sm">Colour:</span>
                    <span className="text-sm text-muted-foreground">
                      {item.color || "Not specified"}
                    </span>
                  </div>

                  {item.narrativeDescription && (
                    <div className="flex flex-col space-y-2 mt-2">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                        <span className="font-semibold text-sm">Description</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-8 leading-relaxed">
                        {item.narrativeDescription}
                      </p>
                    </div>
                  )}

                  {item.styleKeywords && item.styleKeywords.length > 0 && (
                    <div className="flex flex-col space-y-2 mt-2">
                      <div className="flex items-center space-x-3">
                        <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
                        <span className="font-semibold text-sm">Style Keywords</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-8">
                        {item.styleKeywords.map((keyword, i) => (
                          <Badge key={`${item.id}-kw-${i}`} variant="destructive" className="capitalize">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
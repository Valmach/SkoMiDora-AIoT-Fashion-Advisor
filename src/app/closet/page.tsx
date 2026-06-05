"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from 'next/navigation';
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
import { useToast } from "@/hooks/use-toast";

import {
  Loader2, Upload, Trash2, AlertCircle, ImageOff, Wand2, CalendarHeart, CloudSun, FileText, Sparkles
} from "lucide-react";

import { useFirebase } from "@/firebase/provider";
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

function ClosetContent() {
  const firebase = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<ClosetItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isStyling, setIsStyling] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  
  const eventName = searchParams.get('event') || "Everyday Styling"; 
  const weatherContext = searchParams.get('weather') || "Current local weather - comfortable seasonal wear"; 

  const handleGenerateLooks = async () => {
    setIsStyling(true);
    try {
      const result = await generateShoppingRecommendations(eventName, weatherContext);
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
      if (!firebase || !firebase.storage || !firebase.firestore) return;
      
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
        toast({ title: "Upload failed", description: "An error occurred", variant: "destructive" });
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
        await deleteObject(ref(firebase.storage, normalizedPath)).catch((e) => console.warn(e));
      }
      setImageUrls((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
      toast({ title: "Item deleted successfully" });
    } catch (e: unknown) {
      console.error(e);
      toast({ title: "Failed to delete item", description: "An error occurred", variant: "destructive" });
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
      FILTER LOGIC
  ----------------------------------------------------------- */
  const uniqueCategories = ["All", ...Array.from(new Set(items.map(item => item.itemType || "Uncategorized")))];
  
  const filteredItems = activeFilter === "All" 
    ? items 
    : items.filter(item => (item.itemType || "Uncategorized") === activeFilter);

  /* -----------------------------------------------------------
      RENDER
  ----------------------------------------------------------- */
  return (
    <div className="container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto scrollbar-hide">
      
      {/* HEADER */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="pt-6 px-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className={`${bonheur.className} text-7xl font-bold tracking-wide`}>Digital Closet</h1>
            <p className="text-muted-foreground uppercase tracking-widest text-xs mt-2 font-semibold">
              {items.length} Curated Pieces
            </p>
          </div>

          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus !== "idle"}
            className="rounded-full px-8 bg-black text-white hover:bg-zinc-800"
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

      {/* STYLING/RECOMMENDATION INTERFACE */}
      <div className="w-full bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-3xl border shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarHeart className="h-5 w-5 text-red-600" />
              Upcoming Event: {eventName}
            </h2>
            <p className="text-muted-foreground text-sm mt-2 flex items-center gap-2">
              <CloudSun className="h-4 w-4 text-zinc-400" />
              Forecast: {weatherContext}
            </p>
          </div>
          <Button 
            onClick={handleGenerateLooks} 
            disabled={isStyling}
            className="bg-[#DC143C] text-white hover:bg-red-700 rounded-xl px-6 py-6 font-bold uppercase tracking-widest text-xs transition-all"
          >
            {isStyling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consulting Stylist...</> : "Find Missing Pieces"}
          </Button>
        </div>

        {recs.length > 0 && (
          <div className="pt-6 border-t mt-6">
            <ShoppingRecommendations eventContext={eventName} recommendations={recs} />
          </div>
        )}
      </div>

      {/* DYNAMIC CATEGORY FILTER BAR */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full snap-x">
        {uniqueCategories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveFilter(category)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all snap-start
              ${activeFilter === category 
                ? 'bg-black text-white shadow-md' 
                : 'bg-white text-zinc-500 border hover:border-zinc-400 hover:text-black dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'}
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {/* AGGREGATOR COMPONENT */}
      <div className="w-full">
        <AggregatorTest />
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* CLOSET GRID */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const url = imageUrls[item.id];
            const isBroken = brokenImages.has(item.id);

            return (
              <div
                key={item.id}
                className="group relative bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Image Container - Forced to perfect square */}
                <div className="relative aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-6 overflow-hidden">
                  {!url || isBroken ? (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <ImageOff className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-[10px] uppercase tracking-widest">Unavailable</span>
                    </div>
                  ) : (
                    <Image
                      src={url}
                      alt={item.itemName ?? "Closet item"}
                      fill
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      unoptimized 
                    />
                  )}

                  {/* Sleek Hover-Delete Button */}
                  <button 
                    onClick={() => handleDelete(item)}
                    className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-black/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm hover:bg-red-50 dark:hover:bg-red-950"
                    title="Remove Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Metadata Footer + Restored Descriptions */}
                <div className="p-5 flex flex-col flex-grow">
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-2">
                    {item.itemName ?? "Untitled Item"}
                  </h2>
                  
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-500 capitalize">
                      {item.itemType || "Uncategorized"}
                    </span>
                    {item.color && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Color</span>
                        <span className="text-xs font-medium capitalize">{item.color}</span>
                      </div>
                    )}
                  </div>

                  {item.narrativeDescription && (
                    <div className="flex flex-col mt-4">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {item.narrativeDescription}
                      </p>
                    </div>
                  )}

                  {item.styleKeywords && item.styleKeywords.length > 0 && (
                    <div className="flex flex-col mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Sparkles className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Style Keywords</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.styleKeywords.map((keyword, i) => (
                          <span 
                            key={`${item.id}-kw-${i}`} 
                            className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm"
                          >
                            {keyword}
                          </span>
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

export default function ClosetPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-[85vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ClosetContent />
    </Suspense>
  );
}
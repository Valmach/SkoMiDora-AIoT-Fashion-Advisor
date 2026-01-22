"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { Bonheur_Royale } from 'next/font/google'; // ✅ ADDED FONT IMPORT

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  Loader2,
  Upload,
  Trash2,
  AlertCircle,
  Tag,
  Palette,
  Sparkles,
  FileText,
  ImageOff,
} from "lucide-react";

import { analyzeAndSaveClothingItem, deleteClothingItem } from "@/app/actions";
import { firestore, storage } from "@/lib/firebase";

// ✅ CONFIGURE FONT
const bonheur = Bonheur_Royale({ 
  subsets: ['latin'], 
  weight: ['400'],
});

/* -----------------------------------------------------------
   TYPES
----------------------------------------------------------- */
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

/* -----------------------------------------------------------
   HELPER: STANDARD FOLDER PATHS
   This ensures the app looks inside 'public_wardrobe_items/'
----------------------------------------------------------- */
function normalizeImagePath(path: string): string {
  let p = path;
  
  // 1. If path is just "shoe.png" (no slash), add the folder prefix
  if (!p.includes("/") && !p.startsWith("http")) {
    p = `public_wardrobe_items/${p}`;
  }

  // 2. If path starts with generic "public/", fix the folder name
  if (p.startsWith("public/")) {
    p = p.replace(/^public\//, "public_wardrobe_items/");
  }

  // 3. Clean up special characters
  p = p.replace(/â€“/g, "–");
  
  return p;
}

export default function ClosetPage() {
  const { toast } = useToast();

  // 1. HYDRATION FIX: Track if we are on the client
  const [isMounted, setIsMounted] = useState(false);

  const [items, setItems] = useState<ClosetItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // 2. MOUNT CHECK: Run once on load
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* -----------------------------------------------------------
      FIRESTORE LISTENER
  ----------------------------------------------------------- */
  useEffect(() => {
    const q = query(
      collection(firestore, "publicWardrobeItems"),
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
                createdAt: data.createdAt instanceof Timestamp 
                  ? data.createdAt.toMillis() 
                  : Date.now(),
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
  }, []);

  /* -----------------------------------------------------------
      IMAGE RESOLVER
  ----------------------------------------------------------- */
  useEffect(() => {
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
        // ✅ Standard Logic: Trusts the path includes the folder
        const normalizedPath = normalizeImagePath(item.imagePath);
        
        const url = await getDownloadURL(ref(storage, normalizedPath));
        setImageUrls((prev) => ({ ...prev, [item.id]: url }));
      } catch (err: any) {
        // Zombie Data Protection
        if (item.imagePath.startsWith("http")) {
            setImageUrls((prev) => ({ ...prev, [item.id]: item.imagePath! }));
        } else {
            // console.warn(`Missing file: ${item.imagePath}`);
            setBrokenImages((prev) => new Set(prev).add(item.id));
        }
      }
    });
  }, [items]);

  /* -----------------------------------------------------------
      ACTIONS
  ----------------------------------------------------------- */
  const handleUpload = useCallback(async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      startTransition(async () => {
        try {
          await analyzeAndSaveClothingItem(fd);
          toast({ title: "Item added to closet" });
        } catch (e: any) {
          toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
        }
      });
    }, [toast]);

  const handleDelete = async (item: ClosetItem) => {
    if (!item.id) return;
    await deleteClothingItem(item.id, item.imagePath);
    setImageUrls((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  if (!isMounted) return null; 

  /* -----------------------------------------------------------
      RENDER
  ----------------------------------------------------------- */
  return (
    <div className="container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto">
      <Card>
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            {/* ✅ UPDATED: Applies Bonheur Royale Font Here */}
            <h1 className={`${bonheur.className} text-6xl font-bold tracking-wide`}>Digital Closet</h1>
            <p className="text-muted-foreground">
              {items.length} curated items
            </p>
          </div>

          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Add Item
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

                <div className="rounded-xl bg-muted flex items-center justify-center min-h-[300px]">
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
                      className="object-contain max-h-[300px] w-auto"
                      unoptimized 
                    />
                  )}
                </div>

                <Button variant="destructive" onClick={() => handleDelete(item)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>

                <div className="space-y-2 text-sm">
                  {item.itemType && (
                    <Badge variant="outline">
                      <Tag className="h-3 w-3 mr-1" />
                      {item.itemType}
                    </Badge>
                  )}
                  {item.color && (
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      {item.color}
                    </div>
                  )}
                  {item.narrativeDescription && (
                    <div className="italic text-muted-foreground text-xs">
                      <FileText className="inline h-3 w-3 mr-1" />
                      {item.narrativeDescription}
                    </div>
                  )}
                  {item.styleKeywords?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {item.styleKeywords.map((k, i) => (
                        <Badge key={`${item.id}-kw-${i}`} variant="secondary">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {k}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

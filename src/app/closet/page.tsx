"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";

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

/* -----------------------------------------------------------
   TYPES (SAFE + EXPLICIT)
----------------------------------------------------------- */
type ClosetItem = {
  id: string;
  itemName?: string;
  itemType?: string;
  color?: string;
  narrativeDescription?: string;
  styleKeywords?: string[];
  imagePath?: string;
  createdAt?: any;
};

/* -----------------------------------------------------------
   NORMALIZE LEGACY STORAGE PATHS
----------------------------------------------------------- */
function normalizeImagePath(path: string): string {
  let p = path;

  // legacy folder
  if (p.startsWith("public/")) {
    p = p.replace(/^public\//, "public_wardrobe_items/");
  }

  // broken UTF-8 dash → real en dash
  p = p.replace(/â/g, "–");

  return p;
}

export default function ClosetPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<ClosetItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

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
        const next: ClosetItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
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
     RESOLVE STORAGE URLS (ROBUST + SAFE)
  ----------------------------------------------------------- */
  useEffect(() => {
    items.forEach(async (item) => {
      if (!item.id || !item.imagePath) return;
      if (imageUrls[item.id]) return;
      if (brokenImages.has(item.id)) return;

      try {
        const normalizedPath = normalizeImagePath(item.imagePath);
        const url = await getDownloadURL(ref(storage, normalizedPath));

        setImageUrls((prev) => ({
          ...prev,
          [item.id]: url,
        }));
      } catch (err) {
        console.warn("Image failed:", item.imagePath, err);
        setBrokenImages((prev) => new Set(prev).add(item.id));
      }
    });
  }, [items, imageUrls, brokenImages]);

  /* -----------------------------------------------------------
     ACTIONS
  ----------------------------------------------------------- */
  const handleUpload = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);

      startTransition(async () => {
        try {
          await analyzeAndSaveClothingItem(fd);
          toast({ title: "Item added to closet" });
        } catch (e: any) {
          toast({
            title: "Upload failed",
            description: e?.message ?? "Unknown error",
            variant: "destructive",
          });
        }
      });
    },
    [toast]
  );

  const handleDelete = async (item: ClosetItem) => {
    if (!item.id) return;
    await deleteClothingItem(item.id, item.imagePath);
    setImageUrls((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  return (
    <div className="container mx-auto space-y-8 pb-12">
      <Card>
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Digital Closet</h1>
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

                {/* IMAGE */}
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

                <Button
                  variant="destructive"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>

                {/* METADATA */}
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

"use client";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import { collection, query, orderBy, onSnapshot, Timestamp, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes, deleteObject } from "firebase/storage"; 
import { Bonheur_Royale } from 'next/font/google';

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

import { firestore, storage } from "@/lib/firebase";

const bonheur = Bonheur_Royale({ 
  subsets: ['latin'], 
  weight: ['400'],
});

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

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

export default function ClosetClient() {
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const q = query(collection(firestore, "publicWardrobeItems"), orderBy("createdAt", "desc"));
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
  }, []);

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
        const normalizedPath = normalizeImagePath(item.imagePath);
        const url = await getDownloadURL(ref(storage, normalizedPath));
        setImageUrls((prev) => ({ ...prev, [item.id]: url }));
      } catch (err: any) {
        if (item.imagePath.startsWith("http")) setImageUrls((prev) => ({ ...prev, [item.id]: item.imagePath! }));
        else setBrokenImages((prev) => new Set(prev).add(item.id));
      }
    });
  }, [items]);

  const handleUpload = useCallback(async (file: File) => {
      toast({ title: "Uploading to cloud...", description: "Please wait." });
      try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
        const uniqueFileName = `${Date.now()}-${cleanFileName}`;
        const imagePath = `public_wardrobe_items/${uniqueFileName}`;
        
        const storageRef = ref(storage, imagePath);
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

        await addDoc(collection(firestore, 'publicWardrobeItems'), newItem);
        toast({ title: "Success!", description: "Item safely added to digital closet." });
      } catch (e: any) {
        console.error(e);
        toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
      }
    }, [toast]);

  const handleDelete = async (item: ClosetItem) => {
    if (!item.id) return;
    try {
      await deleteDoc(doc(firestore, "publicWardrobeItems", item.id));
      if (item.imagePath) {
        const normalizedPath = normalizeImagePath(item.imagePath);
        await deleteObject(ref(storage, normalizedPath)).catch((e) => {
          console.warn("Image file already missing or couldn't be deleted", e);
        });
      }
      setImageUrls((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      toast({ title: "Item deleted successfully" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to delete item", description: e?.message, variant: "destructive" });
    }
  };

  if (!isMounted) return null; 

  return (
    <div className="container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto">
      <Card>
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            <h1 className={`${bonheur.className} text-6xl font-bold tracking-wide`}>Digital Closet</h1>
            <p className="text-muted-foreground">{items.length} curated items</p>
          </div>

          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Add Item
          </Button>

          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" /> {error}
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
              <div key={item.id} className="bg-card p-5 rounded-2xl border shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-center">{item.itemName ?? "Untitled Item"}</h2>
                <div className="rounded-xl bg-muted flex items-center justify-center min-h-[300px]">
                  {!url || isBroken ? (
                    <div className="flex flex-col items-center justify-center">
                      <ImageOff className="h-10 w-10 opacity-30" />
                      <span className="text-xs text-muted-foreground">Image unavailable</span>
                    </div>
                  ) : (
                    <Image src={url} alt={item.itemName ?? "Closet item"} width={360} height={360} className="object-contain max-h-[300px] w-auto" unoptimized />
                  )}
                </div>

                <Button variant="destructive" onClick={() => handleDelete(item)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>

                <div className="space-y-2 text-sm">
                  {item.itemType && <Badge variant="outline"><Tag className="h-3 w-3 mr-1" />{item.itemType}</Badge>}
                  {item.color && <div className="flex items-center gap-2"><Palette className="h-4 w-4" />{item.color}</div>}
                  {item.narrativeDescription && <div className="italic text-muted-foreground text-xs"><FileText className="inline h-3 w-3 mr-1" />{item.narrativeDescription}</div>}
                  {item.styleKeywords?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {item.styleKeywords.map((k, i) => (
                        <Badge key={`${item.id}-kw-${i}`} variant="secondary"><Sparkles className="h-3 w-3 mr-1" />{k}</Badge>
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
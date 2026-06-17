//src/app/closet/ClosetClient.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from "firebase/firestore";
// Removed 'addDoc' and 'serverTimestamp' because the Cloud Function does that now!
import { ref, getDownloadURL, deleteObject } from "firebase/storage"; 
import { Bonheur_Royale } from 'next/font/google';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { uploadWardrobeImage } from "@/lib/wardrobeStorage"; // Import our new utility!

import {
  Loader2,
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
  aiAnalyzed?: boolean; // Added this to match our new Firestore schema
};

function normalizeImagePath(path: string): string {
  let p = path;
  // Adjusted to match the new dynamic user path structure, but kept backwards compatibility
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
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // For testing, hardcoding a user ID. You should swap this with your auth context later.
  const USER_ID = "uid123"; 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Updated to look at the new dynamic user subcollection created by the Cloud Function
  useEffect(() => {
    const q = query(collection(firestore, `users/${USER_ID}/wardrobeItems`), orderBy("createdAt", "desc"));
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

  // --- THE NEW, CLEAN UPLOAD HANDLER ---
  const handleUpload = useCallback(async (file: File) => {
      setIsUploading(true);
      toast({ title: "Uploading to cloud...", description: "Please wait." });
      
      try {
        // Fire it directly to storage using our utility.
        // The Cloud Function will autonomously build the Firestore document.
        await uploadWardrobeImage(file, USER_ID);
        
        toast({ 
            title: "Success!", 
            description: "Item safely added. AI Stylist is processing it in the background." 
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (e: any) {
        console.error(e);
        toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    }, [toast]);
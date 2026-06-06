"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { 
  collection, query, orderBy, onSnapshot, Timestamp, 
  addDoc, serverTimestamp, doc, deleteDoc 
} from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes, deleteObject } from "firebase/storage"; 
import { Bonheur_Royale, Montserrat } from 'next/font/google';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import {
  Loader2, Upload, Trash2, AlertCircle, ImageOff, Wand2, FileText, Sparkles
} from "lucide-react";

import { useFirebase } from "@/firebase/provider";

const bonheur = Bonheur_Royale({ 
  subsets: ['latin'], 
  weight: ['400'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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
  
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!firebase || !firebase.firestore) return;
    const q = query(collection(firebase.firestore, "publicWardrobeItems"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        const next: ClosetItem[] = snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, ...data, createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now() };
        });
        setItems(next);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setError("Failed to load wardrobe metadata.");
        setLoading(false);
      });
    return () => unsub();
  }, [firebase]);

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
        const newItem = { itemName: aiFriendlyName, itemType: "Uncategorized", imagePath: imagePath, imageUrl: imageUrl, createdAt: serverTimestamp() };
        await addDoc(collection(firebase.firestore, 'publicWardrobeItems'), newItem);
        toast({ title: "Success!", description: "Item securely added to digital closet." });
      } catch (e: unknown) {
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
      toast({ title: "Failed to delete item", description: "An error occurred", variant: "destructive" });
    }
  };

  if (!firebase) {
    return (
      <div className="flex justify-center items-center h-[85vh] bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-[#722F37]" />
      </div>
    );
  }

  const uniqueCategories = ["All", ...Array.from(new Set(items.map(item => item.itemType || "Uncategorized")))];
  const filteredItems = activeFilter === "All" ? items : items.filter(item => (item.itemType || "Uncategorized") === activeFilter);

  return (
    <div className={`container mx-auto space-y-6 pb-12 h-[85vh] overflow-y-auto scrollbar-hide bg-[#121212] text-zinc-100 ${montserrat.className} px-4 pt-4`}>
      
      {/* HEADER */}
      <Card className="border-0 shadow-none bg-transparent mb-4">
        <CardContent className="pt-6 px-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className={`${bonheur.className} text-7xl font-bold tracking-wide text-white`}>Digital Closet</h1>
            <p className="text-zinc-400 uppercase tracking-[0.2em] text-xs mt-2 font-medium">
              <span className="text-[#722F37]">●</span> {items.length} Curated Pieces
            </p>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus !== "idle"}
            className="rounded-none px-8 py-6 bg-[#722F37] text-white hover:bg-[#5a252b] uppercase tracking-widest text-xs transition-all shadow-lg"
          >
            {uploadStatus === "idle" ? <><Upload className="mr-3 h-4 w-4" /> Add Item</> : <><Wand2 className="mr-3 h-4 w-4 animate-spin" /> Uploading...</>}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        </CardContent>
      </Card>

      {/* FILTERS */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide w-full snap-x">
        {uniqueCategories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveFilter(category)}
            className={`whitespace-nowrap px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase transition-all snap-start border border-white/10
              ${activeFilter === category 
                ? 'bg-[#722F37] text-white shadow-md' 
                : 'bg-white/5 backdrop-blur-md text-zinc-400 hover:bg-white/10 hover:text-white'}
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-[#722F37]/20 p-4 border border-[#722F37]/50 backdrop-blur-md">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm tracking-wide">{error}</span>
        </div>
      )}

      {/* WARDROBE GRID */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#722F37]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item) => {
            const url = imageUrls[item.id];
            const isBroken = brokenImages.has(item.id);

            return (
              <div key={item.id} className="group relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/5 shadow-2xl hover:border-white/15 transition-all duration-500 overflow-hidden flex flex-col">
                <div className="relative aspect-square w-full bg-[#121212]/80 flex items-center justify-center overflow-hidden p-8">
                  {!url || isBroken ? (
                    <div className="flex flex-col items-center justify-center text-zinc-700">
                      <ImageOff className="h-8 w-8 mb-3 opacity-50" />
                      <span className="text-[10px] uppercase tracking-widest">Unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={item.itemName ?? "Closet item"}
                      className="max-h-[250px] max-w-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl"
                    />
                  )}
                  <button onClick={() => handleDelete(item)} className="absolute top-4 right-4 p-2.5 bg-[#121212]/90 text-[#722F37] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-white/5 hover:bg-[#722F37] hover:text-white" title="Remove Item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.15em] mb-4 text-white">{item.itemName ?? "Untitled Item"}</h2>
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#722F37] font-bold uppercase tracking-widest">Type</span>
                      <span className="text-xs font-medium text-zinc-300 capitalize">{item.itemType || "Uncategorized"}</span>
                    </div>
                    {item.color && (
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-[9px] text-[#722F37] font-bold uppercase tracking-widest">Color</span>
                        <span className="text-xs font-medium text-zinc-300 capitalize">{item.color}</span>
                      </div>
                    )}
                  </div>

                  {item.narrativeDescription && (
                    <div className="flex flex-col mt-5">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-3.5 w-3.5 text-[#722F37] flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#722F37]">Editorial Note</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">{item.narrativeDescription}</p>
                    </div>
                  )}

                  {item.styleKeywords && item.styleKeywords.length > 0 && (
                    <div className="flex flex-col mt-6 pt-4 border-t border-white/5">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="h-3.5 w-3.5 text-[#722F37] flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#722F37]">Aesthetics</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.styleKeywords.map((keyword, i) => (
                          <span key={`${item.id}-kw-${i}`} className="bg-white/5 backdrop-blur-sm text-zinc-300 border border-white/10 text-[9px] uppercase tracking-widest px-2.5 py-1.5">
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
"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { 
  collection, query, orderBy, onSnapshot, Timestamp, 
  addDoc, serverTimestamp, doc, deleteDoc 
} from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes, deleteObject } from "firebase/storage"; 
import { Bonheur_Royale, Playfair_Display, Inter } from 'next/font/google';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import {
  Loader2, Upload, Trash2, AlertCircle, ImageOff, Wand2, FileText, Sparkles, Globe, Tag
} from "lucide-react";

import { useFirebase } from "@/firebase/provider";

const bonheur = Bonheur_Royale({ 
  subsets: ['latin'], 
  weight: ['400'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

type ClosetItem = {
  id: string;
  itemName?: string;
  itemType?: string;
  color?: string;
  narrativeDescription?: string;
  styleKeywords?: string[];
  detailedSpecifications?: string;
  generalMaterial?: string;
  designer?: string; 
  originCountry?: string;
  productUrl?: string;
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
        
        const newItem: Partial<ClosetItem> = { 
          itemName: aiFriendlyName, 
          itemType: "Uncategorized", 
          imagePath: imagePath, 
          imageUrl: imageUrl, 
          createdAt: serverTimestamp() 
        };
        
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
      <div className="flex justify-center items-center h-[85vh] bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#9A1B22]" />
      </div>
    );
  }

  const uniqueCategories = ["All", ...Array.from(new Set(items.map(item => item.itemType || "Uncategorized")))];
  const filteredItems = activeFilter === "All" ? items : items.filter(item => (item.itemType || "Uncategorized") === activeFilter);

  return (
    <div className={`container mx-auto space-y-6 pb-12 h-[85vh] overflow-y-auto scrollbar-hide bg-black text-zinc-100 ${inter.className} px-4 pt-4`}>
      
      {/* HEADER */}
      <Card className="border-0 shadow-none bg-transparent mb-4">
        <CardContent className="pt-6 px-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className={`${bonheur.className} text-7xl font-bold tracking-wide text-white`}>Digital Closet</h1>
            <p className="text-zinc-400 uppercase tracking-[0.2em] text-xs mt-2 font-medium">
              <span className="text-[#9A1B22]">●</span> {items.length} Curated Pieces
            </p>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus !== "idle"}
            className="rounded-none px-8 py-6 bg-[#9A1B22] text-white hover:bg-[#7A151B] uppercase tracking-widest text-xs transition-all shadow-lg"
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
            className={`whitespace-nowrap px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase transition-all snap-start border border-zinc-800
              ${activeFilter === category 
                ? 'bg-[#9A1B22] text-white border-[#9A1B22] shadow-md' 
                : 'bg-black text-zinc-500 hover:border-zinc-500 hover:text-white'}
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 text-white bg-[#9A1B22]/20 p-4 border border-[#9A1B22]/50">
          <AlertCircle className="h-5 w-5 text-[#9A1B22]" />
          <span className="text-sm tracking-wide">{error}</span>
        </div>
      )}

      {/* WARDROBE GRID */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#9A1B22]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredItems.map((item) => {
            const url = imageUrls[item.id];
            const isBroken = brokenImages.has(item.id);

            return (
              <div key={item.id} className="group relative bg-[#050505] border border-zinc-900 shadow-2xl hover:border-[#9A1B22]/50 transition-all duration-500 overflow-hidden flex flex-col justify-start">
                
                {/* FIX 1: Shifted aspect-square to aspect-[4/3] and reduced layout padding to collapse dead space */}
                <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden p-4 border-b border-zinc-900 shrink-0">
                  {!url || isBroken ? (
                    <div className="flex flex-col items-center justify-center text-zinc-800">
                      <ImageOff className="h-8 w-8 mb-3 opacity-50" />
                      <span className="text-[10px] uppercase tracking-widest">Unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={item.itemName ?? "Closet item"}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105 drop-shadow-2xl"
                    />
                  )}
                  <button onClick={() => handleDelete(item)} className="absolute top-4 right-4 p-2.5 bg-black/90 text-[#9A1B22] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-zinc-800 hover:bg-[#9A1B22] hover:text-white" title="Remove Item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* FIX 2: Swapped overall padding from p-8 to pt-5 px-6 pb-6 to bring textual layouts flush against the border */}
                <div className="pt-5 px-6 pb-6 flex flex-col flex-grow">
                  
                  {/* DESIGNER / ORIGIN ROW */}
                  {(item.designer || item.originCountry) && (
                    <div className="flex items-center justify-between mb-3">
                      {item.designer && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-[#9A1B22]" />
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{item.designer}</span>
                        </div>
                      )}
                      {item.originCountry && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-[#9A1B22]" />
                          <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{item.originCountry}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LUXURY SERIF TITLE */}
                  <h2 className={`${playfair.className} text-xl font-bold tracking-wide mb-4 text-white leading-tight line-clamp-2 min-h-[3.5rem]`}>
                    {item.itemName ?? "Untitled Item"}
                  </h2>

                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-900 mb-4 text-left">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Type</span>
                      <span className="text-xs font-medium text-white capitalize truncate">{item.itemType || "Uncategorized"}</span>
                    </div>
                    {item.color && (
                      <div className="flex flex-col gap-1 items-end text-right">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Color</span>
                        <span className="text-xs font-medium text-white capitalize truncate">{item.color}</span>
                      </div>
                    )}
                  </div>

                  {/* EXACT FIRESTORE METADATA MAPPING */}
                  {(item.generalMaterial || item.detailedSpecifications) && (
                    <div className="flex flex-col gap-4 mb-4">
                      {item.generalMaterial && (
                        <div>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Material</span>
                          <span className="text-xs text-white font-medium">{item.generalMaterial}</span>
                        </div>
                      )}
                      {item.detailedSpecifications && (
                        <div>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Specifications</span>
                          <span className="text-xs text-zinc-400 leading-relaxed line-clamp-3" title={item.detailedSpecifications}>{item.detailedSpecifications}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DESCRIPTION TEXT */}
                  {item.narrativeDescription && (
                    <div className="flex flex-col mt-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-3 w-3 text-[#9A1B22] flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Editorial Note</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-normal line-clamp-4">{item.narrativeDescription}</p>
                    </div>
                  )}

                  {item.styleKeywords && item.styleKeywords.length > 0 && (
                    <div className="flex flex-col mt-auto pt-4 border-t border-zinc-900">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="h-3 w-3 text-[#9A1B22] flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Aesthetics</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.styleKeywords.map((keyword, i) => (
                          <span key={`${item.id}-kw-${i}`} className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-sm">
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
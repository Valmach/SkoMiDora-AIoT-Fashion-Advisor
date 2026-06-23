"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  collection, query, orderBy, onSnapshot, Timestamp, 
  doc, deleteDoc, addDoc, serverTimestamp 
} from "firebase/firestore";
import { ref, getDownloadURL, deleteObject, uploadBytes } from "firebase/storage"; 
import { Bonheur_Royale, Playfair_Display, Inter } from 'next/font/google';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import {
  Loader2, Trash2, AlertCircle, ImageOff, FileText, Sparkles, Globe, Tag, Camera, Wand2
} from "lucide-react";

import { useFirebase } from "@/firebase/provider";

const bonheur = Bonheur_Royale({ subsets: ['latin'], weight: ['400'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

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
  brand?: string; 
  originCountry?: string;
  productUrl?: string;
  imagePath?: string;
  imageUrl?: string; 
  createdAt?: any;
};

const safeString = (val: any): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
};

function normalizeImagePath(path: string): string {
  let p = path;
  if (!p.includes("/") && !p.startsWith("http")) p = `public_wardrobe_items/${p}`;
  if (p.startsWith("public/")) p = p.replace(/^public\//, "public_wardrobe_items/");
  return p.replace(/â€“/g, "–");
}

// Helper to convert file to Base64 for Gemini Vision
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Strip the data:image/jpeg;base64, prefix
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

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
  
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    if (!firebase || !firebase.firestore) return;
    const q = query(collection(firebase.firestore, "publicWardrobeItems"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        const next: ClosetItem[] = snap.docs.map((d) => {
            const data = d.data();
            return { 
              id: d.id, 
              ...data, 
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now() 
            } as ClosetItem;
        });
        setItems(next);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setError("Failed to load metadata.");
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
        if (item.imagePath && item.imagePath.startsWith("http")) {
          setImageUrls((prev) => ({ ...prev, [item.id]: item.imagePath! }));
        } else {
          setBrokenImages((prev) => new Set(prev).add(item.id));
        }
      }
    });
  }, [items, firebase, imageUrls, brokenImages]);

  const handleUpload = useCallback(async (file: File) => {
    if (!firebase || !firebase.storage || !firebase.firestore) return;
    
    setUploadStatus("uploading");
    toast({ title: "SkoMiDora Lens Active", description: "Uploading and analyzing item..." });
    
    try {
      // 1. Upload to Firebase Storage
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
      const uniqueFileName = `${Date.now()}-${cleanFileName}`;
      const imagePath = `public_wardrobe_items/${uniqueFileName}`;
      const storageRef = ref(firebase.storage, imagePath);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Extract Base64 for Gemini
      const base64Data = await fileToBase64(file);

      // 3. Call Gemini Vision API directly
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
      if (!apiKey) throw new Error("Missing Gemini API Key");

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const promptText = `
        You are the Elite AI Concierge and Stylist for SkoMiDora.
        Analyze this image of a clothing, footwear, or accessory item.
        Extract the details and generate a rich, luxurious description following the exact JSON schema provided.
        If you cannot definitively see the brand or country of origin, make an educated guess based on the style, or output "Unknown".
      `;

      const payload = {
        contents: [
          {
            parts: [
              { text: promptText },
              { inlineData: { mimeType: file.type || "image/jpeg", data: base64Data } }
            ]
          }
        ],
        systemInstruction: { parts: [{ text: "Extract data strictly adhering to the provided JSON schema." }] },
        generationConfig: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              itemName: { type: "STRING" },
              brand: { type: "STRING" },
              color: { type: "STRING" },
              itemType: { type: "STRING", description: "Must be 'shoes', 'tops', 'bottoms', or 'accessories'" },
              originCountry: { type: "STRING" },
              detailedSpecifications: { type: "STRING" },
              narrativeDescription: { type: "STRING" },
              imageType: { type: "STRING" },
              styleKeywords: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["itemName", "itemType", "color", "narrativeDescription", "styleKeywords"]
          }
        }
      };

      const aiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const aiData = await aiResponse.json();
      
      if (!aiData.candidates || aiData.candidates.length === 0) {
        throw new Error("Gemini AI failed to process the image.");
      }

      const rawText = aiData.candidates[0].content?.parts?.[0]?.text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const extractedData = JSON.parse(cleanJson);

      // 4. Save the Enriched Data to Firestore
      const newItem: Partial<ClosetItem> = { 
        ...extractedData,
        imagePath: imagePath, 
        imageUrl: imageUrl, 
        source: 'skomidora_lens',
        createdAt: serverTimestamp() 
      };
      
      await addDoc(collection(firebase.firestore, 'publicWardrobeItems'), newItem);
      toast({ title: "Analysis Complete!", description: "Item successfully curated to your digital closet." });
      
    } catch (e: any) {
      console.error("Lens Error:", e);
      toast({ title: "Analysis failed", description: e.message || "An error occurred.", variant: "destructive" });
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
      toast({ title: "Failed to delete item", variant: "destructive" });
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
      
      <Card className="border-0 shadow-none bg-transparent mb-4">
        <CardContent className="pt-6 px-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className={`${bonheur.className} text-7xl font-bold tracking-wide text-white`}>Digital Closet</h1>
            <p className="text-zinc-400 uppercase tracking-[0.2em] text-xs mt-2 font-medium">
              <span className="text-[#9A1B22]">●</span> {items.length} Curated Pieces
            </p>
          </div>
          
          <div className="w-full md:w-auto shrink-0">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus !== "idle"}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#9A1B22] text-white hover:bg-[#7A151B] px-8 py-6 rounded-none uppercase tracking-[0.2em] text-xs font-bold transition-all shadow-lg border border-[#9A1B22]"
            >
              {uploadStatus === "idle" ? (
                <span className="flex items-center gap-2"><Camera size={16} /> SkoMiDora Lens</span>
              ) : (
                <span className="flex items-center gap-2"><Wand2 size={16} className="animate-spin" /> Analyzing Item...</span>
              )}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide w-full snap-x">
        {uniqueCategories.map((category) => (
          <button
            key={safeString(category)}
            onClick={() => setActiveFilter(safeString(category))}
            className={`whitespace-nowrap px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase transition-all snap-start border border-zinc-800
              ${activeFilter === category 
                ? 'bg-[#9A1B22] text-white border-[#9A1B22] shadow-md' 
                : 'bg-black text-zinc-500 hover:border-zinc-500 hover:text-white'}
            `}
          >
            {safeString(category)}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 text-white bg-[#9A1B22]/20 p-4 border border-[#9A1B22]/50">
          <AlertCircle className="h-5 w-5 text-[#9A1B22]" />
          <span className="text-sm tracking-wide">{safeString(error)}</span>
        </div>
      )}

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
                
                <div className="relative aspect-[3/2] w-full bg-black flex items-center justify-center overflow-hidden p-3 border-b border-zinc-900 shrink-0">
                  {!url || isBroken ? (
                    <div className="flex flex-col items-center justify-center text-zinc-800">
                      <ImageOff className="h-6 w-6 mb-2 opacity-50" />
                      <span className="text-[10px] uppercase tracking-widest">Unavailable</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={safeString(item.itemName) || "Item"}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-103 drop-shadow-2xl"
                    />
                  )}
                  <button onClick={() => handleDelete(item)} className="absolute top-3 right-3 p-2 bg-black/90 text-[#9A1B22] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-zinc-800 hover:bg-[#9A1B22] hover:text-white" title="Remove item">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="pt-4 px-5 pb-5 flex flex-col flex-grow">
                  
                  {(item.designer || item.originCountry || item.brand) && (
                    <div className="flex items-center justify-between mb-2">
                      {(item.designer || item.brand) && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-2.5 w-2.5 text-[#9A1B22]" />
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{safeString(item.designer || item.brand)}</span>
                        </div>
                      )}
                      {item.originCountry && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-2.5 w-2.5 text-[#9A1B22]" />
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{safeString(item.originCountry)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <h2 className={`${playfair.className} text-xl font-bold tracking-wide mb-3 text-white leading-tight line-clamp-2 min-h-[2.75rem]`}>
                    {safeString(item.itemName) || "Untitled item"}
                  </h2>

                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-900/50 mb-3 text-left">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Type</span>
                      <span className="text-xs font-medium text-zinc-300 capitalize truncate">{safeString(item.itemType) || "Uncategorized"}</span>
                    </div>
                    {item.color && (
                      <div className="flex flex-col gap-0.5 items-end text-right">
                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Color</span>
                        <span className="text-xs font-medium text-zinc-300 capitalize truncate">{safeString(item.color)}</span>
                      </div>
                    )}
                  </div>

                  {(item.generalMaterial || item.detailedSpecifications) && (
                    <div className="flex flex-col gap-3 mb-3">
                      {item.generalMaterial && (
                        <div>
                          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest block mb-0.5">Material</span>
                          <span className="text-xs text-zinc-300 font-medium">{safeString(item.generalMaterial)}</span>
                        </div>
                      )}
                      {item.detailedSpecifications && (
                        <div>
                          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest block mb-0.5">Specifications</span>
                          <span className="text-xs text-zinc-400 leading-relaxed line-clamp-2" title={safeString(item.detailedSpecifications)}>{safeString(item.detailedSpecifications)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {item.narrativeDescription && (
                    <div className="flex flex-col mt-0.5">
                      <div className="flex items-center space-x-1.5 mb-1.5">
                        <FileText className="h-3 w-3 text-[#9A1B22]" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Editorial Note</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed font-normal line-clamp-3">{safeString(item.narrativeDescription)}</p>
                    </div>
                  )}

                  {Array.isArray(item.styleKeywords) && item.styleKeywords.length > 0 && (
                    <div className="flex flex-col mt-auto pt-3 border-t border-zinc-900">
                      <div className="flex items-center space-x-1.5 mb-2">
                        <Sparkles className="h-3 w-3 text-[#9A1B22]" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Aesthetics</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.styleKeywords.map((keyword, i) => (
                          <span key={`${item.id}-kw-${i}`} className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm">
                            {safeString(keyword)}
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
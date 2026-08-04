"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Bonheur_Royale, Playfair_Display, Inter } from "next/font/google";
import { ImageOff, Loader2, ZoomIn, X, Sparkles, Upload } from "lucide-react";

import { useFirebase } from "@/firebase/provider";

const bonheur = Bonheur_Royale({ subsets: ["latin"], weight: ["400"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

type FashionItem = {
  id: string;
  itemName?: string;
  designerName?: string;
  category?: string;
  color?: string;
  material?: string;
  story?: string;
  priceEstimateLow?: number | null;
  priceEstimateHigh?: number | null;
  priceConfidence?: string;
  priceReasoning?: string;
  imageUrl?: string;
  aiAnalyzed?: boolean;
};

function formatPrice(item: FashionItem): string {
  const { priceEstimateLow, priceEstimateHigh } = item;
  if (
    typeof priceEstimateLow !== "number" ||
    typeof priceEstimateHigh !== "number"
  ) {
    return "Price pending";
  }
  if (priceEstimateLow === priceEstimateHigh) {
    return `$${priceEstimateLow.toLocaleString()}`;
  }
  return `$${priceEstimateLow.toLocaleString()} - $${priceEstimateHigh.toLocaleString()}`;
}

export default function SkoMiDoraFashionPage() {
  const firebase = useFirebase();
  const [items, setItems] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/skomidora-fashion-upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!firebase || !firebase.firestore) return;

    const q = query(
      collection(firebase.firestore, "skomidoraFashionItems"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: import("firebase/firestore").QuerySnapshot) => {
        const discovered: FashionItem[] = snapshot.docs.map(
          (doc: import("firebase/firestore").QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
          }),
        );
        setItems(discovered);
        setLoading(false);
      },
      (error: unknown) => {
        console.error(
          "[skomidora-fashion] Failed to load fashion items:",
          error,
        );
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const categories = [
    "ALL",
    ...Array.from(
      new Set(items.map((item: FashionItem) => item.category || "Uncategorized")),
    ),
  ];

  const filteredItems =
    activeCategory === "ALL"
      ? items
      : items.filter(
          (item: FashionItem) => (item.category || "Uncategorized") === activeCategory,
        );

  return (
    <div
      className={`container mx-auto space-y-6 pb-12 h-[85vh] overflow-y-auto scrollbar-hide bg-black text-zinc-100 ${inter.className} px-4 pt-4 relative`}
    >
      {/* Header */}
      <div className="flex flex-col mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1
            className={`${bonheur.className} text-7xl font-bold tracking-wide text-white`}
          >
            SkoMiDora Fashion
          </h1>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase bg-[#9A1B22] text-white hover:bg-[#7a1519] transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload Piece
                </>
              )}
            </button>
          </div>
        </div>
        {uploadError && (
          <p className="text-red-400 text-xs mt-2">{uploadError}</p>
        )}
        <p className="text-zinc-400 uppercase tracking-[0.2em] text-xs mt-2 font-medium">
          <span className="text-[#9A1B22]">●</span> {filteredItems.length}{" "}
          Pieces in Collection
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide w-full snap-x">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase transition-all border border-zinc-800
              ${
                activeCategory === cat
                  ? "bg-[#9A1B22] text-white border-[#9A1B22] shadow-md"
                  : "bg-black text-zinc-500 hover:border-zinc-500 hover:text-white"
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Fashion
          Collection...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <ImageOff className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-xs uppercase tracking-widest">
            No fashion items uploaded yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredItems.map((item: FashionItem) => (
            <div
              key={item.id}
              className="group relative bg-[#050505] border border-zinc-900 shadow-2xl hover:border-[#9A1B22]/50 transition-all duration-500 overflow-hidden flex flex-col justify-between"
            >
              {/* Image */}
              <div
                className="relative aspect-[3/2] w-full bg-black flex items-center justify-center overflow-hidden p-1 border-b border-zinc-900 cursor-zoom-in shrink-0"
                onClick={() =>
                  item.imageUrl && setZoomedImage(item.imageUrl)
                }
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.itemName || "Fashion item"}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-700">
                    <ImageOff className="h-8 w-8 mb-2 opacity-40" />
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                      Image Pending
                    </span>
                  </div>
                )}

                {item.aiAnalyzed && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/80 border border-zinc-800 text-[8px] uppercase tracking-widest text-zinc-400 pointer-events-none">
                    <Sparkles className="w-2.5 h-2.5 text-[#9A1B22]" /> AI
                    Analyzed
                  </div>
                )}

                <button
                  className="absolute top-2 right-2 p-1.5 bg-black/70 border border-zinc-800 text-zinc-400 hover:text-white hover:border-[#9A1B22] transition-all rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Details */}
              <div className="p-5 flex flex-col justify-between flex-grow">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                    {item.designerName && item.designerName !== "Unknown"
                      ? item.designerName
                      : item.category || "Uncategorized"}
                  </span>
                  <h2
                    className={`${playfair.className} text-xl font-bold tracking-wide text-white mb-2`}
                  >
                    {item.itemName || "Untitled Piece"}
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal line-clamp-3 mb-4">
                    {item.story}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white tracking-wider">
                      {formatPrice(item)}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-[#9A1B22]" />
                      AI Estimate
                    </span>
                  </div>
                  {item.priceReasoning && (
                    <p className="text-[10px] text-zinc-600 mt-1 italic">
                      {item.priceReasoning}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zoom / Lightbox Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-[#9A1B22] transition-all rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={zoomedImage}
              alt="Zoomed Fashion Item"
              className="max-w-full max-h-[85vh] object-contain border border-zinc-800 shadow-2xl scale-125 transition-transform duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
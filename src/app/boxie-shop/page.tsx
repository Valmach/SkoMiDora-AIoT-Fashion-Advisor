"use client";

import React, { useState, useEffect } from "react";
import { Bonheur_Royale, Playfair_Display, Inter } from "next/font/google";
import { ImageOff, Loader2 } from "lucide-react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}
const storage = getStorage();

const bonheur = Bonheur_Royale({ subsets: ["latin"], weight: ["400"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

type BoxieProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  keyword: string;
  status: string;
};

const PRODUCTS_TEMPLATE: BoxieProduct[] = [
  {
    id: "meurte-boxies",
    name: "Meurte Boxies",
    category: "COLLECTOR EDITION",
    price: "$179.00",
    description: "Deep red wave-pattern wraparound design, rendered in SketchUp + KeyShot Pro.",
    keyword: "meurte",
    status: "COMING SOON",
  },
  {
    id: "limited-edition-skoboxie",
    name: "Limited Edition SkoBoxie",
    category: "LIMITED EDITION",
    price: "$229.00",
    description: "Inspired by great minds and sustainability, these precision-crafted Boxies blend innovative design with eco-friendly materials.",
    keyword: "limit",
    status: "COMING SOON",
  },
  {
    id: "k-pop-boxies",
    name: "K-Pop Boxies",
    category: "COLLECTOR EDITION",
    price: "$179.00",
    description: "Holographic K-Pop fan-edition wraparound design.",
    keyword: "k-pop",
    status: "COMING SOON",
  },
  {
    id: "bird-boxies",
    name: "Bird Boxies",
    category: "COLLECTOR EDITION",
    price: "$179.00",
    description: "Vivid tropical bird wraparound artwork, rendered in SketchUp + KeyShot Pro.",
    keyword: "bird",
    status: "COMING SOON",
  },
];

export default function BoxieShopPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [products, setProducts] = useState<(BoxieProduct & { resolvedImageUrl?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndMatchBucketAssets() {
      try {
        const productsRef = ref(storage, "products");
        const res = await listAll(productsRef);

        const allFiles: { fullPath: string; url: string }[] = [];

        // Check files directly in products/
        for (const itemRef of res.items) {
          const url = await getDownloadURL(itemRef);
          allFiles.push({ fullPath: itemRef.fullPath.toLowerCase(), url });
        }

        // Check files inside sub-folders/prefixes
        for (const prefixRef of res.prefixes) {
          const subRes = await listAll(prefixRef);
          for (const subItemRef of subRes.items) {
            const url = await getDownloadURL(subItemRef);
            allFiles.push({ fullPath: subItemRef.fullPath.toLowerCase(), url });
          }
        }

        // Match template products to discovered storage items dynamically
        const matched = PRODUCTS_TEMPLATE.map((product) => {
          const found = allFiles.find((f) => f.fullPath.includes(product.keyword));
          return {
            ...product,
            resolvedImageUrl: found ? found.url : undefined,
          };
        });

        setProducts(matched);
      } catch (err) {
        console.error("Error inspecting storage bucket:", err);
        setProducts(PRODUCTS_TEMPLATE);
      } finally {
        setLoading(false);
      }
    }

    fetchAndMatchBucketAssets();
  }, []);

  const categories = ["ALL", "CLASSIC", "COLLECTOR EDITION", "LIMITED EDITION", "TRAVEL"];

  const filteredProducts = activeCategory === "ALL"
    ? products
    : products.filter(
        (p) => p.category.toUpperCase() === activeCategory
      );

  return (
    <div className={`container mx-auto space-y-6 pb-12 h-[85vh] overflow-y-auto scrollbar-hide bg-black text-zinc-100 ${inter.className} px-4 pt-4`}>
      {/* Header */}
      <div className="flex flex-col mb-4">
        <h1 className={`${bonheur.className} text-7xl font-bold tracking-wide text-white`}>
          SkoBoxies Shop
        </h1>
        <p className="text-zinc-400 uppercase tracking-[0.2em] text-xs mt-2 font-medium">
          <span className="text-[#9A1B22]">●</span> {filteredProducts.length} Available
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
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Scanning Storage Bucket...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group relative bg-[#050505] border border-zinc-900 shadow-2xl hover:border-[#9A1B22]/50 transition-all duration-500 overflow-hidden flex flex-col justify-between"
            >
              <div className="relative aspect-[3/2] w-full bg-black flex items-center justify-center overflow-hidden p-1 border-b border-zinc-900 shrink-0">
                {product.resolvedImageUrl ? (
                  <img
                    src={product.resolvedImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-700">
                    <ImageOff className="h-8 w-8 mb-2 opacity-40" />
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">Asset Pending</span>
                  </div>
                )}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 border border-zinc-800 text-[8px] uppercase tracking-widest text-zinc-400">
                  360° Hover to Spin
                </span>
              </div>

              <div className="p-5 flex flex-col justify-between flex-grow">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                    {product.category}
                  </span>
                  <h2 className={`${playfair.className} text-xl font-bold tracking-wide text-white mb-2`}>
                    {product.name}
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal line-clamp-2 mb-4">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                  <span className="text-sm font-bold text-white tracking-wider">
                    {product.price}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    {product.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
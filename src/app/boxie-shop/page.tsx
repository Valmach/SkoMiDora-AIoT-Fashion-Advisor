"use client";

import React, { useState } from "react";
import { Bonheur_Royale, Playfair_Display, Inter } from "next/font/google";

const bonheur = Bonheur_Royale({ subsets: ["latin"], weight: ["400"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

// Filter out placeholder sample boxes and keep only published SkoBoxies with active media
const SKOBOXIE_PRODUCTS = [
  {
    id: "meurte-boxies",
    name: "Meurte Boxies",
    category: "Collector Edition",
    price: "$179.00",
    description: "Deep red wave-pattern wraparound design, rendered in SketchUp + KeyShot Pro.",
    imageUrl: "/images/meurte-boxie.jpg", // Replace with your exact asset path
    isSample: false,
    status: "COMING SOON",
  },
  {
    id: "limited-edition-skoboxie",
    name: "Limited Edition SkoBoxie",
    category: "Limited Edition",
    price: "$229.00",
    description: "Inspired by great minds and sustainability, these precision-crafted Boxies blend innovative design with eco-friendly materials.",
    imageUrl: "/images/limited-skoboxie.jpg", // Replace with your exact asset path
    isSample: false,
    status: "COMING SOON",
  },
  {
    id: "k-pop-boxies",
    name: "K-Pop Boxies",
    category: "Collector Edition",
    price: "$179.00",
    description: "Holographic K-Pop fan-edition wraparound design.",
    imageUrl: "/images/kpop-boxie.jpg", // Replace with your exact asset path
    isSample: false,
    status: "COMING SOON",
  },
  {
    id: "bird-boxies",
    name: "Bird Boxies",
    category: "Collector Edition",
    price: "$179.00",
    description: "Vivid tropical bird wraparound artwork, rendered in SketchUp + KeyShot Pro.",
    imageUrl: "/images/bird-boxie.jpg", // Replace with your exact asset path
    isSample: false,
    status: "COMING SOON",
  },
];

export default function BoxieShopPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");

  const categories = ["ALL", "CLASSIC", "COLLECTOR EDITION", "LIMITED EDITION", "TRAVEL"];

  const filteredProducts = activeCategory === "ALL"
    ? SKOBOXIE_PRODUCTS
    : SKOBOXIE_PRODUCTS.filter(
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

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="group relative bg-[#050505] border border-zinc-900 shadow-2xl hover:border-[#9A1B22]/50 transition-all duration-500 overflow-hidden flex flex-col justify-between"
          >
            <div className="relative aspect-[3/2] w-full bg-black flex items-center justify-center overflow-hidden p-1 border-b border-zinc-900 shrink-0">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
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
    </div>
  );
}
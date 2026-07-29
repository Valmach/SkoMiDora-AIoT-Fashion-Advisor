"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { Bonheur_Royale, Inter } from "next/font/google";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, PackageSearch, ShoppingBag } from "lucide-react";

import { useFirebase } from "@/firebase/provider";
import { formatPrice, type Product } from "@/lib/products";
import { ProductSpinImage } from "@/components/ProductSpinImage";

const bonheur = Bonheur_Royale({ subsets: ["latin"], weight: ["400"] });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

const safeString = (val: unknown): string => {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return "";
};

export default function ShopPage() {
  const firebase = useFirebase();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinct from "no products found" - this app's own roadmap calls out
  // collapsing failure and emptiness into the same state as a real problem.
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    if (!firebase || !firebase.firestore) return;

    const q = query(
      collection(firebase.firestore, "products"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Product[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toMillis()
                  : data.createdAt ?? null,
            } as Product;
          })
          .filter((p) => p.status !== "draft" && p.status !== "archived");

        setProducts(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Shop] Failed to load products:", err);
        setError("Unable to load the shop right now. Please try again shortly.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firebase]);

  if (!firebase) {
    return (
      <div className="flex justify-center items-center h-[85vh] bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#9A1B22]" />
      </div>
    );
  }

  const categories = new Set(products.map((p) => p.category).filter(Boolean));
  const uniqueCategories = ["All", ...Array.from(categories).sort()];

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div
      className={`container mx-auto space-y-6 pb-12 h-[85vh] overflow-y-auto scrollbar-hide bg-black text-zinc-100 ${inter.className} px-4 pt-4`}
    >
      <Card className="border-0 shadow-none bg-transparent mb-4">
        <CardContent className="pt-6 px-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className={`${bonheur.className} text-7xl font-bold tracking-wide text-white`}>
              SkoBoxies Shop
            </h1>
            <p className="text-zinc-400 uppercase tracking-[0.2em] text-xs mt-2 font-medium">
              <span className="text-[#9A1B22]">●</span> {products.length} Available
            </p>
          </div>
        </CardContent>
      </Card>

      {uniqueCategories.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide w-full snap-x">
          {uniqueCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-6 py-3 text-xs font-semibold tracking-[0.15em] uppercase transition-all snap-start border border-zinc-800
                ${
                  activeCategory === category
                    ? "bg-[#9A1B22] text-white border-[#9A1B22] shadow-md"
                    : "bg-black text-zinc-500 hover:border-zinc-500 hover:text-white"
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 text-white bg-[#9A1B22]/20 p-4 border border-[#9A1B22]/50">
          <AlertCircle className="h-5 w-5 text-[#9A1B22]" />
          <span className="text-sm tracking-wide">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#9A1B22]" />
        </div>
      ) : !error && products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600 gap-3">
          <PackageSearch className="h-10 w-10 opacity-50" />
          <p className="text-sm uppercase tracking-[0.2em]">No SkoBoxies listed yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group relative bg-[#050505] border border-zinc-900 shadow-2xl hover:border-[#9A1B22]/50 transition-all duration-500 overflow-hidden flex flex-col justify-start"
            >
              <div className="relative aspect-[3/2] w-full bg-black flex items-center justify-center overflow-hidden p-3 border-b border-zinc-900 shrink-0">
                <ProductSpinImage
                  imageUrl={product.imageUrl}
                  images={product.images}
                  alt={safeString(product.name) || "SkoBoxy"}
                />

                {product.isMock && (
                  <span className="absolute top-3 left-3 px-2 py-1 bg-black/90 border border-zinc-700 text-[9px] uppercase tracking-widest text-zinc-400">
                    Sample
                  </span>
                )}
              </div>

              <div className="pt-4 px-5 pb-5 flex flex-col flex-grow gap-2">
                {product.category && (
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    {safeString(product.category)}
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white leading-snug">
                  {safeString(product.name)}
                </h3>

                {product.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {safeString(product.description)}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-900">
                  <span className="text-sm font-semibold text-zinc-100">
                    {formatPrice(product.priceCents, product.currency)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-600">
                    <ShoppingBag className="h-3 w-3" />
                    Coming soon
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

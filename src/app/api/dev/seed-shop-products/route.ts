import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fixed IDs so re-running this is idempotent (upserts, never duplicates).
// Names are intentionally generic - no third-party brand/character names -
// pending the licensing conversation flagged separately.
const SAMPLE_PRODUCTS = [
  {
    id: "sample-classic-black",
    name: "Classic Black SkoBoxy",
    slug: "classic-black-skoboxy",
    description:
      "The standard-issue smart shoebox. Humidity and temperature tracking, RFID/NFC ready.",
    priceCents: 14900,
    currency: "USD",
    category: "Classic",
    imageUrl: "",
    status: "active" as const,
    sku: "SKD-CLS-BLK",
    isMock: true,
  },
  {
    id: "sample-walnut-signature",
    name: "Signature Walnut SkoBoxy",
    slug: "signature-walnut-skoboxy",
    description: "Wood-finish enclosure for the everyday designer footwear collector.",
    priceCents: 19900,
    currency: "USD",
    category: "Collector Edition",
    imageUrl: "",
    status: "active" as const,
    sku: "SKD-COL-WAL",
    isMock: true,
  },
  {
    id: "sample-collector-clearfront",
    name: "Collector Edition SkoBoxy - Clear Front",
    slug: "collector-clear-front-skoboxy",
    description: "UV-safe clear-front display box for sneaker and rare-footwear collectors.",
    priceCents: 24900,
    currency: "USD",
    category: "Collector Edition",
    imageUrl: "",
    status: "active" as const,
    sku: "SKD-COL-CLR",
    isMock: true,
  },
  {
    id: "sample-travel-node",
    name: "SkoBoxy Transit Node",
    slug: "skoboxy-transit-node",
    description: "Ruggedized version built for travel and B2B logistics use cases.",
    priceCents: 34900,
    currency: "USD",
    category: "Travel",
    imageUrl: "",
    status: "active" as const,
    sku: "SKD-TRV-NDE",
    isMock: true,
  },
  {
    id: "bird-boxies",
    name: "Bird Boxies",
    slug: "bird-boxies",
    description: "Vivid tropical bird wraparound artwork, rendered in SketchUp + KeyShot Pro.",
    priceCents: 17900,
    currency: "USD",
    category: "Collector Edition",
    imageUrl:
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/birdboxies.jpg",
    images: [
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/bird-boxies/Birdboxie%20front.jpg",
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/bird-boxies/birdboxie_top_right.png",
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/bird-boxies/birdboxie_top_left.png",
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/bird-boxies/Birdboxieback_side.jpg",
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/bird-boxies/Birdboxie%20_top_front.jpg",
    ],
    status: "active" as const,
    sku: "SKD-ART-BRD",
    isMock: true,
  },
  {
    id: "kpop-boxies",
    name: "K-Pop Boxies",
    slug: "kpop-boxies",
    description: "Holographic K-Pop fan-edition wraparound design.",
    priceCents: 17900,
    currency: "USD",
    category: "Collector Edition",
    imageUrl:
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/kpop.png",
    images: [
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/k-pop/k-pop-front_top.png",
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/k-pop/k-pop-lf.jpg",
    ],
    status: "active" as const,
    sku: "SKD-ART-KPP",
    isMock: true,
  },
  {
    id: "meurte-boxies",
    name: "Meurte Boxies",
    slug: "meurte-boxies",
    description: "Deep red wave-pattern wraparound design, rendered in SketchUp + KeyShot Pro.",
    priceCents: 17900,
    currency: "USD",
    category: "Collector Edition",
    imageUrl:
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/meurte-boxies/meurte_ffouri.jpg",
    images: [
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/meurte-boxies/meurte_ffouri.jpg",
      "https://storage.googleapis.com/styleai-footwear.firebasestorage.app/products/meurte-boxies/meurte_imme_back.jpg",
    ],
    status: "active" as const,
    sku: "SKD-ART-MRT",
    isMock: true,
  },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Seed route is disabled in production." },
      { status: 403 }
    );
  }

  try {
    const batch = adminDb.batch();

    for (const product of SAMPLE_PRODUCTS) {
      const { id, ...data } = product;
      const ref = adminDb.collection("products").doc(id);
      batch.set(
        ref,
        { ...data, createdAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      seeded: SAMPLE_PRODUCTS.length,
      productIds: SAMPLE_PRODUCTS.map((p) => p.id),
    });
  } catch (error: any) {
    console.error("Seed shop products error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Seeding failed." },
      { status: 500 }
    );
  }
}

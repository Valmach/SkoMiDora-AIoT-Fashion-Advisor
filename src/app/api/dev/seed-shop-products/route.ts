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

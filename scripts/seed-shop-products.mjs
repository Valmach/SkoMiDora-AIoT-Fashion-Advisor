// One-off/reusable seed script for the SkoBoxy shop's 'products' Firestore
// collection. Run from Firebase Studio's terminal (or anywhere with working
// Application Default Credentials for this project):
//
//   node scripts/seed-shop-products.mjs
//
// Idempotent - uses fixed doc IDs, so re-running upserts rather than
// duplicating. Names are intentionally generic (no third-party brand or
// character names) pending the licensing conversation. This mirrors
// src/app/api/dev/seed-shop-products/route.ts, which stays blocked in
// production and can't be used against the live deployment.

import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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
    status: "active",
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
    status: "active",
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
    status: "active",
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
    status: "active",
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
    status: "active",
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
    status: "active",
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
    status: "active",
    sku: "SKD-ART-MRT",
    isMock: true,
  },
  {
    id: "limited-edition-skoboxie",
    name: "Limited Edition SkoBoxie",
    slug: "limited-edition-skoboxie",
    description:
      "Inspired by great minds and sustainability, these precision-crafted Boxies blend innovative design with eco-friendly materials. Available only at SkoMiDora.",
    priceCents: 22900,
    currency: "USD",
    category: "Limited Edition",
    imageUrl: "",
    status: "active",
    sku: "SKD-LTD-001",
    isMock: true,
  },
];

async function main() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      "Removing GOOGLE_APPLICATION_CREDENTIALS to use Firebase Studio managed credentials."
    );
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "styleai-footwear",
    });
  }

  const db = getFirestore();
  const batch = db.batch();

  for (const product of SAMPLE_PRODUCTS) {
    const { id, ...data } = product;
    const ref = db.collection("products").doc(id);
    batch.set(ref, { ...data, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  await batch.commit();

  console.log(`Seeded ${SAMPLE_PRODUCTS.length} products:`);
  SAMPLE_PRODUCTS.forEach((p) => console.log(`  - ${p.id}: ${p.name}`));
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

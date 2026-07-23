import { NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp();
  }

  return getFirestore();
}

function normalizeValue(value: any): any {
  if (!value) return value;

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeValue(nestedValue),
      ])
    );
  }

  return value;
}

export async function GET() {
  try {
    const db = getAdminDb();

    const snapshot = await db
      .collection("publicWardrobeItems")
      .limit(150)
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...normalizeValue(doc.data()),
    }));

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error("Failed to load public wardrobe items:", error);

    return NextResponse.json(
      {
        error: "Failed to load public wardrobe items",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

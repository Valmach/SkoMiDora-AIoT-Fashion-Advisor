import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function GET() {
  try {
    // FIX: The '!' forces the strict builder to accept that db exists.
    const snapshot = await db!.collection("shoeboxes").get();

    const shoeboxes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ shoeboxes });
  } catch (error) {
    console.error("Error fetching shoeboxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch shoeboxes" },
      { status: 500 }
    );
  }
}
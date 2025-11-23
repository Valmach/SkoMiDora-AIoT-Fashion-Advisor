import { getAdmin } from "@/lib/firebase-admin-loader";
// app/api/user/shoeboxes/route.ts
import { NextResponse } from "next/server";


export const runtime = 'nodejs'; // Ensure this runs in a Node.js environment

export async function GET() {
  try {
    const shoeboxesRef = admin.firestore().collection("shoeboxes");
    const snapshot = await shoeboxesRef.get();

    const shoeboxes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(shoeboxes);
  } catch (error: any) {
    console.error("Error fetching shoeboxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch shoeboxes" },
      { status: 500 },
    );
  }
}

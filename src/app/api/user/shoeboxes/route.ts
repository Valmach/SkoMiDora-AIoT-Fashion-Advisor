// 🛡️ FIX: Import 'db' directly from your admin library
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 🏆 The 'db' is already initialized and exported as a singleton
    // No need to call getAdmin() anymore
    const snapshot = await db.collection("shoeboxes").get();
    
    const shoeboxes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return Response.json({ shoeboxes });
  } catch (e: any) {
    console.error("Shoebox API Error:", e);
    return Response.json(
      { error: e?.message ?? "Failed to fetch shoeboxes from Smart Shoebox hardware" },
      { status: 500 }
    );
  }
}
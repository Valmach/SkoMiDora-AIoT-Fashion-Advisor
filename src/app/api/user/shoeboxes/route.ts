import { db } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await db.collection("shoeboxes").get();
    const shoeboxes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return Response.json({ shoeboxes });
  } catch (e: any) {
    return Response.json(
      { error: e.message ?? "Failed to fetch shoeboxes" },
      { status: 500 }
    );
  }
}

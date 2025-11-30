import { getAdmin } from "@/lib/firebase-admin-loader";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getAdmin();
    const db = admin.firestore();
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

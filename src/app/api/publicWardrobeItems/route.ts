import { getAdmin } from "@/lib/firebase-admin-loader";
import { NextResponse } from "next/server";

export const runtime = 'nodejs'; // Ensure this runs in a Node.js environment
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const admin = await getAdmin();
        const db = admin.firestore();
        const snapshot = await db.collection("publicWardrobeItems").orderBy("createdAt", "desc").get();

        const items = snapshot.docs.map((doc: { id: any; data: () => any; }) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching public wardrobe items:", error);
        return NextResponse.json(
            { error: "Failed to fetch public wardrobe items" },
            { status: 500 },
        );
    }
}
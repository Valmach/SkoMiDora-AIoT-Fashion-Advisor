import { getAdmin } from "@/lib/firebase-admin-loader";
import { NextResponse } from "next/server";
// REMOVED: 

export const runtime = 'nodejs'; // Ensure this runs in a Node.js environment

export async function GET() {
    try {
        // FIX: Import the Admin DB inside the function scope to defer loading
        //      This prevents the Next.js build process from crashing.
        const admin = await getAdmin();

        const snapshot = await admin.firestore().collection("publicWardrobeItems").orderBy("createdAt", "desc").get();

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
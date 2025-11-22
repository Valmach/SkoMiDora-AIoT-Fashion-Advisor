import { NextResponse } from "next/server";
// REMOVED: import { db as adminDB } from "@/lib/firebase-admin";

export const runtime = 'nodejs'; // Ensure this runs in a Node.js environment

export async function GET() {
    try {
        // FIX: Import the Admin DB inside the function scope to defer loading
        //      This prevents the Next.js build process from crashing.
        const { db: adminDB } = await import("@/lib/firebase-admin");

        const snapshot = await adminDB.collection("publicWardrobeItems").orderBy("createdAt", "desc").get();

        const items = snapshot.docs.map((doc) => ({
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
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  FirebaseBearerAuthError,
  requireFirebaseUser,
} from "@/lib/server/require-firebase-user";
import { OutfitFeedbackRecordSchema } from "@/types/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Records a single outfit-feedback event (accepted / rejected / modified /
// worn) against the outfitFeedback Firestore collection. This is the entity
// the roadmap's AI evaluation suite depends on for acceptance/modification/
// wear-rate tracking. Writes go through the Admin SDK, same as every other
// non-public collection in this app (see firestore.rules — everything but
// publicWardrobeItems/products denies client access by default).
export async function POST(request: Request) {
  try {
    const firebaseUser = await requireFirebaseUser(request);

    const body = await request.json().catch(() => null);
    const parsed = OutfitFeedbackRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid outfit feedback payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { outfitId, itemIds, action, eventName, eventLocation, notes } =
      parsed.data;

    const docRef = await adminDb.collection("outfitFeedback").add({
      userId: firebaseUser.uid,
      outfitId,
      itemIds,
      action,
      eventName: eventName ?? null,
      eventLocation: eventLocation ?? null,
      notes: notes ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    if (error instanceof FirebaseBearerAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(
      "Failed to record outfit feedback:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Unable to record outfit feedback." },
      { status: 500 },
    );
  }
}

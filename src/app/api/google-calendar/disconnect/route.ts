import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  FirebaseBearerAuthError,
  requireFirebaseUser,
} from "@/lib/server/require-firebase-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
) {
  try {
    const firebaseUser =
      await requireFirebaseUser(request);

    await adminDb
      .doc(
        `users/${firebaseUser.uid}/integrations/googleCalendar`,
      )
      .delete();

    return NextResponse.json(
      {
        connected: false,
        message:
          "Google Calendar disconnected.",
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof
      FirebaseBearerAuthError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(
      "Google Calendar disconnect failed:",
      error instanceof Error
        ? error.message
        : "Unknown disconnect error",
    );

    return NextResponse.json(
      {
        error:
          "Unable to disconnect Google Calendar.",
      },
      { status: 500 },
    );
  }
}

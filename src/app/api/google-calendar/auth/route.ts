import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { google } from "googleapis";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  CALENDAR_READONLY_SCOPE,
  createSignedOAuthState,
  GoogleCalendarConfigError,
  requireEnvironmentVariable,
} from "@/lib/server/google-calendar-oauth";
import {
  FirebaseBearerAuthError,
  requireFirebaseUser,
} from "@/lib/server/require-firebase-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const firebaseUser =
      await requireFirebaseUser(request);

    const clientId =
      requireEnvironmentVariable(
        "GOOGLE_CLIENT_ID",
      );

    const clientSecret =
      requireEnvironmentVariable(
        "GOOGLE_CLIENT_SECRET",
      );

    const redirectUri =
      requireEnvironmentVariable(
        "GOOGLE_CALENDAR_REDIRECT_URI",
      );

    const oauth2Client =
      new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );

    const { state, payload } =
      createSignedOAuthState(
        firebaseUser.uid,
        clientSecret,
      );

    await adminDb
      .collection("oauthStates")
      .doc(payload.nonce)
      .set({
        uid: payload.uid,
        provider: "googleCalendar",
        expiresAt: Timestamp.fromMillis(
          payload.expiresAt,
        ),
        createdAt:
          FieldValue.serverTimestamp(),
        consumedAt: null,
      });

    const authUrl =
      oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: [
          CALENDAR_READONLY_SCOPE,
        ],
        state,
      });

    return NextResponse.json(
      { authUrl },
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

    if (
      error instanceof
      GoogleCalendarConfigError
    ) {
      console.warn(
        "Google Calendar OAuth configuration is incomplete:",
        error.message,
      );

      return NextResponse.json(
        {
          error:
            "Google Calendar integration is not configured.",
        },
        { status: 503 },
      );
    }

    console.error(
      "Google Calendar authorization failed:",
      error instanceof Error
        ? error.message
        : "Unknown authorization error",
    );

    return NextResponse.json(
      {
        error:
          "Unable to start Google Calendar authorization.",
      },
      { status: 500 },
    );
  }
}

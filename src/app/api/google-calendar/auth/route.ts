import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { google } from "googleapis";

import {
  FirebaseBearerAuthError,
  requireFirebaseUser,
} from "@/lib/server/require-firebase-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

class GoogleCalendarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarConfigError";
  }
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new GoogleCalendarConfigError(
      `${name} is not configured.`,
    );
  }

  return value;
}

function createSignedOAuthState(
  uid: string,
  signingSecret: string,
): string {
  const payload = {
    uid,
    nonce: randomUUID(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  const signature = createHmac("sha256", signingSecret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export async function GET(request: Request) {
  try {
    const firebaseUser = await requireFirebaseUser(request);

    const clientId = requireEnvironmentVariable(
      "GOOGLE_CLIENT_ID",
    );
    const clientSecret = requireEnvironmentVariable(
      "GOOGLE_CLIENT_SECRET",
    );
    const redirectUri = requireEnvironmentVariable(
      "GOOGLE_CALENDAR_REDIRECT_URI",
    );

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    const state = createSignedOAuthState(
      firebaseUser.uid,
      clientSecret,
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: [CALENDAR_READONLY_SCOPE],
      state,
    });

    return NextResponse.json({
      authUrl,
    });
  } catch (error) {
    if (error instanceof FirebaseBearerAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof GoogleCalendarConfigError) {
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

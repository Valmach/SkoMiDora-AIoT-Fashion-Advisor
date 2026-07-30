import {
  FieldValue,
} from "firebase-admin/firestore";
import { google } from "googleapis";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  CALENDAR_READONLY_SCOPE,
  encryptGoogleOAuthCredentials,
  GoogleCalendarConfigError,
  requireEnvironmentVariable,
  verifySignedOAuthState,
} from "@/lib/server/google-calendar-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToEvents(
  request: Request,
  status: string,
): NextResponse {
  const redirectUrl = new URL(
    "/upcoming-events",
    request.url,
  );

  redirectUrl.searchParams.set(
    "calendar",
    status,
  );

  return NextResponse.redirect(
    redirectUrl,
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const providerError =
    requestUrl.searchParams.get("error");

  if (providerError) {
    console.warn(
      "Google Calendar authorization was not completed:",
      providerError,
    );

    return redirectToEvents(
      request,
      providerError === "access_denied"
        ? "cancelled"
        : "error",
    );
  }

  const code =
    requestUrl.searchParams.get("code");

  const state =
    requestUrl.searchParams.get("state");

  if (!code || !state) {
    console.warn(
      "Google Calendar callback is missing code or state.",
    );

    return redirectToEvents(
      request,
      "invalid-callback",
    );
  }

  try {
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

    const encryptionKey =
      requireEnvironmentVariable(
        "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
      );

    const statePayload =
      verifySignedOAuthState(
        state,
        clientSecret,
      );

    const stateRef = adminDb
      .collection("oauthStates")
      .doc(statePayload.nonce);

    await adminDb.runTransaction(
      async transaction => {
        const stateSnapshot =
          await transaction.get(stateRef);

        if (!stateSnapshot.exists) {
          throw new Error(
            "Google OAuth state was not found.",
          );
        }

        const stateData =
          stateSnapshot.data();

        const expiresAtMillis =
          stateData?.expiresAt &&
          typeof stateData.expiresAt
            .toMillis === "function"
            ? stateData.expiresAt.toMillis()
            : 0;

        if (
          stateData?.uid !==
            statePayload.uid ||
          stateData?.provider !==
            "googleCalendar" ||
          stateData?.consumedAt ||
          expiresAtMillis <= Date.now()
        ) {
          throw new Error(
            "Google OAuth state is invalid, expired, or already used.",
          );
        }

        transaction.update(
          stateRef,
          {
            consumedAt:
              FieldValue.serverTimestamp(),
          },
        );
      },
    );

    const oauth2Client =
      new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );

    const { tokens } =
      await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token.",
      );
    }

    const encryptedCredentials =
      encryptGoogleOAuthCredentials(
        {
          accessToken:
            tokens.access_token ?? null,
          refreshToken:
            tokens.refresh_token,
          scope:
            tokens.scope ??
            CALENDAR_READONLY_SCOPE,
          tokenType:
            tokens.token_type ?? "Bearer",
          expiryDate:
            tokens.expiry_date ?? null,
        },
        encryptionKey,
      );

    await adminDb
      .doc(
        `users/${statePayload.uid}/integrations/googleCalendar`,
      )
      .set(
        {
          provider: "google",
          service: "googleCalendar",
          status: "connected",
          scope:
            tokens.scope ??
            CALENDAR_READONLY_SCOPE,
          tokenType:
            tokens.token_type ??
            "Bearer",
          expiryDate:
            tokens.expiry_date ?? null,
          encryptedCredentials,
          connectedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await stateRef.delete();

    return redirectToEvents(
      request,
      "connected",
    );
  } catch (error) {
    if (
      error instanceof
      GoogleCalendarConfigError
    ) {
      console.error(
        "Google Calendar callback configuration error:",
        error.message,
      );

      return redirectToEvents(
        request,
        "configuration-error",
      );
    }

    console.error(
      "Google Calendar callback failed:",
      error instanceof Error
        ? error.message
        : "Unknown callback error",
    );

    return redirectToEvents(
      request,
      "connection-error",
    );
  }
}

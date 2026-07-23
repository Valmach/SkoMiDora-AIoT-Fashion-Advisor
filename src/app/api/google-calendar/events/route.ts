import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  google,
  type calendar_v3,
} from "googleapis";

import { adminDb } from "@/lib/firebase-admin";
import {
  decryptGoogleOAuthCredentials,
  encryptGoogleOAuthCredentials,
  GoogleCalendarConfigError,
  requireEnvironmentVariable,
  type EncryptedGoogleCredentials,
} from "@/lib/server/google-calendar-oauth";
import {
  FirebaseBearerAuthError,
  requireFirebaseUser,
} from "@/lib/server/require-firebase-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredGoogleCredentials = {
  accessToken: string | null;
  refreshToken: string;
  scope: string | null;
  tokenType: string | null;
  expiryDate: number | null;
};

function isEncryptedGoogleCredentials(
  value: unknown,
): value is EncryptedGoogleCredentials {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<EncryptedGoogleCredentials>;

  return (
    candidate.algorithm === "aes-256-gcm" &&
    candidate.keyVersion === 1 &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

function parseBoundedInteger(
  rawValue: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, parsed),
  );
}

function normalizeEvent(
  event: calendar_v3.Schema$Event,
) {
  const startDateTime =
    event.start?.dateTime ??
    event.start?.date ??
    null;

  const endDateTime =
    event.end?.dateTime ??
    event.end?.date ??
    null;

  return {
    eventId: event.id ?? null,
    recurringEventId:
      event.recurringEventId ?? null,
    status: event.status ?? "confirmed",
    summary:
      event.summary ?? "Untitled Event",
    description:
      event.description ?? null,
    location:
      event.location ?? null,
    htmlLink:
      event.htmlLink ?? null,
    hangoutLink:
      event.hangoutLink ?? null,
    start: {
      dateTime:
        event.start?.dateTime ?? null,
      date:
        event.start?.date ?? null,
      timeZone:
        event.start?.timeZone ?? null,
    },
    end: {
      dateTime:
        event.end?.dateTime ?? null,
      date:
        event.end?.date ?? null,
      timeZone:
        event.end?.timeZone ?? null,
    },
    startDateTime,
    endDateTime,
    isAllDay:
      Boolean(event.start?.date) &&
      !event.start?.dateTime,
  };
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Unknown Google Calendar error";
}

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

    const encryptionKey =
      requireEnvironmentVariable(
        "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
      );

    const integrationRef = adminDb.doc(
      `users/${firebaseUser.uid}/integrations/googleCalendar`,
    );

    const integrationSnapshot =
      await integrationRef.get();

    if (!integrationSnapshot.exists) {
      return NextResponse.json(
        {
          connected: false,
          reconnectRequired: false,
          events: [],
          error:
            "Google Calendar is not connected.",
        },
        { status: 409 },
      );
    }

    const integrationData =
      integrationSnapshot.data();

    if (
      integrationData?.status !== "connected"
    ) {
      return NextResponse.json(
        {
          connected: false,
          reconnectRequired: true,
          events: [],
          error:
            "Google Calendar must be reconnected.",
        },
        { status: 409 },
      );
    }

    const encryptedCredentials =
      integrationData.encryptedCredentials;

    if (
      !isEncryptedGoogleCredentials(
        encryptedCredentials,
      )
    ) {
      throw new Error(
        "Stored Google Calendar credentials are invalid.",
      );
    }

    const storedCredentials =
      decryptGoogleOAuthCredentials<StoredGoogleCredentials>(
        encryptedCredentials,
        encryptionKey,
      );

    if (!storedCredentials.refreshToken) {
      return NextResponse.json(
        {
          connected: false,
          reconnectRequired: true,
          events: [],
          error:
            "Google Calendar authorization is incomplete.",
        },
        { status: 409 },
      );
    }

    const oauth2Client =
      new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );

    oauth2Client.setCredentials({
      access_token:
        storedCredentials.accessToken ??
        undefined,
      refresh_token:
        storedCredentials.refreshToken,
      scope:
        storedCredentials.scope ??
        undefined,
      token_type:
        storedCredentials.tokenType ??
        undefined,
      expiry_date:
        storedCredentials.expiryDate ??
        undefined,
    });

    const requestUrl = new URL(request.url);

    const days = parseBoundedInteger(
      requestUrl.searchParams.get("days"),
      365,
      1,
      366,
    );

    const maxResults =
      parseBoundedInteger(
        requestUrl.searchParams.get(
          "maxResults",
        ),
        100,
        1,
        250,
      );

    const pageToken =
      requestUrl.searchParams.get(
        "pageToken",
      ) || undefined;

    const timeMin = new Date();
    const timeMax = new Date(
      timeMin.getTime() +
        days * 24 * 60 * 60 * 1000,
    );

    const calendar =
      google.calendar({
        version: "v3",
        auth: oauth2Client,
      });

    const response =
      await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        showDeleted: false,
        maxResults,
        pageToken,
      });

    const activeCredentials =
      oauth2Client.credentials;

    const nextCredentials: StoredGoogleCredentials = {
      accessToken:
        activeCredentials.access_token ??
        storedCredentials.accessToken,
      refreshToken:
        activeCredentials.refresh_token ??
        storedCredentials.refreshToken,
      scope:
        activeCredentials.scope ??
        storedCredentials.scope,
      tokenType:
        activeCredentials.token_type ??
        storedCredentials.tokenType,
      expiryDate:
        activeCredentials.expiry_date ??
        storedCredentials.expiryDate,
    };

    const credentialsChanged =
      nextCredentials.accessToken !==
        storedCredentials.accessToken ||
      nextCredentials.refreshToken !==
        storedCredentials.refreshToken ||
      nextCredentials.scope !==
        storedCredentials.scope ||
      nextCredentials.tokenType !==
        storedCredentials.tokenType ||
      nextCredentials.expiryDate !==
        storedCredentials.expiryDate;

    if (credentialsChanged) {
      const encryptedUpdatedCredentials =
        encryptGoogleOAuthCredentials(
          nextCredentials,
          encryptionKey,
        );

      await integrationRef.set(
        {
          encryptedCredentials:
            encryptedUpdatedCredentials,
          scope:
            nextCredentials.scope,
          tokenType:
            nextCredentials.tokenType,
          expiryDate:
            nextCredentials.expiryDate,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return NextResponse.json(
      {
        connected: true,
        reconnectRequired: false,
        calendarTimeZone:
          response.data.timeZone ?? null,
        range: {
          timeMin:
            timeMin.toISOString(),
          timeMax:
            timeMax.toISOString(),
        },
        events:
          (response.data.items ?? []).map(
            normalizeEvent,
          ),
        nextPageToken:
          response.data.nextPageToken ??
          null,
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

    if (
      error instanceof
      GoogleCalendarConfigError
    ) {
      console.error(
        "Google Calendar events configuration error:",
        error.message,
      );

      return NextResponse.json(
        {
          connected: false,
          events: [],
          error:
            "Google Calendar integration is not configured.",
        },
        { status: 503 },
      );
    }

    const message =
      getErrorMessage(error);

    console.error(
      "Google Calendar event retrieval failed:",
      message,
    );

    const reconnectRequired =
      /invalid_grant|invalid credentials|unauthorized|login required/i.test(
        message,
      );

    return NextResponse.json(
      {
        connected:
          !reconnectRequired,
        reconnectRequired,
        events: [],
        error: reconnectRequired
          ? "Google Calendar authorization has expired. Reconnect your calendar."
          : "Unable to retrieve Google Calendar events.",
      },
      {
        status:
          reconnectRequired ? 401 : 502,
      },
    );
  }
}

import type {
  DecodedIdToken,
} from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";

import { adminApp } from "@/lib/firebase-admin";

export class FirebaseBearerAuthError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status = 401,
  ) {
    super(message);
    this.name = "FirebaseBearerAuthError";
    this.status = status;
  }
}

export async function requireFirebaseUser(
  request: Request,
): Promise<DecodedIdToken> {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    throw new FirebaseBearerAuthError(
      "Missing Authorization header.",
    );
  }

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  const idToken = match?.[1]?.trim();

  if (!idToken) {
    throw new FirebaseBearerAuthError(
      "Authorization header must use Bearer authentication.",
    );
  }

  try {
    return await getAuth(
      adminApp,
    ).verifyIdToken(idToken);
  } catch (error) {
    console.warn(
      "Firebase bearer-token verification failed:",
      error instanceof Error
        ? error.message
        : "Unknown verification error",
    );

    throw new FirebaseBearerAuthError(
      "Invalid or expired Firebase ID token.",
    );
  }
}

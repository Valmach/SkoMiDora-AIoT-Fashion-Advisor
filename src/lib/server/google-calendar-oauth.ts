import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";

export const CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export class GoogleCalendarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarConfigError";
  }
}

export type GoogleOAuthStatePayload = {
  uid: string;
  nonce: string;
  expiresAt: number;
};

export type EncryptedGoogleCredentials = {
  algorithm: "aes-256-gcm";
  keyVersion: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
};

export function requireEnvironmentVariable(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new GoogleCalendarConfigError(
      `${name} is not configured.`,
    );
  }

  return value;
}

export function createSignedOAuthState(
  uid: string,
  signingSecret: string,
): {
  state: string;
  payload: GoogleOAuthStatePayload;
} {
  const payload: GoogleOAuthStatePayload = {
    uid,
    nonce: randomUUID(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  const signature = createHmac(
    "sha256",
    signingSecret,
  )
    .update(encodedPayload)
    .digest("base64url");

  return {
    state: `${encodedPayload}.${signature}`,
    payload,
  };
}

export function verifySignedOAuthState(
  state: string,
  signingSecret: string,
): GoogleOAuthStatePayload {
  const [encodedPayload, suppliedSignature, extra] =
    state.split(".");

  if (
    !encodedPayload ||
    !suppliedSignature ||
    extra
  ) {
    throw new Error(
      "Invalid Google OAuth state format.",
    );
  }

  const expectedSignature = createHmac(
    "sha256",
    signingSecret,
  )
    .update(encodedPayload)
    .digest("base64url");

  const suppliedBuffer = Buffer.from(
    suppliedSignature,
    "base64url",
  );
  const expectedBuffer = Buffer.from(
    expectedSignature,
    "base64url",
  );

  if (
    suppliedBuffer.length !==
      expectedBuffer.length ||
    !timingSafeEqual(
      suppliedBuffer,
      expectedBuffer,
    )
  ) {
    throw new Error(
      "Google OAuth state signature is invalid.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url",
      ).toString("utf8"),
    );
  } catch {
    throw new Error(
      "Google OAuth state payload is invalid.",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    throw new Error(
      "Google OAuth state payload is invalid.",
    );
  }

  const candidate =
    parsed as Partial<GoogleOAuthStatePayload>;

  if (
    typeof candidate.uid !== "string" ||
    !candidate.uid ||
    typeof candidate.nonce !== "string" ||
    !candidate.nonce ||
    typeof candidate.expiresAt !== "number" ||
    !Number.isFinite(candidate.expiresAt)
  ) {
    throw new Error(
      "Google OAuth state payload is incomplete.",
    );
  }

  if (candidate.expiresAt <= Date.now()) {
    throw new Error(
      "Google OAuth state has expired.",
    );
  }

  return {
    uid: candidate.uid,
    nonce: candidate.nonce,
    expiresAt: candidate.expiresAt,
  };
}

function decodeEncryptionKey(
  encodedKey: string,
): Buffer {
  const key = Buffer.from(
    encodedKey,
    "base64",
  );

  if (key.length !== 32) {
    throw new GoogleCalendarConfigError(
      "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

export function encryptGoogleOAuthCredentials(
  credentials: Record<string, unknown>,
  encodedKey: string,
): EncryptedGoogleCredentials {
  const key = decodeEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    key,
    iv,
  );

  const plaintext = Buffer.from(
    JSON.stringify(credentials),
    "utf8",
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);

  return {
    algorithm: "aes-256-gcm",
    keyVersion: 1,
    iv: iv.toString("base64"),
    authTag:
      cipher.getAuthTag().toString("base64"),
    ciphertext:
      ciphertext.toString("base64"),
  };
}

export function decryptGoogleOAuthCredentials<
  T extends Record<string, unknown>,
>(
  encrypted: EncryptedGoogleCredentials,
  encodedKey: string,
): T {
  if (encrypted.algorithm !== "aes-256-gcm") {
    throw new Error(
      "Unsupported Google OAuth encryption algorithm.",
    );
  }

  const key = decodeEncryptionKey(encodedKey);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encrypted.iv, "base64"),
  );

  decipher.setAuthTag(
    Buffer.from(
      encrypted.authTag,
      "base64",
    ),
  );

  const plaintext = Buffer.concat([
    decipher.update(
      Buffer.from(
        encrypted.ciphertext,
        "base64",
      ),
    ),
    decipher.final(),
  ]);

  return JSON.parse(
    plaintext.toString("utf8"),
  ) as T;
}

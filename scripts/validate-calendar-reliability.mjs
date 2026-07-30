/**
 * Read-only Calendar reliability regression.
 *
 * Usage:
 *   node scripts/validate-calendar-reliability.mjs
 *
 * The development server must be running. This script never
 * connects, disconnects, or changes Calendar data.
 */

import {
  access,
} from "node:fs/promises";

const baseUrl = (
  process.env.BASE_URL ||
  "http://localhost:9002"
).replace(/\/+$/, "");

const timeoutMs = Number(
  process.env.CALENDAR_VALIDATION_TIMEOUT_MS ||
    60000,
);

const requiredRoutes = [
  "src/app/api/google-calendar/auth/route.ts",
  "src/app/api/google-calendar/callback/route.ts",
  "src/app/api/google-calendar/events/route.ts",
  "src/app/api/google-calendar/disconnect/route.ts",
];

function assertCondition(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(
  path,
  options = {},
) {
  return fetch(
    `${baseUrl}${path}`,
    {
      method: options.method || "GET",
      cache: "no-store",
      signal:
        AbortSignal.timeout(
          timeoutMs,
        ),
      headers: {
        Accept: "application/json",
      },
    },
  );
}

async function validateUnauthorizedRoute(
  name,
  path,
  method = "GET",
) {
  const response = await request(
    path,
    { method },
  );

  assertCondition(
    response.status === 401,
    `${name}: expected HTTP 401 without a Firebase token; received ${response.status}.`,
  );

  return {
    check: name,
    status: "PASS",
    details:
      "Unauthenticated request was rejected with HTTP 401.",
  };
}

async function main() {
  console.log(
    `\nValidating Calendar reliability at ${baseUrl}\n`,
  );

  await Promise.all(
    requiredRoutes.map(route =>
      access(route),
    ),
  );

  const validationResponse =
    await request(
      "/api/dev/validate-calendar-reliability",
    );

  const validationPayload =
    await validationResponse.json();

  assertCondition(
    validationResponse.ok &&
      validationPayload.ok === true,
    validationPayload.error ||
      `Calendar fixture validation returned HTTP ${validationResponse.status}.`,
  );

  assertCondition(
    Array.isArray(
      validationPayload.events,
    ) &&
      validationPayload.events.length ===
        3,
    "Calendar fixture validation did not return three synchronized events.",
  );

  const results = [
    {
      check:
        "Calendar event normalization",
      status: "PASS",
      details:
        "Paris, Oslo, and Rome retained their Calendar dates and excluded swimwear.",
    },
    {
      check:
        "Invalid event date",
      status: validationPayload
        .invalidDateRejected
        ? "PASS"
        : "FAIL",
      details:
        "An event without a usable date was rejected.",
    },
    await validateUnauthorizedRoute(
      "Calendar authorization",
      "/api/google-calendar/auth",
    ),
    await validateUnauthorizedRoute(
      "Calendar event loading",
      "/api/google-calendar/events?days=1&maxResults=1",
    ),
    await validateUnauthorizedRoute(
      "Calendar disconnect",
      "/api/google-calendar/disconnect",
      "DELETE",
    ),
  ];

  console.table(results);

  assertCondition(
    results.every(
      result =>
        result.status === "PASS",
    ),
    "One or more Calendar reliability checks failed.",
  );

  console.log(
    "\nCalendar reliability regression passed. No Calendar or application data was changed.\n",
  );
}

main().catch(error => {
  console.error(
    "\nCalendar reliability regression failed:",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});

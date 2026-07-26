/**
 * Read-only SkoMiDora product stability gate.
 *
 * Usage:
 *   node scripts/validate-product-stability.mjs
 *
 * Production:
 *   BASE_URL=https://your-production-domain \
 *     node scripts/validate-product-stability.mjs
 *
 * This script performs GET requests only.
 * It does not modify Firestore, Storage, Calendar, or device data.
 */

const baseUrl = (
    process.env.BASE_URL ||
    "http://localhost:9002"
  ).replace(/\/+$/, "");

  const timeoutMs = Number(
    process.env.STABILITY_TIMEOUT_MS || 60000,
  );

  const results = [];

  function record(name, passed, details) {
    results.push({
      check: name,
      status: passed ? "PASS" : "FAIL",
      details,
    });
  }

  function requireCondition(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async function request(path, options = {}) {
    const response = await fetch(
      `${baseUrl}${path}`,
      {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: options.json
            ? "application/json"
            : "text/html,application/json",
        },
      },
    );

    const body = await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${body.slice(0, 300)}`,
      );
    }

    if (!options.json) {
      return {
        response,
        body,
      };
    }

    try {
      return {
        response,
        body,
        payload: JSON.parse(body),
      };
    } catch {
      throw new Error(
        `Expected JSON but received: ${body.slice(0, 300)}`,
      );
    }
  }

  async function checkPage(name, path) {
    try {
      const { body } = await request(path);

      requireCondition(
        body.length > 0,
        "The response body was empty.",
      );

      record(
        name,
        true,
        `${path} returned a non-empty page.`,
      );
    } catch (error) {
      record(
        name,
        false,
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  }

  function extractItems(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (
      payload &&
      Array.isArray(payload.items)
    ) {
      return payload.items;
    }

    return [];
  }

  function extractItemId(item) {
    return String(
      item?.id ||
      item?.documentId ||
      item?.itemId ||
      "",
    ).trim();
  }

  async function checkWardrobeApi() {
    try {
      const firstResult = await request(
        "/api/publicWardrobeItems?pageSize=25",
        { json: true },
      );

      const firstPayload = firstResult.payload;
      const firstItems = extractItems(firstPayload);

      requireCondition(
        firstItems.length > 0,
        "Wardrobe API returned zero items.",
      );

      const firstIds = firstItems
        .map(extractItemId)
        .filter(Boolean);

      requireCondition(
        firstIds.length === firstItems.length,
        "One or more wardrobe items are missing IDs.",
      );

      requireCondition(
        new Set(firstIds).size === firstIds.length,
        "The first wardrobe page contains duplicate IDs.",
      );

      const isPagedObject =
        !Array.isArray(firstPayload);

      if (
        isPagedObject &&
        firstPayload.hasMore === true
      ) {
        const nextCursor = String(
          firstPayload.nextCursor ||
          firstPayload.cursor ||
          "",
        ).trim();

        requireCondition(
          Boolean(nextCursor),
          "hasMore is true, but no next cursor was returned.",
        );

        const secondResult = await request(
          "/api/publicWardrobeItems?pageSize=25" +
          `&cursor=${encodeURIComponent(nextCursor)}`,
          { json: true },
        );

        const secondItems = extractItems(
          secondResult.payload,
        );

        requireCondition(
          secondItems.length > 0,
          "The second wardrobe page returned zero items.",
        );

        const secondIds = secondItems
          .map(extractItemId)
          .filter(Boolean);

        const duplicates = secondIds.filter(
          id => firstIds.includes(id),
        );

        requireCondition(
          duplicates.length === 0,
          `Pagination repeated IDs: ${duplicates.join(", ")}`,
        );

        record(
          "Wardrobe pagination",
          true,
          `${firstItems.length} first-page items and ` +
          `${secondItems.length} second-page items; ` +
          "no duplicate IDs.",
        );

        return;
      }

      record(
        "Wardrobe inventory",
        true,
        `${firstItems.length} wardrobe items returned.`,
      );
    } catch (error) {
      record(
        "Wardrobe inventory",
        false,
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  }

  async function main() {
    console.log(
      `\nSkoMiDora stability gate: ${baseUrl}\n`,
    );

    await Promise.all([
      checkPage("Dashboard page", "/"),
      checkPage("Closet page", "/closet"),
      checkPage(
        "Upcoming Events page",
        "/upcoming-events",
      ),
      checkPage(
        "Outfit Recommendations page",
        "/outfit-recommendations",
      ),
      checkPage("Settings page", "/settings"),
      checkWardrobeApi(),
    ]);

    console.table(results);

    const failures = results.filter(
      result => result.status === "FAIL",
    );

    if (failures.length > 0) {
      console.error(
        `\nStability gate failed: ` +
        `${failures.length} check(s) failed.\n`,
      );

      process.exitCode = 1;
      return;
    }

    console.log(
      "\nStability gate passed. No application data was changed.\n",
    );
  }

  main().catch(error => {
    console.error(
      "Stability gate crashed:",
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exitCode = 1;
  });
/**
 * Local SkoMiDora outfit-engine regression gate.
 *
 * The corresponding API route is disabled in production.
 *
 * Usage:
 *   node scripts/validate-outfit-engine.mjs
 */

const baseUrl = (
    process.env.BASE_URL ||
    'http://localhost:9002'
  ).replace(/\/+$/, '');

  const endpoint =
    `${baseUrl}/api/dev/validate-outfit-engine`;

  async function main() {
    console.log(
      `\nValidating outfit engine at ${endpoint}\n`,
    );

    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(300000),
      headers: {
        Accept: 'application/json',
      },
    });

    const body = await response.text();

    let payload;

    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error(
        `Expected JSON but received: ${body.slice(0, 500)}`,
      );
    }

    if (!response.ok || payload.ok !== true) {
      throw new Error(
        payload.error ||
        `Regression endpoint returned HTTP ${response.status}.`,
      );
    }

    const rows = [
      ...payload.first.map(look => ({
        generation: 'Initial',
        look: look.look,
        items: look.itemIds.length,
        images: look.imageCount,
        footwear: look.footwearCount,
        foundation:
          look.onePieceCount > 0
            ? 'One-piece'
            : 'Separates',
      })),
      ...payload.refreshed.map(look => ({
        generation: 'Refresh',
        look: look.look,
        items: look.itemIds.length,
        images: look.imageCount,
        footwear: look.footwearCount,
        foundation:
          look.onePieceCount > 0
            ? 'One-piece'
            : 'Separates',
      })),
    ];

    console.table(rows);

    console.log(
      `Repeated refresh IDs: ${
        payload.repeatedIds.length
      }`,
    );

    console.log(
      '\nOutfit-engine regression passed.\n',
    );
  }

  main().catch(error => {
    console.error(
      '\nOutfit-engine regression failed:',
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exitCode = 1;
  });
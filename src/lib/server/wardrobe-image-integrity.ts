const STORAGE_IMAGE_HOSTS = new Set([
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
]);

const IMAGE_CHECK_TTL_MS = 15 * 60 * 1000;
const IMAGE_CHECK_TIMEOUT_MS = 6000;

type CachedImageCheck = {
  checkedAt: number;
  reachable: boolean;
};

const imageCheckCache = new Map<string, CachedImageCheck>();

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

export function getWardrobeImageUrl(item: unknown): string {
  if (!item || typeof item !== "object") {
    return "";
  }

  const record = item as Record<string, unknown>;

  return cleanText(
    record.imageUrl ||
      record.image ||
      record.url,
  );
}

function isStorageImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      STORAGE_IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

async function requestImage(
  imageUrl: string,
  method: "HEAD" | "GET",
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    IMAGE_CHECK_TIMEOUT_MS,
  );

  try {
    return await fetch(imageUrl, {
      method,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers:
        method === "GET"
          ? { Range: "bytes=0-0" }
          : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkStorageImage(
  imageUrl: string,
): Promise<boolean> {
  try {
    let response = await requestImage(imageUrl, "HEAD");

    if (response.status === 405) {
      response = await requestImage(imageUrl, "GET");
      await response.body?.cancel();
    }

    return response.ok;
  } catch {
    return false;
  }
}

export async function isWardrobeImageReachable(
  item: unknown,
): Promise<boolean> {
  const imageUrl = getWardrobeImageUrl(item);

  if (!imageUrl) {
    return false;
  }

  if (!isStorageImageUrl(imageUrl)) {
    try {
      return new URL(imageUrl).protocol === "https:";
    } catch {
      return false;
    }
  }

  const cached = imageCheckCache.get(imageUrl);

  if (
    cached &&
    Date.now() - cached.checkedAt < IMAGE_CHECK_TTL_MS
  ) {
    return cached.reachable;
  }

  const reachable = await checkStorageImage(imageUrl);

  imageCheckCache.set(imageUrl, {
    checkedAt: Date.now(),
    reachable,
  });

  return reachable;
}

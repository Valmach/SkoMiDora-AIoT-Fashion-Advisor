import {
  getCanonicalWardrobeType,
  getWardrobeCategory,
} from "@/lib/wardrobe-taxonomy";

export type WardrobeMetadata = Record<string, any>;

function clean(value: any): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(", ");
  if (typeof value === "object") return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function first(...values: any[]): string {
  for (const value of values) {
    const v = clean(value);
    if (v) return v;
  }
  return "";
}

function list(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value)
    .split(/[,;|]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function uniq(values: any[], limit = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const v = clean(value);
    if (!v) continue;

    const key = v.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(v);

    if (out.length >= limit) break;
  }

  return out;
}

function tag(value: any): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function has(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function inferItemType(text: string, fallback: string): string {
  if (/\b(dress|gown|maxi|midi|mini dress)\b/.test(text)) return "Dress";
  if (/\b(skirt)\b/.test(text)) return "Skirt";
  if (/\b(sandal|sandals|slide|slides)\b/.test(text)) return "Sandal";
  if (/\b(mule|mules|pump|pumps|heel|heels|stiletto|loafer|loafers|sneaker|sneakers|shoe|shoes)\b/.test(text)) return "Shoes";
  if (/\b(boot|boots|bootie|booties)\b/.test(text)) return "Ankle Boot";
  if (/\b(coat|jacket|blazer|trench|parka|puffer)\b/.test(text)) return "Outerwear";
  if (/\b(top|blouse|shirt|tee|t-shirt|bustier|camisole|tank|vest|waistcoat)\b/.test(text)) return "Top";
  if (/\b(pant|pants|trouser|trousers|jean|jeans|shorts)\b/.test(text)) return "Bottom";
  if (/\b(bag|purse|clutch|belt|scarf)\b/.test(text)) return "Accessory";
  if (/\b(earring|earrings|necklace|bracelet|ring|cuff|pendant|brooch|choker)\b/.test(text)) return "Accessory";
  return fallback || "Uncategorized";
}

function inferSeason(text: string): string[] {
  const out: string[] = [];

  if (has(text, ["linen", "cotton", "sandal", "swim", "resort", "crochet", "sleeveless", "summer", "vacation", "beach"])) {
    out.push("spring", "summer");
  }

  if (has(text, ["wool", "cashmere", "alpaca", "coat", "boot", "puffer", "parka", "knit", "winter", "snow"])) {
    out.push("fall", "winter");
  }

  if (has(text, ["trench", "blazer", "jacket", "denim", "transitional"])) {
    out.push("spring", "fall", "transitional");
  }

  return uniq(out.length ? out : ["all-season"], 8);
}

function inferWeather(text: string): string[] {
  const out: string[] = [];

  if (has(text, ["linen", "cotton", "sandal", "swim", "resort", "crochet", "sleeveless", "lightweight", "breathable"])) {
    out.push("hot", "warm", "dry");
  }

  if (has(text, ["silk", "satin", "dress", "skirt", "blouse", "shirt"])) {
    out.push("warm", "mild", "indoor");
  }

  if (has(text, ["wool", "cashmere", "alpaca", "coat", "boot", "puffer", "parka", "fleece"])) {
    out.push("cool", "cold");
  }

  if (has(text, ["rain", "waterproof", "weatherproof", "trench"])) {
    out.push("rain", "windy");
  }

  return uniq(out.length ? out : ["mild", "indoor"], 10);
}

function inferEvents(text: string): string[] {
  const out: string[] = [];

  if (has(text, ["resort", "vacation", "travel", "linen", "sandal", "swim", "beach"])) {
    out.push("travel", "resort");
  }

  if (has(text, ["evening", "gown", "satin", "silk", "stiletto", "pump", "cocktail", "dress"])) {
    out.push("evening", "cocktail", "dinner");
  }

  if (has(text, ["blazer", "trouser", "loafer", "tailored", "shirt", "conference", "office"])) {
    out.push("business-casual", "city", "conference");
  }

  if (has(text, ["floral", "garden", "brunch", "romantic"])) {
    out.push("garden-party", "brunch");
  }

  if (has(text, ["denim", "sneaker", "tee", "casual"])) {
    out.push("casual", "city");
  }

  return uniq(out.length ? out : ["city", "smart-casual"], 10);
}

function inferFormality(text: string): string {
  if (has(text, ["black tie", "black-tie", "gown", "formal"])) return "formal";
  if (has(text, ["cocktail", "stiletto", "pump", "satin", "silk", "evening"])) return "cocktail";
  if (has(text, ["blazer", "tailored", "trouser", "loafer", "shirt"])) return "business-casual";
  if (has(text, ["sneaker", "denim", "tee", "t-shirt", "casual"])) return "casual";
  return "smart-casual";
}

function inferStyle(text: string): string[] {
  const words = [
    "minimalist", "romantic", "bohemian", "resort", "editorial", "tailored",
    "structured", "fluid", "polished", "feminine", "avant-garde", "classic",
    "modern", "luxury", "statement", "soft", "crisp", "sport-luxe",
    "street-style", "evening", "day-to-evening", "floral", "metallic",
    "textured", "lightweight", "breathable"
  ];

  const out = words.filter((word) => text.includes(word));

  if (has(text, ["linen", "cotton", "sandal", "resort", "vacation"])) out.push("resort", "warm-weather");
  if (has(text, ["silk", "satin", "gown", "stiletto"])) out.push("evening", "luxury");
  if (has(text, ["blazer", "trouser", "tailored"])) out.push("tailored", "polished");
  if (has(text, ["floral", "ruffle", "frill"])) out.push("romantic", "feminine");

  return uniq(out, 12);
}

function parsePrice(value: any): number | null {
  const text = clean(value).replace(/,/g, "");
  const match = text.match(/\d+(?:\.\d{1,2})?/);
  if (!match) return null;

  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function currencyFrom(...values: any[]): string | null {
  const text = values.map(clean).join(" ");
  if (/\bUSD\b|\$/.test(text)) return "USD";
  if (/\bGBP\b|£/.test(text)) return "GBP";
  if (/\bEUR\b|€/.test(text)) return "EUR";
  return null;
}

function domainFrom(url: string | null): string | null {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function normalizeWardrobeMetadata(
  base: WardrobeMetadata,
  commercial: WardrobeMetadata = {},
): WardrobeMetadata {  const itemName = first(
    commercial.itemName,
    commercial.productTitle,
    commercial.title,
    commercial.name,
    commercial.ogTitle,
    base.itemName
  ) || "SkoMiDora Lens Upload";

  const designerName = first(
    commercial.designerName,
    commercial.designer,
    commercial.brand,
    commercial.brandName,
    commercial.manufacturer,
    base.designerName
  ) || "Unknown";

  const sourceDescription = first(
    commercial.description,
    commercial.productDescription,
    commercial.ogDescription,
    commercial.metaDescription
  );

  const sourceUrl = first(
    commercial.sourceUrl,
    commercial.productUrl,
    commercial.url,
    commercial.pageUrl,
    commercial.canonicalUrl
  ) || null;

  const priceText = first(
    commercial.price,
    commercial.currentPrice,
    commercial.salePrice,
    commercial.originalPrice
  );

  const color = first(commercial.color, commercial.colour, base.color) || "Unknown";
  const generalMaterial = first(
    commercial.generalMaterial,
    commercial.material,
    commercial.fabric,
    commercial.composition,
    base.generalMaterial
  ) || "Unknown";

  const combinedText = [
    itemName,
    designerName,
    commercial.itemType,
    commercial.category,
    commercial.productType,
    color,
    generalMaterial,
    sourceDescription,
    base.detailedSpecifications,
    base.narrativeDescription,
    list(commercial.keywords).join(" "),
    list(commercial.tags).join(" "),
    list(commercial.styleKeywords).join(" "),
  ].join(" ").toLowerCase();

  const suppliedItemType = first(
    commercial.itemType,
    commercial.productType,
    base.itemType,
  );

  const inferredItemType = inferItemType(
    combinedText,
    suppliedItemType,
  );

  const itemType =
    getCanonicalWardrobeType(
      suppliedItemType,
      itemName,
    ) ||
    getCanonicalWardrobeType(
      inferredItemType,
      itemName,
    ) ||
    "Uncategorized";

  const category =
    getWardrobeCategory(
      commercial.category,
      itemType,
      itemName,
    ) ||
    getWardrobeCategory(
      undefined,
      itemType,
      itemName,
    ) ||
    "Uncategorized";

  const season = uniq([...list(commercial.season), ...inferSeason(combinedText)], 8);
  const weatherSuitability = uniq([...list(commercial.weatherSuitability), ...inferWeather(combinedText)], 10);
  const eventCategory = uniq([...list(commercial.eventCategory), ...inferEvents(combinedText)], 10);
  const formality = first(commercial.formality, inferFormality(combinedText));

  const styleKeywords = uniq([
    ...list(base.styleKeywords),
    ...list(commercial.styleKeywords),
    ...list(commercial.keywords),
    ...inferStyle(combinedText),
    designerName !== "Unknown" ? designerName : "",
    itemType !== "Uncategorized" ? itemType : "",
    color !== "Unknown" ? color : "",
    generalMaterial !== "Unknown" ? generalMaterial : "",
  ], 14);

  const tags = uniq([
    ...list(commercial.tags),
    tag(itemType),
    tag(color),
    tag(generalMaterial),
    ...season.map(tag),
    ...weatherSuitability.map(tag),
    ...eventCategory.map(tag),
    tag(formality),
    ...styleKeywords.map(tag),
  ].filter(Boolean), 24);

  const hasCommercialSignal = Boolean(
    commercial.productTitle ||
    commercial.title ||
    commercial.brand ||
    commercial.price ||
    sourceUrl ||
    sourceDescription
  );

  return {
    ...base,
    itemName,
    itemType,
    category,
    designerName,
    color,
    generalMaterial,
    detailedSpecifications: [
      `Brand: ${designerName}`,
      `Type: ${itemType}`,
      `Color: ${color}`,
      `Material: ${generalMaterial}`,
      priceText ? `Price: ${priceText}` : null,
      sourceUrl ? `Source: ${domainFrom(sourceUrl)}` : null,
    ].filter(Boolean).join(" "),
    narrativeDescription:
      sourceDescription ||
      base.narrativeDescription ||
      `${itemName}. Uploaded through SkoMiDora Lens and cataloged for the digital closet.`,
    styleKeywords,
    season,
    weatherSuitability,
    eventCategory,
    formality,
    tags,
    sourceUrl,
    productUrl: sourceUrl,
    sourceDomain: domainFrom(sourceUrl),
    price: parsePrice(priceText),
    priceText: priceText || null,
    currency: currencyFrom(priceText, commercial.currency),
    metadataSource: hasCommercialSignal
      ? "AwesomeScreenshot Pro / Commercial Page"
      : "SkoMiDora Lens Filename",
    metadataConfidence: hasCommercialSignal ? 0.9 : 0.55,
  };
}
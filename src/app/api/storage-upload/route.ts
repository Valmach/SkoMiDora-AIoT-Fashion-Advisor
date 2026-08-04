import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { normalizeWardrobeMetadata } from "@/lib/wardrobeMetadata";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_TYPES,
  getCanonicalWardrobeType,
  getWardrobeCategory,
} from "@/lib/wardrobe-taxonomy";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!getApps().length) {
  initializeApp({
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "styleai-footwear",
  });
}

const BUCKET_NAME =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "styleai-footwear.firebasestorage.app";

function cleanFileName(name: string) {
  return name.replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  );
}

function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\d{2}\s\d{2}\s\d{4}.*$/i, "")
    .replace(/\bFARFETCH\b/gi, "")
    .replace(/\bOfficial Site\b/gi, "")
    .replace(/\bUnited States\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function publicStorageUrl(
  bucket: string,
  objectPath: string,
) {
  const encodedPath = objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `https://storage.googleapis.com/${bucket}/${encodedPath}`;
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json\n?|```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (
    start === -1 ||
    end === -1 ||
    end <= start
  ) {
    return {};
  }

  try {
    return JSON.parse(
      cleaned.slice(start, end + 1),
    );
  } catch {
    return {};
  }
}

async function analyzeImageMetadata(
  imageBase64: string,
  mimeType: string,
  fileName: string,
) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

  console.log("[storage-upload] Resolved apiKey diagnostic - length:", apiKey.length, "prefix:", apiKey.slice(0, 6), "suffix:", apiKey.slice(-4));

  if (!apiKey) {
    console.warn(
      "[storage-upload] Vision AI SKIPPED for",
      fileName,
      "- reason: no API key found in GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY env vars.",
    );
    return {};
  }

  try {
    const base64Data =
      imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

    const genAI =
      new GoogleGenerativeAI(apiKey);

    const model =
      genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

    const prompt = [
      "Analyze this fashion or footwear image for SkoMiDora.",
      "Return ONLY valid JSON with:",
      "{",
      "\"itemName\": \"specific product-style name\",",
      "\"brand\": \"brand if visible or recognizable, otherwise Unknown\",",
      "\"brandName\": \"same as brand\",",
      "\"designer\": \"designer or fashion house if visible or recognizable, otherwise Unknown\",",
      "\"designerName\": \"same as designer\",",
      `"itemType": "${WARDROBE_TYPES.join(" | ")}",`,
      `"category": "${WARDROBE_CATEGORIES.join(" | ")}",`,
      "\"color\": \"dominant color\",",
      "\"material\": \"likely material\",",
      "\"generalMaterial\": \"likely material\",",
      "\"narrativeDescription\": \"one polished sentence\",",
      "\"styleKeywords\": [\"3 to 8 keywords\"],",
      "\"tags\": [\"searchable tags\"],",
      "\"season\": [\"spring\",\"summer\",\"fall\",\"winter\",\"all-season\"],",
      "\"weatherSuitability\": [\"hot\",\"warm\",\"mild\",\"cool\",\"cold\",\"rain\",\"indoor\",\"dry\"],",
      "\"eventCategory\": [\"city\",\"casual\",\"evening\",\"cocktail\",\"business-casual\",\"travel\",\"resort\"],",
      "\"formality\": \"casual | smart-casual | business-casual | cocktail | formal\",",
      "\"metadataConfidence\": 0.75",
      "}",
      "Select exactly one itemType and its matching broad category from the provided canonical values.",
      "For footwear, apparel, handbags, and luxury fashion, the designer house is normally also the brand. When only the designer is identifiable, return that designer name in both the brand and designer fields. When only the brand is identifiable, return it in both fields. Preserve different values when the image clearly represents a collaboration, custom maker, atelier, diffusion label, or licensed brand. A designer or brand name written in the provided filename is valid evidence, use it even if no logo or tag is visible in the image itself. Only return Unknown if neither the image nor the filename gives any indication of brand or designer.",
      `Original filename: ${fileName}`,
    ].join("\n");

    const result =
      await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]);

    const rawText = result.response.text();
    const parsed = extractJson(rawText);

    const isValid =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed);

    if (!isValid) {
      console.warn(
        "[storage-upload] Vision AI FAILED for",
        fileName,
        "- reason: model responded but JSON parsing failed. Raw response (first 500 chars):",
        rawText.slice(0, 500),
      );
      return {};
    }

    console.log(
      "[storage-upload] Vision AI SUCCEEDED for",
      fileName,
      "- keys returned:",
      Object.keys(parsed).join(", "),
    );

    return parsed;
  } catch (error) {
    console.warn(
      "[storage-upload] Vision AI FAILED for",
      fileName,
      "- reason: API call threw an error:",
      error,
    );

    return {};
  }
}

let knownDesignersCache: { names: string[]; fetchedAt: number } | null = null;
const KNOWN_DESIGNERS_CACHE_TTL_MS = 5 * 60 * 1000;

async function getKnownDesigners(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const now = Date.now();
  if (knownDesignersCache && now - knownDesignersCache.fetchedAt < KNOWN_DESIGNERS_CACHE_TTL_MS) {
    return knownDesignersCache.names;
  }
  try {
    const snap = await db.collection("publicWardrobeItems").select("designerName").get();
    const names = new Set<string>();
    snap.forEach(function(doc: FirebaseFirestore.QueryDocumentSnapshot) {
      const value = String(doc.get("designerName") || "").trim();
      if (value && value.toLowerCase() !== "unknown") {
        names.add(value);
      }
    });
    const list = Array.from(names);
    knownDesignersCache = { names: list, fetchedAt: now };
    console.log("[storage-upload] Refreshed known-designers catalog cache:", list.length, "designers");
    return list;
  } catch (error) {
    console.warn("[storage-upload] Failed to load known-designers catalog:", error);
    return knownDesignersCache ? knownDesignersCache.names : [];
  }
}

function matchKnownDesigner(fileName: string, knownDesigners: string[]): string | null {
  const lower = fileName.toLowerCase();
  const sorted = knownDesigners.slice().sort(function(a: string, b: string) { return b.length - a.length; });
  for (let i = 0; i < sorted.length; i++) {
    const designer = sorted[i];
    const normalized = designer.toLowerCase();
    const specialChars = /[.*+?^${}()|[\]\\]/g;
    const escaped = normalized.replace(specialChars, "\\$&");
    const separators = /[\s&_-]+/g;
    const flexible = escaped.replace(separators, "[\\s\\-_&]+");
    const pattern = new RegExp("(^|[^a-z0-9])" + flexible + "([^a-z0-9]|$)", "i");
    if (pattern.test(lower)) {
      return designer;
    }
  }
  return null;
}

function inferLensMetadata(
  fileName: string,
) {
  const itemName =
    titleFromFileName(fileName) ||
    "SkoMiDora Lens Upload";

  const lower = itemName.toLowerCase();

  let designerName = "Unknown";

  if (
    lower.includes("dolce") ||
    lower.includes("gabbana")
  ) {
    designerName = "Dolce & Gabbana";
  } else if (lower.includes("ganni")) {
    designerName = "GANNI";
  } else if (lower.includes("prada")) {
    designerName = "Prada";
  } else if (
    lower.includes("tory burch")
  ) {
    designerName = "Tory Burch";
  } else if (
    lower.includes("zigzagger")
  ) {
    designerName = "Zigzagger";
  } else if (lower.includes("loewe")) {
    designerName = "Loewe";
  } else if (
    lower.includes("louboutin")
  ) {
    designerName =
      "Christian Louboutin";
  } else if (
    lower.includes("manolo")
  ) {
    designerName =
      "Manolo Blahnik";
  } else if (
    lower.includes("zimmermann")
  ) {
    designerName = "Zimmermann";
  } else if (
    lower.includes("miu miu")
  ) {
    designerName = "Miu Miu";
  } else if (
    lower.includes("ferragamo")
  ) {
    designerName = "Ferragamo";
  }

  let itemType = "Uncategorized";

  if (
    lower.includes("dress") ||
    lower.includes("gown")
  ) {
    itemType = "Dress";
  } else if (lower.includes("skirt")) {
    itemType = "Skirt";
  } else if (
    lower.includes("sandal")
  ) {
    itemType = "Sandal";
  } else if (lower.includes("mule")) {
    itemType = "Shoes";
  } else if (
    lower.includes("slipper")
  ) {
    itemType = "Slippers";
  } else if (lower.includes("boot")) {
    itemType = "Ankle Boot";
  } else if (
    lower.includes("heel") ||
    lower.includes("stiletto") ||
    lower.includes("pump")
  ) {
    itemType = "Stiletto";
  } else if (
    lower.includes("coat") ||
    lower.includes("jacket") ||
    lower.includes("blazer")
  ) {
    itemType = "Outerwear";
  } else if (
    lower.includes("bag") ||
    lower.includes("belt")
  ) {
    itemType = "Accessory";
  } else if (
    lower.includes("earring") ||
    lower.includes("necklace") ||
    lower.includes("bracelet") ||
    lower.includes("ring") ||
    lower.includes("cuff") ||
    lower.includes("pendant") ||
    lower.includes("brooch") ||
    lower.includes("choker")
  ) {
    itemType = "Accessory";
  } else if (
    lower.includes("top") ||
    lower.includes("blouse") ||
    lower.includes("bustier")
  ) {
    itemType = "Top";
  }

  const colors = [
    "yellow",
    "blue",
    "black",
    "white",
    "green",
    "red",
    "pink",
    "orange",
    "brown",
    "beige",
    "cream",
    "ivory",
    "gold",
    "silver",
    "gray",
    "grey",
    "purple",
    "navy",
    "burgundy",
  ];

  const foundColor = colors.find(
    (candidate) =>
      lower.includes(candidate),
  );

  const color = foundColor
    ? foundColor
        .charAt(0)
        .toUpperCase() +
      foundColor.slice(1)
    : "Unknown";

  let generalMaterial = "Unknown";

  if (lower.includes("crochet")) {
    generalMaterial = "Crochet";
  } else if (
    lower.includes("leather")
  ) {
    generalMaterial = "Leather";
  } else if (
    lower.includes("suede")
  ) {
    generalMaterial = "Suede";
  } else if (
    lower.includes("silk")
  ) {
    generalMaterial = "Silk";
  } else if (
    lower.includes("cotton")
  ) {
    generalMaterial = "Cotton";
  } else if (
    lower.includes("linen")
  ) {
    generalMaterial = "Linen";
  } else if (
    lower.includes("wool")
  ) {
    generalMaterial = "Wool";
  } else if (
    lower.includes("denim")
  ) {
    generalMaterial = "Denim";
  } else if (
    lower.includes("satin")
  ) {
    generalMaterial = "Satin";
  } else if (
    lower.includes("shell")
  ) {
    generalMaterial = "Shell";
  } else if (
    lower.includes("pearl")
  ) {
    generalMaterial = "Pearl";
  }

  const detailedSpecifications =
    `Brand: ${designerName} ` +
    `Type: ${itemType} ` +
    `Color: ${color} ` +
    `Material: ${generalMaterial}`;

  const narrativeDescription =
    `${itemName}. Uploaded through ` +
    "SkoMiDora Lens and cataloged " +
    "for the digital closet.";

  const styleKeywords = [
    designerName !== "Unknown"
      ? designerName
      : null,
    itemType !== "Uncategorized"
      ? itemType
      : null,
    color !== "Unknown"
      ? color
      : null,
    generalMaterial !== "Unknown"
      ? generalMaterial
      : null,
  ].filter(Boolean);

  return {
    itemName,
    itemType,
    designerName,
    color,
    generalMaterial,
    detailedSpecifications,
    narrativeDescription,
    styleKeywords,
  };
}

export async function POST(
  req: NextRequest,
) {
  let tempFilePath: string | null =
    null;

  try {
    const body = await req.json();

    const imageBase64 =
      body.imageBase64 as
        | string
        | undefined;

    const fileName =
      body.fileName as
        | string
        | undefined;

    const commercialMetadata = {
      itemName: body.itemName,
      productTitle:
        body.productTitle,
      title: body.title,
      name: body.name,
      description: body.description,
      productDescription:
        body.productDescription,
      brand: body.brand,
      brandName: body.brandName,
      designer: body.designer,
      designerName:
        body.designerName,
      color: body.color,
      colour: body.colour,
      material: body.material,
      fabric: body.fabric,
      composition: body.composition,
      itemType: body.itemType,
      category: body.category,
      productType: body.productType,
      price: body.price,
      currentPrice:
        body.currentPrice,
      salePrice: body.salePrice,
      originalPrice:
        body.originalPrice,
      currency: body.currency,
      sourceUrl: body.sourceUrl,
      productUrl: body.productUrl,
      url: body.url,
      pageUrl: body.pageUrl,
      canonicalUrl:
        body.canonicalUrl,
      styleKeywords:
        body.styleKeywords,
      keywords: body.keywords,
      tags: body.tags,
      season: body.season,
      weatherSuitability:
        body.weatherSuitability,
      eventCategory:
        body.eventCategory,
      formality: body.formality,
      ...(
        body.metadata &&
        typeof body.metadata ===
          "object" &&
        !Array.isArray(body.metadata)
          ? body.metadata
          : {}
      ),
      ...(
        body.productMetadata &&
        typeof body.productMetadata ===
          "object" &&
        !Array.isArray(
          body.productMetadata,
        )
          ? body.productMetadata
          : {}
      ),
      ...(
        body.commercialMetadata &&
        typeof
          body.commercialMetadata ===
          "object" &&
        !Array.isArray(
          body.commercialMetadata,
        )
          ? body.commercialMetadata
          : {}
      ),
      ...(
        body.awesomeScreenshotMetadata &&
        typeof
          body.awesomeScreenshotMetadata ===
          "object" &&
        !Array.isArray(
          body.awesomeScreenshotMetadata,
        )
          ? body.awesomeScreenshotMetadata
          : {}
      ),
    };

    if (!imageBase64) {
      return NextResponse.json(
        {
          error:
            "Missing imageBase64",
        },
        {
          status: 400,
        },
      );
    }

    const contentTypeMatch =
      imageBase64.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,/,
      );

    const contentType =
      contentTypeMatch?.[1] ||
      "image/jpeg";

    const ext =
      contentType.includes("png")
        ? "png"
        : "jpg";

    const originalName =
      cleanFileName(
        fileName ||
          `lens-upload.${ext}`,
      );

    const baseName =
      originalName.replace(
        /\.[^.]+$/,
        "",
      );

    const safeFileName =
      `${Date.now()}-${baseName}.${ext}`;

    const imagePath =
      `public_wardrobe_items/${safeFileName}`;

    const base64Data =
      imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

    const buffer = Buffer.from(
      base64Data,
      "base64",
    );

    tempFilePath = path.join(
      os.tmpdir(),
      `${crypto.randomUUID()}.${ext}`,
    );

    await fs.writeFile(
      tempFilePath,
      buffer,
    );

    const storage = new Storage();

    const bucket =
      storage.bucket(BUCKET_NAME);

    await bucket.upload(
      tempFilePath,
      {
        destination: imagePath,
        resumable: false,
        metadata: {
          contentType,
          cacheControl:
            "public,max-age=31536000",
        },
      },
    );

    // DIAGNOSTIC (temporary): verify the object is actually retrievable
    // immediately after bucket.upload() resolves. Self-contained - cannot
    // affect the real upload response either way.
    try {
      const [existsAfterUpload] =
        await bucket
          .file(imagePath)
          .exists();
      console.log(
        `[storage-upload] post-upload existence check for ${imagePath}: ${existsAfterUpload}`,
      );
    } catch (existsCheckError) {
      console.error(
        `[storage-upload] post-upload existence check FAILED for ${imagePath}:`,
        existsCheckError,
      );
    }

    const imageUrl =
      publicStorageUrl(
        BUCKET_NAME,
        imagePath,
      );

    const db = getFirestore();

    const aiMetadata =
      await analyzeImageMetadata(
        imageBase64,
        contentType,
        originalName,
      );

    const metadata =
      normalizeWardrobeMetadata(
        inferLensMetadata(
          originalName,
        ),
        {
          ...aiMetadata,
          ...commercialMetadata,
        },
      );

    if (!metadata.designerName || metadata.designerName === "Unknown") {
      const knownDesigners = await getKnownDesigners(db);
      const catalogMatch = matchKnownDesigner(originalName, knownDesigners);
      if (catalogMatch) {
        console.log("[storage-upload] Matched designer from existing catalog:", catalogMatch, "for file", originalName);
        metadata.designerName = catalogMatch;
        metadata.detailedSpecifications = metadata.detailedSpecifications.replace(/^Brand: Unknown/, "Brand: " + catalogMatch);
      }
    }

    const canonicalItemType =
      getCanonicalWardrobeType(
        metadata.itemType,
        metadata.itemName,
      ) ||
      "Uncategorized";

    const canonicalCategory =
      getWardrobeCategory(
        metadata.category,
        canonicalItemType,
        metadata.itemName,
      ) ||
      "Uncategorized";

    // normalizeWardrobeMetadata() already merges brand/brandName/manufacturer
    // into designerName, and material/fabric/composition into generalMaterial
    // (see src/lib/wardrobeMetadata.ts). The raw brand/material fields from
    // the AI response don't survive onto the returned object, so we read the
    // merged fields directly instead of re-checking fields that are never set.
    const displayBrand =
      metadata.designerName ||
      "Unknown";

    const displayDesigner =
      metadata.designerName ||
      "Unknown";

    const displayMaterial =
      metadata.generalMaterial ||
      "Unknown";

    const meaningfulFashionLabel = (
      value: unknown,
    ): string | null => {
      if (
        value === null ||
        value === undefined
      ) {
        return null;
      }

      const cleaned = String(value)
        .replace(/\s+/g, " ")
        .trim();

      if (!cleaned) return null;

      const normalized =
        cleaned.toLowerCase();

      const invalidValues = new Set([
        "unknown",
        "unknown brand",
        "unknown designer",
        "n/a",
        "na",
        "none",
        "null",
        "undefined",
        "not available",
        "not identified",
        "not visible",
        "unbranded",
        "generic",
      ]);

      return invalidValues.has(normalized)
        ? null
        : cleaned;
    };

    const detectedBrand =
      meaningfulFashionLabel(
        displayBrand,
      );

    const detectedDesigner =
      meaningfulFashionLabel(
        displayDesigner,
      );

    const resolvedBrand =
      detectedBrand ||
      detectedDesigner ||
      "Unknown";

    const resolvedDesigner =
      detectedDesigner ||
      detectedBrand ||
      "Unknown";

    const brandResolutionSource =
      detectedBrand &&
      detectedDesigner
        ? "brand-and-designer-detected"
        : detectedBrand
          ? "brand-detected-designer-copied"
          : detectedDesigner
            ? "designer-detected-brand-copied"
            : "unresolved";

    const aiAnalyzed =
      Object.keys(aiMetadata).length > 0;

    const docRef = await db
      .collection(
        "publicWardrobeItems",
      )
      .add({
        itemName:
          metadata.itemName,
        name: metadata.itemName,
        title: metadata.itemName,
        displayName:
          metadata.itemName,
        aiFriendlyName:
          metadata.itemName,

        itemType:
          canonicalItemType,
        type:
          canonicalItemType,
        category:
          canonicalCategory,

        designer:
          resolvedDesigner,
        designerName:
          resolvedDesigner,
        brand: resolvedBrand,
        brandName: resolvedBrand,
        manufacturer:
          resolvedBrand,
        label: resolvedBrand,
        fashionHouse:
          resolvedDesigner,
        detectedBrand:
          resolvedBrand,
        detectedDesigner:
          resolvedDesigner,
        brandDesignerResolved:
          resolvedBrand !==
          "Unknown",
        brandResolutionSource,

        color: metadata.color,
        generalMaterial:
          displayMaterial,
        material: displayMaterial,
        materials:
          displayMaterial,
        detailedSpecifications:
          metadata
            .detailedSpecifications,
        narrativeDescription:
          metadata
            .narrativeDescription,
        styleKeywords:
          metadata.styleKeywords,

        season: metadata.season,
        weatherSuitability:
          metadata
            .weatherSuitability,
        eventCategory:
          metadata.eventCategory,
        formality:
          metadata.formality,
        tags: metadata.tags,

        sourceUrl:
          metadata.sourceUrl,
        productUrl:
          metadata.productUrl,
        sourceDomain:
          metadata.sourceDomain,
        price: metadata.price,
        priceText:
          metadata.priceText,
        currency:
          metadata.currency,
        metadataSource:
          aiAnalyzed
            ? "Gemini Vision Upload Analysis"
            : metadata
                .metadataSource,
        metadataConfidence:
          aiAnalyzed
            ? Math.max(
                Number(
                  metadata
                    .metadataConfidence ||
                    0,
                ),
                Number(
                  (
                    aiMetadata as Record<
                      string,
                      unknown
                    >
                  )
                    .metadataConfidence ||
                    0.75,
                ),
              )
            : metadata
                .metadataConfidence,
        aiMetadata,

        imageUrl,
        imagePath,
        storageBucket:
          BUCKET_NAME,
        source:
          "SkoMiDora Lens",
        imageStatus: "available",
        uploadStatus: "uploaded",
        aiAnalyzed,

        createdAt:
          FieldValue
            .serverTimestamp(),
        updatedAt:
          FieldValue
            .serverTimestamp(),
      });

    return NextResponse.json({
      ok: true,
      bucket: BUCKET_NAME,
      imagePath,
      imageUrl,
      firestoreId: docRef.id,
      metadata: {
        ...metadata,
        itemType:
          canonicalItemType,
        category:
          canonicalCategory,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Storage upload API error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Storage upload failed";

    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(
            (
              error as {
                code?: unknown;
              }
            ).code || "",
          ) || null
        : null;

    return NextResponse.json(
      {
        error: message,
        code,
      },
      {
        status: 500,
      },
    );
  } finally {
    if (tempFilePath) {
      await fs
        .unlink(tempFilePath)
        .catch(() => {});
    }
  }
}// deploy-trigger 1785852280
// deploy-trigger 1785853539

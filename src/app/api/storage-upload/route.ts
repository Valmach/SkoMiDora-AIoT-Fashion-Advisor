import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { normalizeWardrobeMetadata } from "@/lib/wardrobeMetadata";
import { WARDROBE_TYPES, type WardrobeType } from "@/lib/wardrobe-taxonomy";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "styleai-footwear",
  });
}

const BUCKET_NAME =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "styleai-footwear.firebasestorage.app";


type IngestWardrobeType = WardrobeType | "Uncategorized";

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeWardrobeType(value: unknown): IngestWardrobeType {
  const raw = cleanText(value);
  if (!raw) return "Uncategorized";

  const compact = raw.toLowerCase();

  const directMatch = WARDROBE_TYPES.find(
    (type) => type.toLowerCase() === compact
  );
  if (directMatch) return directMatch;

  if (/\b(dress|dresses|gown|gowns)\b/.test(compact)) return "Dress";

  if (/\b(t-shirt|t-shirts|tshirt|tshirts|tee|tees|sweatshirt|sweatshirts|sweats)\b/.test(compact)) {
    return "T-Shirt";
  }

  if (/\b(shirt|shirts|blouse|blouses|tank top|tank tops|top|tops|bustier|bustiers)\b/.test(compact)) {
    return "Shirt";
  }

  if (/\b(blazer|blazers)\b/.test(compact)) return "Blazer";
  if (/\b(suit|suits)\b/.test(compact)) return "Suit";
  if (/\b(coat|coats|parka|parkas|trench|trenches)\b/.test(compact)) return "Coat";
  if (/\b(jacket|jackets|outerwear)\b/.test(compact)) return "Jacket";
  if (/\b(jean|jeans|denim)\b/.test(compact)) return "Jeans";
  if (/\b(trouser|trousers|pant|pants|slack|slacks)\b/.test(compact)) return "Trousers";
  if (/\b(short|shorts)\b/.test(compact)) return "Shorts";
  if (/\b(skirt|skirts)\b/.test(compact)) return "Skirt";
  if (/\b(sneaker|sneakers|trainer|trainers)\b/.test(compact)) return "Sneakers";
  if (/\b(boot|boots|ankle boot|ankle boots)\b/.test(compact)) return "Boots";
  if (/\b(heel|heels|stiletto|stilettos|pump|pumps)\b/.test(compact)) return "Heels";
  if (/\b(flat|flats|loafer|loafers|mule|mules|slipper|slippers)\b/.test(compact)) return "Flats";
  if (/\b(sandal|sandals)\b/.test(compact)) return "Sandals";
  if (/\b(handbag|handbags|bag|bags|tote|totes|clutch|clutches)\b/.test(compact)) return "Bag";
  if (/\b(jewelry|jewellery|jewel|jewels)\b/.test(compact)) return "Jewelry";
  if (/\b(scarf|scarves|wrap|wraps)\b/.test(compact)) return "Scarf";
  if (/\b(hat|hats|cap|caps)\b/.test(compact)) return "Hat";
  if (/\b(watch|watches)\b/.test(compact)) return "Watch";
  if (/\b(belt|belts)\b/.test(compact)) return "Belt";

  return "Uncategorized";
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
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

function publicStorageUrl(bucket: string, objectPath: string) {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${bucket}/${encodedPath}`;
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return {};

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return {};
  }
}

async function analyzeImageMetadata(imageBase64: string, mimeType: string, fileName: string) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

  if (!apiKey) return {};

  try {
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptExample = {
      itemName: "specific product-style name",
      brand: "brand if visible or recognizable, otherwise Unknown",
      brandName: "same as brand",
      designer: "designer or fashion house if visible or recognizable, otherwise Unknown",
      designerName: "same as designer",
      itemType: `one of: ${[...WARDROBE_TYPES, "Uncategorized"].join(" | ")}`,
      category: "same canonical value as itemType",
      color: "dominant color",
      material: "likely material",
      generalMaterial: "likely material",
      narrativeDescription: "one polished sentence",
      styleKeywords: ["3 to 8 keywords"],
      tags: ["searchable tags"],
      season: ["spring", "summer", "fall", "winter", "all-season"],
      weatherSuitability: ["hot", "warm", "mild", "cool", "cold", "rain", "indoor", "dry"],
      eventCategory: ["city", "casual", "evening", "cocktail", "business-casual", "travel", "resort"],
      formality: "casual | smart-casual | business-casual | cocktail | formal",
      metadataConfidence: 0.75,
    };

    const prompt = [
      "Analyze this fashion or footwear image for SkoMiDora.",
      "Return ONLY valid JSON matching this shape:",
      JSON.stringify(promptExample, null, 2),
      "itemType must be exactly one value from the supplied canonical wardrobe taxonomy. Use Uncategorized only when the item cannot be classified reliably.",
      "For footwear, apparel, handbags, and luxury fashion, the designer house is normally also the brand. When only the designer is identifiable, return that designer name in both the brand and designer fields. When only the brand is identifiable, return it in both fields. Preserve different values when the image clearly represents a collaboration, custom maker, atelier, diffusion label, or licensed brand. Do not guess luxury brands without visible evidence.",
      "Original filename: " + fileName,
    ].join("\n");

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const parsed = extractJson(result.response.text());
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("SkoMiDora upload image metadata analysis skipped:", error);
    return {};
  }
}

function inferLensMetadata(fileName: string) {
  const itemName = titleFromFileName(fileName) || "SkoMiDora Lens Upload";
  const lower = itemName.toLowerCase();

  let designerName = "Unknown";
  if (lower.includes("dolce") || lower.includes("gabbana")) designerName = "Dolce & Gabbana";
  else if (lower.includes("ganni")) designerName = "GANNI";
  else if (lower.includes("prada")) designerName = "Prada";
  else if (lower.includes("tory burch")) designerName = "Tory Burch";
  else if (lower.includes("zigzagger")) designerName = "Zigzagger";
  else if (lower.includes("loewe")) designerName = "Loewe";
  else if (lower.includes("louboutin")) designerName = "Christian Louboutin";
  else if (lower.includes("manolo")) designerName = "Manolo Blahnik";
  else if (lower.includes("zimmermann")) designerName = "Zimmermann";
  else if (lower.includes("miu miu")) designerName = "Miu Miu";
  else if (lower.includes("ferragamo")) designerName = "Ferragamo";

  let itemType: IngestWardrobeType = "Uncategorized";
  if (lower.includes("dress") || lower.includes("gown")) itemType = "Dress";
  else if (lower.includes("t-shirt") || lower.includes("tshirt") || lower.includes(" tee ")) itemType = "T-Shirt";
  else if (lower.includes("blouse") || lower.includes("shirt") || lower.includes("tank top") || lower.includes("bustier") || lower.includes("top")) itemType = "Shirt";
  else if (lower.includes("blazer")) itemType = "Blazer";
  else if (lower.includes("suit")) itemType = "Suit";
  else if (lower.includes("coat") || lower.includes("trench") || lower.includes("parka")) itemType = "Coat";
  else if (lower.includes("jacket") || lower.includes("outerwear")) itemType = "Jacket";
  else if (lower.includes("jean") || lower.includes("denim")) itemType = "Jeans";
  else if (lower.includes("trouser") || lower.includes("pant") || lower.includes("slack")) itemType = "Trousers";
  else if (lower.includes("short")) itemType = "Shorts";
  else if (lower.includes("skirt")) itemType = "Skirt";
  else if (lower.includes("sneaker") || lower.includes("trainer")) itemType = "Sneakers";
  else if (lower.includes("boot")) itemType = "Boots";
  else if (lower.includes("heel") || lower.includes("stiletto") || lower.includes("pump")) itemType = "Heels";
  else if (lower.includes("flat") || lower.includes("loafer") || lower.includes("mule") || lower.includes("slipper")) itemType = "Flats";
  else if (lower.includes("sandal")) itemType = "Sandals";
  else if (lower.includes("handbag") || lower.includes("bag") || lower.includes("tote") || lower.includes("clutch")) itemType = "Bag";
  else if (lower.includes("jewelry") || lower.includes("jewellery")) itemType = "Jewelry";
  else if (lower.includes("scarf")) itemType = "Scarf";
  else if (lower.includes("hat")) itemType = "Hat";
  else if (lower.includes("watch")) itemType = "Watch";
  else if (lower.includes("belt")) itemType = "Belt";

  const colors = [
    "yellow", "blue", "black", "white", "green", "red", "pink", "orange",
    "brown", "beige", "cream", "ivory", "gold", "silver", "gray", "grey",
    "purple", "navy", "burgundy"
  ];

  const foundColor = colors.find((c) => lower.includes(c));
  const color = foundColor
    ? foundColor.charAt(0).toUpperCase() + foundColor.slice(1)
    : "Unknown";

  let generalMaterial = "Unknown";
  if (lower.includes("crochet")) generalMaterial = "Crochet";
  else if (lower.includes("leather")) generalMaterial = "Leather";
  else if (lower.includes("suede")) generalMaterial = "Suede";
  else if (lower.includes("silk")) generalMaterial = "Silk";
  else if (lower.includes("cotton")) generalMaterial = "Cotton";
  else if (lower.includes("linen")) generalMaterial = "Linen";
  else if (lower.includes("wool")) generalMaterial = "Wool";
  else if (lower.includes("denim")) generalMaterial = "Denim";
  else if (lower.includes("satin")) generalMaterial = "Satin";

  const detailedSpecifications =
    `Brand: ${designerName} Type: ${itemType} Color: ${color} Material: ${generalMaterial}`;

  const narrativeDescription =
    `${itemName}. Uploaded through SkoMiDora Lens and cataloged for the digital closet.`;

  const styleKeywords = [
    designerName !== "Unknown" ? designerName : null,
    itemType !== "Uncategorized" ? itemType : null,
    color !== "Unknown" ? color : null,
    generalMaterial !== "Unknown" ? generalMaterial : null,
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

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const body = await req.json();

    const imageBase64 = body.imageBase64 as string | undefined;
    const fileName = body.fileName as string | undefined;

    const commercialMetadata = {
      itemName: body.itemName,
      productTitle: body.productTitle,
      title: body.title,
      name: body.name,
      description: body.description,
      productDescription: body.productDescription,
      brand: body.brand,
      brandName: body.brandName,
      designer: body.designer,
      designerName: body.designerName,
      color: body.color,
      colour: body.colour,
      material: body.material,
      fabric: body.fabric,
      composition: body.composition,
      category: body.category,
      productType: body.productType,
      price: body.price,
      currentPrice: body.currentPrice,
      salePrice: body.salePrice,
      originalPrice: body.originalPrice,
      currency: body.currency,
      sourceUrl: body.sourceUrl,
      productUrl: body.productUrl,
      url: body.url,
      pageUrl: body.pageUrl,
      canonicalUrl: body.canonicalUrl,
      styleKeywords: body.styleKeywords,
      keywords: body.keywords,
      tags: body.tags,
      season: body.season,
      weatherSuitability: body.weatherSuitability,
      eventCategory: body.eventCategory,
      formality: body.formality,
      ...(body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {}),
      ...(body.productMetadata && typeof body.productMetadata === "object" && !Array.isArray(body.productMetadata) ? body.productMetadata : {}),
      ...(body.commercialMetadata && typeof body.commercialMetadata === "object" && !Array.isArray(body.commercialMetadata) ? body.commercialMetadata : {}),
      ...(body.awesomeScreenshotMetadata && typeof body.awesomeScreenshotMetadata === "object" && !Array.isArray(body.awesomeScreenshotMetadata) ? body.awesomeScreenshotMetadata : {}),
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    const contentTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const contentType = contentTypeMatch?.[1] || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";

    const originalName = cleanFileName(fileName || `lens-upload.${ext}`);
    const baseName = originalName.replace(/\.[^.]+$/, "");
    const safeFileName = `${Date.now()}-${baseName}.${ext}`;
    const imagePath = `public_wardrobe_items/${safeFileName}`;

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const buffer = Buffer.from(base64Data, "base64");

    tempFilePath = path.join(os.tmpdir(), `${crypto.randomUUID()}.${ext}`);
    await fs.writeFile(tempFilePath, buffer);

    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    await bucket.upload(tempFilePath, {
      destination: imagePath,
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public,max-age=31536000",
      },
    });

    const imageUrl = publicStorageUrl(BUCKET_NAME, imagePath);

    const db = getFirestore();

    const aiMetadata = await analyzeImageMetadata(imageBase64, contentType, originalName);
    const aiRecord = aiMetadata as Record<string, unknown>;
    const commercialRecord = commercialMetadata as Record<string, unknown>;

    const metadata = normalizeWardrobeMetadata(
      inferLensMetadata(originalName),
      {
        ...aiMetadata,
        ...commercialMetadata,
      }
    );

    // Canonicalize only after filename inference, Gemini metadata, and
    // commercial metadata have been merged.
    const canonicalItemType = canonicalizeWardrobeType(
      metadata.itemType ||
      aiRecord["itemType"] ||
      aiRecord["category"] ||
      commercialRecord["productType"] ||
      commercialRecord["category"]
    );

    const displayBrand =
      cleanText(commercialRecord["brandName"]) ||
      cleanText(commercialRecord["brand"]) ||
      cleanText(aiRecord["brandName"]) ||
      cleanText(aiRecord["brand"]) ||
      metadata.designerName ||
      "Unknown";

    const displayDesigner =
      cleanText(commercialRecord["designerName"]) ||
      cleanText(commercialRecord["designer"]) ||
      cleanText(aiRecord["designerName"]) ||
      cleanText(aiRecord["designer"]) ||
      metadata.designerName ||
      displayBrand ||
      "Unknown";

    const displayMaterial =
      metadata.generalMaterial ||
      cleanText(commercialRecord["material"]) ||
      cleanText(commercialRecord["fabric"]) ||
      cleanText(aiRecord["generalMaterial"]) ||
      cleanText(aiRecord["material"]) ||
      "Unknown";

    const meaningfulFashionLabel = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;

      const cleaned = String(value).replace(/\s+/g, " ").trim();

      if (!cleaned) return null;

      const normalized = cleaned.toLowerCase();

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
        "generic"
      ]);

      return invalidValues.has(normalized) ? null : cleaned;
    };

    const detectedBrand =
      meaningfulFashionLabel(commercialRecord["brand"]) ||
      meaningfulFashionLabel(commercialRecord["brandName"]) ||
      meaningfulFashionLabel(aiRecord["brand"]) ||
      meaningfulFashionLabel(aiRecord["brandName"]) ||
      meaningfulFashionLabel(displayBrand);

    const detectedDesigner =
      meaningfulFashionLabel(commercialRecord["designer"]) ||
      meaningfulFashionLabel(commercialRecord["designerName"]) ||
      meaningfulFashionLabel(aiRecord["designer"]) ||
      meaningfulFashionLabel(aiRecord["designerName"]) ||
      meaningfulFashionLabel(aiRecord["fashionHouse"]) ||
      meaningfulFashionLabel(metadata.designerName) ||
      meaningfulFashionLabel(displayDesigner);

    // The brand and designer are commonly identical for footwear and fashion.
    // Only use the opposite field as a fallback when one value is missing.
    const resolvedBrand =
      detectedBrand ||
      detectedDesigner ||
      "Unknown";

    const resolvedDesigner =
      detectedDesigner ||
      detectedBrand ||
      "Unknown";

    const brandResolutionSource =
      detectedBrand && detectedDesigner
        ? "brand-and-designer-detected"
        : detectedBrand
          ? "brand-detected-designer-copied"
          : detectedDesigner
            ? "designer-detected-brand-copied"
            : "unresolved";

    const aiAnalyzed = Object.keys(aiMetadata).length > 0;

    const docRef = await db.collection("publicWardrobeItems").add({
      itemName: metadata.itemName,
      name: metadata.itemName,
      title: metadata.itemName,
      displayName: metadata.itemName,
      aiFriendlyName: metadata.itemName,

      itemType: canonicalItemType,
      type: canonicalItemType,
      category: canonicalItemType,

      designer: resolvedDesigner,
      designerName: resolvedDesigner,
      brand: resolvedBrand,
      brandName: resolvedBrand,
      manufacturer: resolvedBrand,
      label: resolvedBrand,
      fashionHouse: resolvedDesigner,
      detectedBrand: resolvedBrand,
      detectedDesigner: resolvedDesigner,
      brandDesignerResolved: resolvedBrand !== "Unknown",
      brandResolutionSource,

      color: metadata.color,
      generalMaterial: displayMaterial,
      material: displayMaterial,
      materials: displayMaterial,
      detailedSpecifications: metadata.detailedSpecifications,
      narrativeDescription: metadata.narrativeDescription,
      styleKeywords: metadata.styleKeywords,

      season: metadata.season,
      weatherSuitability: metadata.weatherSuitability,
      eventCategory: metadata.eventCategory,
      formality: metadata.formality,
      tags: metadata.tags,

      sourceUrl: metadata.sourceUrl,
      productUrl: metadata.productUrl,
      sourceDomain: metadata.sourceDomain,
      price: metadata.price,
      priceText: metadata.priceText,
      currency: metadata.currency,
      metadataSource: aiAnalyzed ? "Gemini Vision Upload Analysis" : metadata.metadataSource,
      metadataConfidence: aiAnalyzed
        ? Math.max(Number(metadata.metadataConfidence || 0), Number((aiMetadata as any).metadataConfidence || 0.75))
        : metadata.metadataConfidence,
      aiMetadata,

      imageUrl,
      imagePath,
      storageBucket: BUCKET_NAME,
      source: "SkoMiDora Lens",
      imageStatus: "available",
      uploadStatus: "uploaded",
      aiAnalyzed,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      bucket: BUCKET_NAME,
      imagePath,
      imageUrl,
      firestoreId: docRef.id,
      metadata: {
        ...metadata,
        itemType: canonicalItemType,
        type: canonicalItemType,
        category: canonicalItemType,
      },
    });
  } catch (error: any) {
    console.error("Storage upload API error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Storage upload failed",
        code: error?.code || null,
      },
      { status: 500 }
    );
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}
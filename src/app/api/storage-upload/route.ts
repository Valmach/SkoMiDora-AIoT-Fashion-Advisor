import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

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

  let itemType = "Uncategorized";
  if (lower.includes("dress") || lower.includes("gown")) itemType = "Dress";
  else if (lower.includes("skirt")) itemType = "Skirt";
  else if (lower.includes("sandal")) itemType = "Sandal";
  else if (lower.includes("mule")) itemType = "Shoes";
  else if (lower.includes("slipper")) itemType = "Slippers";
  else if (lower.includes("boot")) itemType = "Ankle Boot";
  else if (lower.includes("heel") || lower.includes("stiletto") || lower.includes("pump")) itemType = "Stiletto";
  else if (lower.includes("coat") || lower.includes("jacket") || lower.includes("blazer")) itemType = "Outerwear";
  else if (lower.includes("bag") || lower.includes("belt")) itemType = "Accessory";
  else if (lower.includes("top") || lower.includes("blouse") || lower.includes("bustier")) itemType = "Top";

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
    const metadata = inferLensMetadata(originalName);

    const docRef = await db.collection("publicWardrobeItems").add({
      itemName: metadata.itemName,
      name: metadata.itemName,

      itemType: metadata.itemType,
      type: metadata.itemType,
      category: metadata.itemType,

      designer: metadata.designerName,
      designerName: metadata.designerName,
      brand: metadata.designerName,

      color: metadata.color,
      generalMaterial: metadata.generalMaterial,
      detailedSpecifications: metadata.detailedSpecifications,
      narrativeDescription: metadata.narrativeDescription,
      styleKeywords: metadata.styleKeywords,

      imageUrl,
      imagePath,
      storageBucket: BUCKET_NAME,
      source: "SkoMiDora Lens",
      imageStatus: "available",
      uploadStatus: "uploaded",
      aiAnalyzed: false,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      bucket: BUCKET_NAME,
      imagePath,
      imageUrl,
      firestoreId: docRef.id,
      metadata,
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

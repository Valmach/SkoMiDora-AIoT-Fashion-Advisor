import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";

if (!getApps().length) {
  initializeApp();
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
    .trim();
}

function publicStorageUrl(bucket: string, objectPath: string) {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return "https://storage.googleapis.com/" + bucket + "/" + encodedPath;
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

    const originalName = cleanFileName(fileName || "lens-upload." + ext);
    const baseName = originalName.replace(/\.[^.]+$/, "");
    const safeFileName = Date.now() + "-" + baseName + "." + ext;
    const imagePath = "public_wardrobe_items/" + safeFileName;

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const buffer = Buffer.from(base64Data, "base64");

    tempFilePath = path.join(os.tmpdir(), crypto.randomUUID() + "." + ext);
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

    const lensTitle = titleFromFileName(originalName) || "SkoMiDora Lens Upload";

    const docRef = await db.collection("publicWardrobeItems").add({
      itemName: lensTitle,
      name: lensTitle,
      designer: "Unknown",
      brand: "Unknown",
      itemType: "Uncategorized",
      category: "Uncategorized",
      type: "Lens Upload",
      color: "Unknown",
      imageUrl,
      imagePath,
      storageBucket: BUCKET_NAME,
      source: "SkoMiDora Lens",
      uploadStatus: "uploaded",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      bucket: BUCKET_NAME,
      imagePath,
      imageUrl,
      firestoreId: docRef.id,
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

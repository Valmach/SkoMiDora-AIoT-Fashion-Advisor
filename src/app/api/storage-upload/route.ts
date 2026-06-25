import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import crypto from "crypto";

export const runtime = "nodejs";

const BUCKET_NAME =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "styleai-footwear.firebasestorage.app";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const imageBase64 = body.imageBase64 as string | undefined;
    const fileName = body.fileName as string | undefined;

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    const safeFileName = cleanFileName(fileName || `lens_${Date.now()}.jpg`);
    const imagePath = `public_wardrobe_items/${safeFileName}`;

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const buffer = Buffer.from(base64Data, "base64");
    const token = crypto.randomUUID();

    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(imagePath);

    await file.save(buffer, {
      resumable: false,
      contentType: "image/jpeg",
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const encodedPath = encodeURIComponent(imagePath);

    const imageUrl =
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodedPath}` +
      `?alt=media&token=${token}`;

    return NextResponse.json({
      ok: true,
      bucket: BUCKET_NAME,
      imagePath,
      imageUrl,
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
  }
}

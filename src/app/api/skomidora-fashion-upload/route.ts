import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
export const runtime = "nodejs";
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (getApps().length === 0) {
  initializeApp();
}
const BUCKET_NAME =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "";
function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
}
function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
function publicStorageUrl(bucket: string, imagePath: string) {
  return `https://storage.googleapis.com/${bucket}/${encodeURIComponent(
    imagePath,
  ).replace(/%2F/g, "/")}`;
}
async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  contentParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  >,
  fileName: string,
  maxRetries = 3,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(contentParts);
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : String(error);
      const isRetryable =
        message.includes("429") ||
        message.includes("Too Many Requests") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("503") ||
        message.includes("Service Unavailable") ||
        message.includes("currently experiencing high demand");
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      const delayMs = 2000 * Math.pow(2, attempt);
      console.warn(
        "[skomidora-fashion-upload] Vision AI transient error for",
        fileName,
        `- retrying (attempt ${attempt + 1}/${maxRetries}) in ${delayMs}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
async function analyzeFashionImage(
  imageBase64: string,
  contentType: string,
  fileName: string,
) {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  if (!apiKey) {
    console.warn(
      "[skomidora-fashion-upload] Vision AI SKIPPED for",
      fileName,
      "- reason: no API key found.",
    );
    return {};
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
    });
    const prompt = [
      "You are a luxury fashion cataloger writing for an online storefront.",
      "Analyze this clothing/accessory image and the provided filename, and return ONLY raw JSON (no markdown fences, no preamble) matching this exact shape:",
      "{",
      '  "itemName": "string",',
      '  "designerName": "string, Unknown if not identifiable",',
      '  "category": "string, e.g. Dresses, Outerwear, Bags, Shoes",',
      '  "color": "string, Unknown if not visible",',
      '  "material": "string, Unknown if not identifiable",',
      '  "story": "a warm, evocative 2-3 sentence narrative about this piece - the kind of copy used on a boutique product page",',
      '  "priceEstimateLow": number in USD,',
      '  "priceEstimateHigh": number in USD,',
      '  "priceConfidence": "low" | "medium" | "high",',
      '  "priceReasoning": "one short sentence explaining the estimate, e.g. comparable designer resale pricing"',
      "}",
      "A designer or brand name written in the provided filename is valid evidence - use it even if no logo or tag is visible in the image itself.",
      "The price estimate should reflect realistic resale/secondary-market value for a piece like this, not original retail - and should be clearly conservative when the designer is Unknown.",
      `Filename: ${fileName}`,
    ].join("\n");
    const result = await generateContentWithRetry(
      model,
      [
        { text: prompt },
        {
          inlineData: {
            mimeType: contentType,
            data: imageBase64,
          },
        },
      ],
      fileName,
    );
    const rawText = result.response.text();
    const parsed = extractJson(rawText);
    const isValid =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed);
    if (!isValid) {
      console.warn(
        "[skomidora-fashion-upload] Vision AI FAILED for",
        fileName,
        "- reason: JSON parsing failed. Raw response (first 500 chars):",
        rawText.slice(0, 500),
      );
      return {};
    }
    console.log(
      "[skomidora-fashion-upload] Vision AI SUCCEEDED for",
      fileName,
      "- keys returned:",
      Object.keys(parsed).join(", "),
    );
    return parsed;
  } catch (error) {
    console.warn(
      "[skomidora-fashion-upload] Vision AI FAILED for",
      fileName,
      "- reason: API call threw an error:",
      error,
    );
    return {};
  }
}
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }
    const originalName = cleanFileName(file.name);
    const contentType = file.type || "image/jpeg";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBase64 = buffer.toString("base64");
    const tempFilePath = path.join(
      os.tmpdir(),
      `${crypto.randomUUID()}-${originalName}`,
    );
    await fs.writeFile(tempFilePath, buffer);
    const imagePath = `SkoMiDora Fashion/${Date.now()}-${originalName}`;
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
    await fs.unlink(tempFilePath).catch(() => {});
    const imageUrl = publicStorageUrl(BUCKET_NAME, imagePath);
    const aiResult = await analyzeFashionImage(
      imageBase64,
      contentType,
      originalName,
    );
    const aiAnalyzed = Object.keys(aiResult).length > 0;
    const itemName =
      aiResult.itemName ||
      originalName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
    const designerName = aiResult.designerName || "Unknown";
    const category = aiResult.category || "Uncategorized";
    const color = aiResult.color || "Unknown";
    const material = aiResult.material || "Unknown";
    const story =
      aiResult.story ||
      `${itemName}. A distinctive addition to the SkoMiDora Fashion collection.`;
    const priceEstimateLow =
      typeof aiResult.priceEstimateLow === "number"
        ? aiResult.priceEstimateLow
        : null;
    const priceEstimateHigh =
      typeof aiResult.priceEstimateHigh === "number"
        ? aiResult.priceEstimateHigh
        : null;
    const priceConfidence = aiResult.priceConfidence || "low";
    const priceReasoning = aiResult.priceReasoning || "";
    const db = getFirestore();
    const docRef = db.collection("skomidoraFashionItems").doc();
    await docRef.set({
      itemName,
      designerName,
      category,
      color,
      material,
      story,
      priceEstimateLow,
      priceEstimateHigh,
      priceConfidence,
      priceReasoning,
      priceIsEstimate: true,
      imageUrl,
      imagePath,
      storageBucket: BUCKET_NAME,
      source: "SkoMiDora Fashion Upload",
      aiAnalyzed,
      metadataSource: aiAnalyzed
        ? "SkoMiDora Fashion Vision AI"
        : "SkoMiDora Fashion Filename",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json({
      success: true,
      id: docRef.id,
      imageUrl,
      aiAnalyzed,
    });
  } catch (error) {
    console.error(
      "[skomidora-fashion-upload] Upload failed:",
      error,
    );
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 },
    );
  }
}
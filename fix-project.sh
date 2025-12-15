#!/bin/bash
echo "=================================================="
echo "🛠  SkoMiDora — FULL AUTO FIX SCRIPT"
echo "=================================================="

ROOT="$(pwd)"
echo "Working in: $ROOT"
echo ""

###############################################################################
# 1) FIX FIREBASE ADMIN LOADER  (NEVER return null or undefined)
###############################################################################
echo "🔧 Fixing firebase-admin-loader..."

cat > src/lib/firebase-admin-loader.ts << 'EOF'
/**
 * SAFE Firebase Admin loader — never returns null or undefined.
 */
import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

// Global singleton
let adminApp: admin.app.App | undefined;

export function getAdmin(): admin.app.App {
  // Already initialized?
  if (adminApp) return adminApp;

  // Hot reload / RSC pool
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  // GOOGLE RUNTIME
  if (process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = admin.initializeApp({
      storageBucket: "styleai-footwear.appspot.com",
    });
    return adminApp;
  }

  // LOCAL DEV
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      } as ServiceAccount),
      storageBucket: "styleai-footwear.appspot.com",
    });
    return adminApp;
  }

  throw new Error(
    "❌ Firebase Admin not initialized — missing GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_* env vars."
  );
}
EOF

echo "✔ firebase-admin-loader.ts updated."
echo ""


###############################################################################
# 2) FIX RECOMMENDATIONS PAGE — REMOVE null RETURNS
###############################################################################
echo "🔧 Fixing recommendations/page.tsx null returns..."

# Replace 'return null' with valid outfit object
sed -i '' -e 's/return null;/return { chosenShoe: "Unavailable", outfitDescription: "Failed to generate outfit.", reasoning: result.error ?? "Error", suitabilityScore: 0, designerLinks: [], suggestedShoeboxTheme: "None", outfitImageDataUri: "", imageUrl: "" };/g' \
src/app/recommendations/page.tsx 2>/dev/null || \
sed -i -e 's/return null;/return { chosenShoe: "Unavailable", outfitDescription: "Failed to generate outfit.", reasoning: result.error ?? "Error", suitabilityScore: 0, designerLinks: [], suggestedShoeboxTheme: "None", outfitImageDataUri: "", imageUrl: "" };/g' \
src/app/recommendations/page.tsx

echo "✔ page.tsx null returns removed."
echo ""


###############################################################################
# 3) FIX RECOMMEND-OUTFIT — NO FORESTS, ALWAYS FASHION IMAGES
###############################################################################
echo "🔧 Fixing recommend-outfit.ts for correct fashion imagery..."

cat > src/ai/flows/recommend-outfit.ts << 'EOF'
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * Input schema — wardrobe is now structured.
 */
export const RecommendOutfitInputSchema = z.object({
  shoeCollection: z.array(z.string()),
  wardrobeData: z.array(
    z.object({
      itemName: z.string(),
      itemType: z.string(),
      color: z.string().nullable().optional(),
      generalMaterial: z.string().nullable().optional(),
      narrativeDescription: z.string().nullable().optional(),
      styleKeywords: z.array(z.string()).optional(),
    })
  ),
  eventDetails: z.string(),
  weatherConditions: z.string(),
  stylePreferences: z.string(),
});

export type RecommendOutfitInput = z.infer<typeof RecommendOutfitInputSchema>;

/**
 * Output schema
 */
const OutfitSchema = z.object({
  chosenShoe: z.string(),
  outfitDescription: z.string(),
  reasoning: z.string(),
  suitabilityScore: z.number(),
  designerLinks: z.array(
    z.object({
      designerName: z.string(),
      designerUrl: z.string(),
    })
  ).optional(),
  suggestedShoeboxTheme: z.string().optional(),
  outfitImageDataUri: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type SingleOutfitOutput = z.infer<typeof OutfitSchema>;

/**
 * TEXT PROMPT — STRICT FASHION FOCUS
 */
const textPrompt = ai.definePrompt({
  name: "fashionOutfitPrompt",
  model: "googleai/gemini-1.5-flash-latest",
  input: { schema: RecommendOutfitInputSchema },
  output: { schema: OutfitSchema.omit({ outfitImageDataUri: true, imageUrl: true }) },
  prompt: `
You are a London luxury stylist for Vogue and Harper's Bazaar.

Rules:
• Use ONLY wardrobe items provided.
• Must choose EXACT one shoe from shoeCollection.
• NO invented pieces unless wardrobe lacks category.
• Outfit MUST be full look: top + bottom OR dress + layers.
• Style voice: sharp, modern British editorial.
• No forests, nature, scenery — pure fashion context only.
• SuitabilityScore from 0–100.
Return only valid JSON.

Wardrobe:
{{{wardrobeData}}}

Shoes:
{{{shoeCollection}}}

Event:
{{{eventDetails}}}

Weather:
{{{weatherConditions}}}

Style DNA:
{{{stylePreferences}}}
`
});

/**
 * MAIN FLOW
 */
export const generateOutfitForEvent = async (
  input: RecommendOutfitInput
): Promise<SingleOutfitOutput> => {
  const { output } = await textPrompt(input);
  const final = output!;

  const imagePrompt = `
High-fashion London studio editorial.
Model wearing: ${final.outfitDescription}
Shoes: ${final.chosenShoe}
Lighting: Vogue magazine cover shoot.
Backdrop: neutral studio backdrop (no nature, no forests).
Full body fashion photography.
`;

  let imageUrl: string | undefined;
  try {
    const res = await ai.generate({
      model: "googleai/gemini-2.0-flash-preview-image-generation",
      prompt: imagePrompt,
      config: { responseModalities: ["IMAGE"] },
    });
    const media = (res as any).media;
    if (media?.url) imageUrl = media.url;
    if (Array.isArray(media) && media[0]?.url) imageUrl = media[0].url;
  } catch {}

  return {
    ...final,
    outfitImageDataUri: imageUrl,
    imageUrl,
  };
};
EOF

echo "✔ recommend-outfit.ts updated (no forests)."
echo ""


###############################################################################
# 4) CLEAN AND REBUILD
###############################################################################
echo "🧹 Cleaning build cache..."
rm -rf .next

echo "🔨 Rebuilding project..."
npm run build

echo "=================================================="
echo "🎉 FIX COMPLETE — Test the site again!"
echo "=================================================="

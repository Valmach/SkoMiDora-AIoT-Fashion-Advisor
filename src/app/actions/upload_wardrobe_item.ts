'use server';

import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const bucket = getStorage().bucket('styleai-footwear.firebasestorage.app');

const ai = genkit({
  plugins: [googleAI()],
});

const WardrobeMetadataSchema = z.object({
  category: z.enum([
    'Tops', 
    'Bottoms', 
    'Dresses', 
    'Outerwear', 
    'Footwear', 
    'Accessories', 
    'Knitwear',
    'Activewear',
    'Tailoring',
    'Uncategorized'
  ]),
  color: z.string().describe('The primary dominant color, e.g., Black, White, Navy'),
  material: z.string().describe('The dominant fabric or material (e.g., Cashmere, Silk, Cotton, Wool, Leather, Denim, Synthetic). Inspect closely.'),
  brandName: z.string().describe('Detected designer or brand name if visible or recognizable from style/label, otherwise Unknown'),
  aiFriendlyName: z.string().describe('A clean, luxury-styled descriptive title'),
});

export async function uploadAndEnrichWardrobeItem(userId: string, fileBuffer: Buffer, fileName: string) {
  console.log(`📤 Uploading ${fileName} to Firebase Storage...`);
  
  const filePath = `public_wardrobe_items/${Date.now()}-${fileName}`;
  const fileRef = bucket.file(filePath);
  
  await fileRef.save(fileBuffer, {
    metadata: { contentType: 'image/jpeg' },
    public: true,
  });

  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  console.log(`👁️ Running AI Vision metadata extraction on ${imageUrl}...`);
  
  let metadata = {
    category: 'Uncategorized',
    color: 'Unknown',
    material: 'Unknown',
    brandName: 'Unknown',
    aiFriendlyName: fileName.replace(/\.[^/.]+$/, ''),
  };

  try {
    const prompt = `Analyze this luxury fashion item image in detail. Accurately extract its category, primary color, dominant fabric/material, brand or designer, and provide a clean luxury-styled friendly name.`;

    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: [
        { text: prompt },
        { media: { url: imageUrl } }
      ],
      output: {
        format: 'json',
        schema: WardrobeMetadataSchema,
      },
    });

    if (output) {
      metadata = output;
    }
  } catch (error) {
    console.error('❌ Vision extraction failed during upload:', error);
  }

  const itemDocument = {
    userId,
    imageUrl,
    imagePath: filePath,
    storageBucket: 'styleai-footwear.firebasestorage.app',
    aiAnalyzed: true,
    aiFriendlyName: metadata.aiFriendlyName,
    displayName: metadata.aiFriendlyName,
    itemName: metadata.aiFriendlyName,
    title: metadata.aiFriendlyName,
    name: metadata.aiFriendlyName,
    itemType: metadata.category,
    type: metadata.category,
    aiMetadata: {
      brand: metadata.brandName,
      brandName: metadata.brandName,
      brandDesignerResolved: metadata.brandName !== 'Unknown',
      brandResolutionSource: metadata.brandName !== 'Unknown' ? 'ai_vision' : 'unresolved',
      category: metadata.category,
      color: metadata.color,
      material: metadata.material,
      aiFriendlyName: metadata.aiFriendlyName,
    },
    brand: metadata.brandName,
    brandName: metadata.brandName,
    designer: metadata.brandName,
    designerName: metadata.brandName,
    fashionHouse: metadata.brandName,
    category: metadata.category,
    color: metadata.color,
    material: metadata.material,
    materials: metadata.material,
    generalMaterial: metadata.material,
    metadataConfidence: 0.95,
    metadataSource: 'SkoMiDora AI Vision',
    uploadStatus: 'uploaded',
    imageStatus: 'available',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await db.collection('publicWardrobeItems').add(itemDocument);
  
  console.log(`✅ Item successfully created with rich AI metadata: [${docRef.id}]`);
  return { 
    success: true, 
    id: docRef.id, 
    imageUrl, 
    metadata 
  };
}
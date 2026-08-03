'use server';

import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface FashionMetadata {
  detectedColorName: string;
  matchedMaterials: string[];
  productId: string | null;
}

const FASHION_COLOR_PALETTE: Record<string, RGB> = {
  'Navy Blue': { r: 15, g: 32, b: 67 },
  'Cream': { r: 242, g: 235, b: 219 },
  'Almond': { r: 237, g: 219, b: 193 },
  'Charcoal': { r: 54, g: 54, b: 54 },
};

const visionClient = new ImageAnnotatorClient();

function mapRgbToFashionName(detected: RGB): string {
  let closestColor = 'Unknown';
  let minDistance = Infinity;

  for (const [name, target] of Object.entries(FASHION_COLOR_PALETTE)) {
    const distance = Math.sqrt(
      Math.pow(detected.r - target.r, 2) +
      Math.pow(detected.g - target.g, 2) +
      Math.pow(detected.b - target.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = name;
    }
  }
  return closestColor;
}

export async function processFashionImageAction(formData: FormData): Promise<{ success: boolean; data?: FashionMetadata; error?: string }> {
  try {
    const file = formData.get('image') as File;
    if (!file) {
      return { success: false, error: 'No image provided' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Step 1: Request Object Localization and OCR concurrently with safe optional chaining
    const localizePromise = visionClient.objectLocalization?.({ image: { content: imageBuffer } }) ?? Promise.resolve([{ localizedObjectAnnotations: [] }]);
    const textPromise = visionClient.textDetection?.({ image: { content: imageBuffer } }) ?? Promise.resolve([{ fullTextAnnotation: { text: '' } }]);

    const [localizeResponse, textResponse] = await Promise.all([localizePromise, textPromise]);

    const objects = localizeResponse[0].localizedObjectAnnotations || [];
    const fullText = textResponse[0].fullTextAnnotation?.text || '';

    // Step 2: Extract Bounding Box for the primary fashion asset
    const targetLabels = ['Apparel', 'Footwear', 'Outerwear', 'Dress', 'Shoe'];
    const garment = objects.find((obj) => obj.name && targetLabels.includes(obj.name));

    let finalColorName = 'Unknown';

    if (garment && garment.boundingPoly?.normalizedVertices) {
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const vertices = garment.boundingPoly.normalizedVertices;

      const xCoords = vertices.map(v => (v.x ?? 0) * width);
      const yCoords = vertices.map(v => (v.y ?? 0) * height);
      
      const left = Math.max(0, Math.floor(Math.min(...xCoords)));
      const top = Math.max(0, Math.floor(Math.min(...yCoords)));
      const right = Math.min(width, Math.ceil(Math.max(...xCoords)));
      const bottom = Math.min(height, Math.ceil(Math.max(...yCoords)));
      
      const cropWidth = right - left;
      const cropHeight = bottom - top;

      if (cropWidth > 0 && cropHeight > 0) {
        // Step 3: Crop out background noise (hangers, walls, floors)
        const croppedBuffer = await sharp(imageBuffer)
          .extract({ left, top, width: cropWidth, height: cropHeight })
          .toBuffer();

        // Step 4: Run property analysis ONLY on the cropped garment canvas
        const imagePropertiesFn = visionClient.imageProperties;
        const colorResponseArray = imagePropertiesFn 
          ? await imagePropertiesFn({ image: { content: croppedBuffer } })
          : [{ imagePropertiesAnnotation: { dominantColors: { colors: [] } } }];

        const colors = colorResponseArray[0].imagePropertiesAnnotation?.dominantColors?.colors || [];
        if (colors.length > 0 && colors[0].color) {
          const topColor = colors[0].color;
          finalColorName = mapRgbToFashionName({
            r: topColor.red ?? 0,
            g: topColor.green ?? 0,
            b: topColor.blue ?? 0,
          });
        }
      }
    }

    // Step 5: Regex filter OCR strings for materials and production codes
    const materialPattern = /(\d+%\s*(?:wool|cotton|silk|linen|nappa|leather|cashmere|polyester|nylon|lamb|kid))/gi;
    const matchedMaterials = fullText.match(materialPattern) || [];
    
    const productIdPattern = /\b\d{3}-\d{4}-\d{4}\b/;
    const productIdMatch = fullText.match(productIdPattern);

    return {
      success: true,
      data: {
        detectedColorName: finalColorName,
        matchedMaterials: matchedMaterials.map(m => m.toLowerCase().trim()),
        productId: productIdMatch ? productIdMatch[0] : null,
      }
    };
  } catch (err) {
    console.error('Vision Processing Action Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
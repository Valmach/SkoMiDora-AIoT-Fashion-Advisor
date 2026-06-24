'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// 1. Strict Schema Definitions
export type Category = 'Footwear' | 'Outerwear' | 'Top' | 'Bottom' | 'Accessory';

export interface SkoMiDoraItem {
  brand: string;
  itemName: string;
  category: Category;
  subCategory: string;
  primaryColor: string;
  imageUrl: string;
  originalPrice: number;
  source: 'Aggregator API';
  ingestionDate: string;
}

// 2. Strict Categorization Helper
// This forces the unpredictable API category strings into our rigid B2B taxonomy
function mapToSkoMiDoraCategory(rawCategory: string | undefined): Category {
  if (!rawCategory) return 'Accessory';
  
  const normalized = rawCategory.toLowerCase();
  
  // Pattern matching against common affiliate network tags
  if (normalized.includes('shoe') || normalized.includes('sneaker') || normalized.includes('boot') || normalized.includes('pump')) return 'Footwear';
  if (normalized.includes('coat') || normalized.includes('jacket') || normalized.includes('blazer') || normalized.includes('trench')) return 'Outerwear';
  if (normalized.includes('shirt') || normalized.includes('blouse') || normalized.includes('top') || normalized.includes('sweater')) return 'Top';
  if (normalized.includes('pant') || normalized.includes('jean') || normalized.includes('skirt') || normalized.includes('short')) return 'Bottom';
  
  return 'Accessory'; // Default fallback for weird edge cases
}

// 3. Helper to extract a single clean color string
function extractPrimaryColor(colors: any[] | undefined): string {
  if (!colors || colors.length === 0) return 'Unknown';
  return colors[0].name || 'Unknown';
}

// 4. The Main Action
export async function searchAndIngestItem(searchQuery: string) {
  try {
    const API_KEY = process.env.AGGREGATOR_API_KEY;
    
    if (!API_KEY) {
      throw new Error('AGGREGATOR_API_KEY is missing from environment variables.');
    }

    // Connect to the affiliate API (Structure modeled on standard ShopStyle/Rakuten endpoints)
    const response = await fetch(`https://api.shopstyle.com/api/v2/products?pid=${API_KEY}&fts=${encodeURIComponent(searchQuery)}&limit=1`);
    
    if (!response.ok) {
      throw new Error(`Aggregator API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const rawProduct = data.products?.[0]; 

    if (!rawProduct) {
      return { success: false, error: 'No items found matching that query.' };
    }

    // 5. The Translation Layer
    // Stripping affiliate tracking bloat and mapping to SkoMiDora standards
    const normalizedItem: SkoMiDoraItem = {
      brand: rawProduct.brand?.name || 'Unknown Brand',
      itemName: rawProduct.unbrandedName || rawProduct.name || 'Unknown Item',
      category: mapToSkoMiDoraCategory(rawProduct.categories?.[0]?.name),
      subCategory: rawProduct.categories?.[0]?.name || 'Unknown',
      primaryColor: extractPrimaryColor(rawProduct.colors),
      // Prioritize the highest resolution image available
      imageUrl: rawProduct.image?.sizes?.Large?.url || rawProduct.image?.sizes?.Original?.url || '',
      originalPrice: rawProduct.price || 0,
      source: 'Aggregator API',
      ingestionDate: new Date().toISOString(),
    };

    // 6. Database Write
    const docRef = await addDoc(collection(firestore, 'publicWardrobeItems'), normalizedItem);

    return { 
      success: true, 
      itemId: docRef.id, 
      item: normalizedItem 
    };

  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return { success: false, error: error.message || "Failed to process aggregator data." };
  }
}
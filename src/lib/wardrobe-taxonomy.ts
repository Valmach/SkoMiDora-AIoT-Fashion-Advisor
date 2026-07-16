/**
 * SkoMiDora Canonical Wardrobe Taxonomy
 *
 * category = broad navigation/filter group shared by
 *            Digital Closet, AI Stylist and Recommendations
 *
 * itemType = specific garment/product subtype
 */

export const WARDROBE_CATEGORIES = [
    "Tops",
    "Bottoms",
    "Dresses",
    "Jumpsuits & Rompers",
    "Suits & Sets",
    "Outerwear",
    "Knitwear",
    "Sleepwear & Loungewear",
    "Activewear",
    "Swimwear",
    "Footwear",
    "Handbags",
    "Jewelry",
    "Accessories",
  ] as const;
  
  export type WardrobeCategory =
    (typeof WARDROBE_CATEGORIES)[number];
  
  
  /**
   * Keep this export name because several existing
   * application files already import WARDROBE_TYPES.
   *
   * These are SUBTYPES, not top-level categories.
   */
  export const WARDROBE_TYPES = [
    // Tops
    "Top",
    "Sleeveless Top",
    "Shirt",
    "T-Shirt",
    "Blouse",
    "Camisole",
    "Crop Top",
    "Bodysuit",
  
    // Bottoms
    "Bottom",
    "Jeans",
    "Trousers",
    "Shorts",
    "Skirt",
    "Leggings",
  
    // Dresses
    "Dress",
    "Maxi Dress",
    "Midi Dress",
    "Mini Dress",
    "Slip Dress",
    "Gown",
  
    // Jumpsuits & Rompers
    "Jumpsuit",
    "Romper",
  
    // Suits & Sets
    "Suit",
    "Set",
  
    // Outerwear
    "Outerwear",
    "Blazer",
    "Jacket",
    "Coat",
    "Trench Coat",
    "Cape",
    "Parka",
  
    // Knitwear
    "Cardigan",
    "Sweater",
    "Knitwear",
  
    // Sleepwear & Loungewear
    "Pajama Set",
    "Sleepwear",
    "Robe",
    "Loungewear",
  
    // Activewear
    "Activewear",
  
    // Swimwear
    "Swimwear",
    "Swimsuit",
    "Bikini",
  
    // Footwear
    "Shoes",
    "Trainers",
    "Sneakers",
    "Boots",
    "Ankle Boots",
    "Booties",
    "Heels",
    "Stilettos",
    "Pumps",
    "Mules",
    "Sandals",
    "Loafers",
    "Flats",
    "Slippers",
  
    // Handbags
    "Bag",
    "Handbag",
    "Tote",
    "Clutch",
    "Shoulder Bag",
  
    // Jewelry
    "Jewelry",
    "Earrings",
    "Ring",
    "Necklace",
    "Bracelet",
  
    // Accessories
    "Accessory",
    "Scarf",
    "Hat",
    "Watch",
    "Belt",
    "Eyewear",
  ] as const;
  
  export type WardrobeType =
    (typeof WARDROBE_TYPES)[number];
  
  
  /**
   * Canonical itemType -> category mapping.
   *
   * This is the ONE mapping used by:
   * - Digital Closet
   * - AI Stylist
   * - Lens backend
   * - Recommendations
   */
  export const WARDROBE_TYPE_TO_CATEGORY: Record<
    WardrobeType,
    WardrobeCategory
  > = {
    // Tops
    "Top": "Tops",
    "Sleeveless Top": "Tops",
    "Shirt": "Tops",
    "T-Shirt": "Tops",
    "Blouse": "Tops",
    "Camisole": "Tops",
    "Crop Top": "Tops",
    "Bodysuit": "Tops",
  
    // Bottoms
    "Bottom": "Bottoms",
    "Jeans": "Bottoms",
    "Trousers": "Bottoms",
    "Shorts": "Bottoms",
    "Skirt": "Bottoms",
    "Leggings": "Bottoms",
  
    // Dresses
    "Dress": "Dresses",
    "Maxi Dress": "Dresses",
    "Midi Dress": "Dresses",
    "Mini Dress": "Dresses",
    "Slip Dress": "Dresses",
    "Gown": "Dresses",
  
    // Jumpsuits & Rompers
    "Jumpsuit": "Jumpsuits & Rompers",
    "Romper": "Jumpsuits & Rompers",
  
    // Suits & Sets
    "Suit": "Suits & Sets",
    "Set": "Suits & Sets",
  
    // Outerwear
    "Outerwear": "Outerwear",
    "Blazer": "Outerwear",
    "Jacket": "Outerwear",
    "Coat": "Outerwear",
    "Trench Coat": "Outerwear",
    "Cape": "Outerwear",
    "Parka": "Outerwear",
  
    // Knitwear
    "Cardigan": "Knitwear",
    "Sweater": "Knitwear",
    "Knitwear": "Knitwear",
  
    // Sleepwear & Loungewear
    "Pajama Set": "Sleepwear & Loungewear",
    "Sleepwear": "Sleepwear & Loungewear",
    "Robe": "Sleepwear & Loungewear",
    "Loungewear": "Sleepwear & Loungewear",
  
    // Activewear
    "Activewear": "Activewear",
  
    // Swimwear
    "Swimwear": "Swimwear",
    "Swimsuit": "Swimwear",
    "Bikini": "Swimwear",
  
    // Footwear
    "Shoes": "Footwear",
    "Trainers": "Footwear",
    "Sneakers": "Footwear",
    "Boots": "Footwear",
    "Ankle Boots": "Footwear",
    "Booties": "Footwear",
    "Heels": "Footwear",
    "Stilettos": "Footwear",
    "Pumps": "Footwear",
    "Mules": "Footwear",
    "Sandals": "Footwear",
    "Loafers": "Footwear",
    "Flats": "Footwear",
    "Slippers": "Footwear",
  
    // Handbags
    "Bag": "Handbags",
    "Handbag": "Handbags",
    "Tote": "Handbags",
    "Clutch": "Handbags",
    "Shoulder Bag": "Handbags",
  
    // Jewelry
    "Jewelry": "Jewelry",
    "Earrings": "Jewelry",
    "Ring": "Jewelry",
    "Necklace": "Jewelry",
    "Bracelet": "Jewelry",
  
    // Accessories
    "Accessory": "Accessories",
    "Scarf": "Accessories",
    "Hat": "Accessories",
    "Watch": "Accessories",
    "Belt": "Accessories",
    "Eyewear": "Accessories",
  };
  
  
  /**
   * Resolve the broad category for an item.
   *
   * Prefer an already-valid canonical category from Firestore.
   * Fall back to mapping itemType.
   */
  export function getWardrobeCategory(
    category?: string | null,
    itemType?: string | null,
  ): WardrobeCategory | null {
    const existingCategory =
      WARDROBE_CATEGORIES.find(
        (value) =>
          value.toLowerCase() ===
          category?.trim().toLowerCase(),
      );
  
    if (existingCategory) {
      return existingCategory;
    }
  
    const canonicalType =
      WARDROBE_TYPES.find(
        (value) =>
          value.toLowerCase() ===
          itemType?.trim().toLowerCase(),
      );
  
    if (!canonicalType) {
      return null;
    }
  
    return WARDROBE_TYPE_TO_CATEGORY[
      canonicalType
    ];
  }
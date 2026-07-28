/**
 * SkoMiDora Canonical Wardrobe Taxonomy
 *
 * DATA MODEL
 * ----------
 * category = broad navigation / filter group shared by:
 *   - Digital Closet
 *   - AI Consultant / Stylist
 *   - Recommendations
 *   - Lens upload pipeline
 *
 * itemType = specific garment or product subtype.
 *
 * Examples:
 *
 * category: "Bottoms"
 * itemType: "Trousers"
 *
 * category: "Footwear"
 * itemType: "Trainers"
 *
 * category: "Sleepwear & Loungewear"
 * itemType: "Pajama Set"
 *
 * IMPORTANT:
 * "Bottom" is NOT a valid itemType.
 * Pants are canonicalized as "Trousers".
 */


/* =========================================================
   TOP-LEVEL WARDROBE CATEGORIES
   ========================================================= */

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


  /* =========================================================
     SPECIFIC WARDROBE ITEM TYPES
     ========================================================= */

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
    "Trousers",
    "Jeans",
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
    "Espadrilles",
    "Flip-Flops",

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


  /* =========================================================
     ITEM TYPE → TOP-LEVEL CATEGORY MAPPING
     ========================================================= */

  export const WARDROBE_TYPE_TO_CATEGORY: Record<
    WardrobeType,
    WardrobeCategory
  > = {
    /* -------------------------
       Tops
       ------------------------- */

    Top: "Tops",
    "Sleeveless Top": "Tops",
    Shirt: "Tops",
    "T-Shirt": "Tops",
    Blouse: "Tops",
    Camisole: "Tops",
    "Crop Top": "Tops",
    Bodysuit: "Tops",

    /* -------------------------
       Bottoms
       ------------------------- */

    Trousers: "Bottoms",
    Jeans: "Bottoms",
    Shorts: "Bottoms",
    Skirt: "Bottoms",
    Leggings: "Bottoms",

    /* -------------------------
       Dresses
       ------------------------- */

    Dress: "Dresses",
    "Maxi Dress": "Dresses",
    "Midi Dress": "Dresses",
    "Mini Dress": "Dresses",
    "Slip Dress": "Dresses",
    Gown: "Dresses",

    /* -------------------------
       Jumpsuits & Rompers
       ------------------------- */

    Jumpsuit: "Jumpsuits & Rompers",
    Romper: "Jumpsuits & Rompers",

    /* -------------------------
       Suits & Sets
       ------------------------- */

    Suit: "Suits & Sets",
    Set: "Suits & Sets",

    /* -------------------------
       Outerwear
       ------------------------- */

    Outerwear: "Outerwear",
    Blazer: "Outerwear",
    Jacket: "Outerwear",
    Coat: "Outerwear",
    "Trench Coat": "Outerwear",
    Cape: "Outerwear",
    Parka: "Outerwear",

    /* -------------------------
       Knitwear
       ------------------------- */

    Cardigan: "Knitwear",
    Sweater: "Knitwear",
    Knitwear: "Knitwear",

    /* -------------------------
       Sleepwear & Loungewear
       ------------------------- */

    "Pajama Set": "Sleepwear & Loungewear",
    Sleepwear: "Sleepwear & Loungewear",
    Robe: "Sleepwear & Loungewear",
    Loungewear: "Sleepwear & Loungewear",

    /* -------------------------
       Activewear
       ------------------------- */

    Activewear: "Activewear",

    /* -------------------------
       Swimwear
       ------------------------- */

    Swimwear: "Swimwear",
    Swimsuit: "Swimwear",
    Bikini: "Swimwear",

    /* -------------------------
       Footwear
       ------------------------- */

    Shoes: "Footwear",
    Trainers: "Footwear",
    Sneakers: "Footwear",
    Boots: "Footwear",
    "Ankle Boots": "Footwear",
    Booties: "Footwear",
    Heels: "Footwear",
    Stilettos: "Footwear",
    Pumps: "Footwear",
    Mules: "Footwear",
    Sandals: "Footwear",
    Loafers: "Footwear",
    Flats: "Footwear",
    Slippers: "Footwear",
    Espadrilles: "Footwear",
    "Flip-Flops": "Footwear",

    /* -------------------------
       Handbags
       ------------------------- */

    Bag: "Handbags",
    Handbag: "Handbags",
    Tote: "Handbags",
    Clutch: "Handbags",
    "Shoulder Bag": "Handbags",

    /* -------------------------
       Jewelry
       ------------------------- */

    Jewelry: "Jewelry",
    Earrings: "Jewelry",
    Ring: "Jewelry",
    Necklace: "Jewelry",
    Bracelet: "Jewelry",

    /* -------------------------
       Accessories
       ------------------------- */

    Accessory: "Accessories",
    Scarf: "Accessories",
    Hat: "Accessories",
    Watch: "Accessories",
    Belt: "Accessories",
    Eyewear: "Accessories",
  };


  /* =========================================================
     LEGACY / ALTERNATIVE ITEM TYPE ALIASES
     =========================================================
   *
   * These values should NOT be written as canonical itemType
   * values. They exist only to understand older Firestore data
   * and incoming metadata.
   */

  const WARDROBE_TYPE_ALIASES: Record<
    string,
    WardrobeType
  > = {
    // Bottoms
    bottom: "Trousers",
    bottoms: "Trousers",
    pant: "Trousers",
    pants: "Trousers",
    trouser: "Trousers",
    trousers: "Trousers",

    jean: "Jeans",
    jeans: "Jeans",

    short: "Shorts",
    shorts: "Shorts",

    skirt: "Skirt",
    skirts: "Skirt",

    // Tops
    top: "Top",
    tops: "Top",
    "tank top": "Sleeveless Top",
    tank: "Sleeveless Top",

    shirt: "Shirt",
    blouse: "Blouse",
    bodysuit: "Bodysuit",
    jumper: "Sweater",

    // Dresses
    dress: "Dress",
    dresses: "Dress",

    // Jumpsuits
    jumpsuit: "Jumpsuit",
    jumpsuits: "Jumpsuit",
    romper: "Romper",
    rompers: "Romper",

    // Sleepwear
    pajamas: "Pajama Set",
    pyjamas: "Pajama Set",
    pajama: "Pajama Set",
    pyjama: "Pajama Set",
    "pajama set": "Pajama Set",
    "pyjama set": "Pajama Set",

    // Footwear
    trainer: "Trainers",
    trainers: "Trainers",

    sneaker: "Sneakers",
    sneakers: "Sneakers",

    boot: "Boots",
    boots: "Boots",

    "ankle boot": "Ankle Boots",
    "ankle boots": "Ankle Boots",

    bootie: "Booties",
    booties: "Booties",

    heel: "Heels",
    heels: "Heels",

    stiletto: "Stilettos",
    stilettos: "Stilettos",

    pump: "Pumps",
    pumps: "Pumps",
    sillero: "Pumps",

    mule: "Mules",
    mules: "Mules",

    sandal: "Sandals",
    sandals: "Sandals",

    loafer: "Loafers",
    loafers: "Loafers",

    flat: "Flats",
    flats: "Flats",

    slipper: "Slippers",
    slippers: "Slippers",

    espadrille: "Espadrilles",
    espadrilles: "Espadrilles",

    "flip flop": "Flip-Flops",
    "flip flops": "Flip-Flops",
    "flip-flop": "Flip-Flops",
    "flip-flops": "Flip-Flops",

    // Bags
    bag: "Bag",
    bags: "Bag",
    handbag: "Handbag",
    handbags: "Handbag",

    // Jewelry
    earring: "Earrings",
    earrings: "Earrings",

    ring: "Ring",
    rings: "Ring",

    necklace: "Necklace",
    necklaces: "Necklace",

    bracelet: "Bracelet",
    bracelets: "Bracelet",

    // Accessories
    scarf: "Scarf",
    scarves: "Scarf",

    hat: "Hat",
    hats: "Hat",

    watch: "Watch",
    watches: "Watch",

    belt: "Belt",
    belts: "Belt",

    eyewear: "Eyewear",
  };


  /* =========================================================
     INTERNAL NORMALIZATION HELPERS
     ========================================================= */

  function normalizeTaxonomyValue(
    value: unknown
  ): string {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim();
  }


  function findCanonicalCategory(
    value: unknown
  ): WardrobeCategory | null {
    const normalized =
      normalizeTaxonomyValue(value).toLowerCase();

    if (!normalized) {
      return null;
    }

    return (
      WARDROBE_CATEGORIES.find(
        (category) =>
          category.toLowerCase() === normalized
      ) || null
    );
  }


  function findCanonicalWardrobeType(
    value: unknown
  ): WardrobeType | null {
    const normalized =
      normalizeTaxonomyValue(value);

    if (!normalized) {
      return null;
    }

    const directMatch =
      WARDROBE_TYPES.find(
        (type) =>
          type.toLowerCase() ===
          normalized.toLowerCase()
      );

    if (directMatch) {
      return directMatch;
    }

    return (
      WARDROBE_TYPE_ALIASES[
        normalized.toLowerCase()
      ] || null
    );
  }


  /**
   * Resolve a canonical item type without changing stored data.
   * Item-name inference is intentionally conservative and is used
   * only when itemType or legacy aliases cannot classify the item.
   */
  export function getCanonicalWardrobeType(
    itemType?: string | null,
    itemName?: string | null
  ): WardrobeType | null {
    const canonicalType =
      findCanonicalWardrobeType(itemType);

    if (canonicalType) {
      return canonicalType;
    }

    const normalizedName =
      normalizeTaxonomyValue(itemName).toLowerCase();

    if (!normalizedName) {
      return null;
    }

    if (/\bbikini\b/.test(normalizedName)) {
      return "Bikini";
    }

    if (/\b(swimsuit|swimwear)\b/.test(normalizedName)) {
      return "Swimsuit";
    }

    if (/\bespadrilles?\b/.test(normalizedName)) {
      return "Espadrilles";
    }

    if (/\bflip[- ]?flops?\b/.test(normalizedName)) {
      return "Flip-Flops";
    }

    if (/\b(sweatshirt|jumper)\b/.test(normalizedName)) {
      return "Sweater";
    }

    return null;
  }


  /* =========================================================
     PUBLIC CATEGORY RESOLVER
     =========================================================
   *
   * Resolution order:
   *
   * 1. Trust a valid canonical broad category.
   * 2. If category contains an old item type such as
   *    "Trousers", "Pants", "Trainers", etc., resolve it.
   * 3. Resolve from itemType.
   * 4. Return null when no safe category can be determined.
   */

  export function getWardrobeCategory(
    category?: string | null,
    itemType?: string | null,
    itemName?: string | null
  ): WardrobeCategory | null {
    // 1. Already a valid broad category
    const canonicalCategory =
      findCanonicalCategory(category);

    if (canonicalCategory) {
      return canonicalCategory;
    }

    // 2. Legacy category may actually contain an itemType
    const categoryAsItemType =
      getCanonicalWardrobeType(category);

    if (categoryAsItemType) {
      return WARDROBE_TYPE_TO_CATEGORY[
        categoryAsItemType
      ];
    }

    // 3. Resolve from specific itemType
    const canonicalItemType =
      getCanonicalWardrobeType(
        itemType,
        itemName
      );

    if (canonicalItemType) {
      return WARDROBE_TYPE_TO_CATEGORY[
        canonicalItemType
      ];
    }

    return null;
  }
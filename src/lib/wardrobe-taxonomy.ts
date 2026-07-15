export const WARDROBE_TYPES = [
    "Dress",
    "Shirt",
    "T-Shirt",
    "Blazer",
    "Suit",
    "Jacket",
    "Coat",
    "Jeans",
    "Trousers",
    "Shorts",
    "Skirt",
    "Sneakers",
    "Boots",
    "Heels",
    "Flats",
    "Sandals",
    "Bag",
    "Jewelry",
    "Scarf",
    "Hat",
    "Watch",
    "Belt"
  ] as const;
  
  export type WardrobeType = (typeof WARDROBE_TYPES)[number];
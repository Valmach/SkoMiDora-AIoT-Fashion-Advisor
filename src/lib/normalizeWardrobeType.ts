export type NormalizedWardrobeType =
  | 'Shoes'
  | 'Top'
  | 'Bottom'
  | 'Outerwear'
  | 'Dress'
  | 'Accessory';

export function normalizeWardrobeType(raw: string): NormalizedWardrobeType {
  const v = raw.toLowerCase();

  if (v.includes('shoe') || v.includes('boot') || v.includes('trainer')) return 'Shoes';
  if (v.includes('dress')) return 'Dress';
  if (v.includes('coat') || v.includes('jacket')) return 'Outerwear';
  if (v.includes('pant') || v.includes('trouser') || v.includes('skirt')) return 'Bottom';
  if (v.includes('shirt') || v.includes('top') || v.includes('blouse')) return 'Top';

  return 'Accessory';
}

// Shared types and helpers for the SkoBoxy shop (products Firestore collection).
// First slice: read-only catalog. Cart/checkout/order fields will extend this
// later - kept intentionally minimal for now rather than guessing ahead.

export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string; // ISO 4217, e.g. "USD"
  category: string; // e.g. "Classic", "Collector Edition", "Kids"
  imageUrl: string;
  status: ProductStatus;
  sku?: string;
  // Explicit flag for seed/placeholder inventory. The current catalog is
  // pre-licensing mockup data, not real sellable inventory - this keeps that
  // distinction visible in the UI instead of silently looking like a live store.
  isMock?: boolean;
  createdAt?: unknown;
}

export function formatPrice(priceCents: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(priceCents / 100);
  } catch {
    return `$${(priceCents / 100).toFixed(2)}`;
  }
}

export const PRODUCT_CATEGORIES = [
  "Classic",
  "Collector Edition",
  "Kids",
  "Travel",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

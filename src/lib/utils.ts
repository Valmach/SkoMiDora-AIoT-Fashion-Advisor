// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * -----------------------------------------------------------
 * cn — className utility (shadcn/ui standard)
 * -----------------------------------------------------------
 * Safely merges Tailwind + conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

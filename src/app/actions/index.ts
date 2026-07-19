'use server';

/**
 * FILE: src/app/actions/index.ts
 * PURPOSE: Central hub for all AIoT Wardrobe actions.
 * This file acts as a "Barrel Export" to keep imports clean in the UI.
 * It supports both the "Action" suffix naming and clean naming to prevent
 * build errors in existing pages like src/app/page.tsx.
 */

// 1. Internal Logic Imports
import { analyzeStyleDNA as analyzeStyleDNAImpl } from './analyze-style-dna';
import { generateOutfitForEventAction as generateOutfitImpl } from './generate-outfit-for-event';

/* -----------------------------------------------------------
   STYLE DNA EXPORTS
   (Double-exported to satisfy different import names in page.tsx)
----------------------------------------------------------- */

/** Triggers the AI analysis of wardrobe + weather + calendar */
export async function analyzeStyleDNA(input?: any) {
  return analyzeStyleDNAImpl(input);
}

/** Legacy alias specifically for src/app/page.tsx */
export async function analyzeStyleDNAAction(input?: any) {
  return analyzeStyleDNAImpl(input);
}

/* -----------------------------------------------------------
   OUTFIT & EVENT EXPORTS
----------------------------------------------------------- */

/**
 * Generates the 3-card event recommendation grid.
 * Uses a fallback empty array to prevent undefined type mismatch errors.
 */
export async function generateOutfitForEventAction(input: any, closetItems?: any[]) {
  return generateOutfitImpl(input, closetItems || []);
}

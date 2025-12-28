'use server';

/**
 * FILE: src/app/actions/index.ts
 * PURPOSE: Central hub for all AIoT Wardrobe actions.
 * * This file acts as a "Barrel Export" to keep imports clean in the UI.
 * It supports both the "Action" suffix naming and clean naming to prevent
 * build errors in existing pages like src/app/page.tsx.
 */

// 1. Internal Logic Imports
import { analyzeStyleDNA as analyzeStyleDNAImpl } from './analyze-style-dna';
import { generateOutfitForEventAction as generateOutfitImpl } from './generate-outfit-for-event';
import { analyzeAndSaveClothingItem as analyzeAndSaveImpl } from './analyze-and-save-clothing-item';
import { deleteClothingItem as deleteImpl } from './delete-clothing-item';

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

/** Generates the 3-card event recommendation grid */
export async function generateOutfitForEventAction(input: any) {
  return generateOutfitImpl(input);
}

/* -----------------------------------------------------------
   CLOSET & STORAGE EXPORTS
----------------------------------------------------------- */

/** Processes new image uploads and saves metadata to Firestore */
export async function analyzeAndSaveClothingItem(formData: FormData) {
  return analyzeAndSaveImpl(formData);
}

/** Removes items from Firestore and Firebase Storage */
export async function deleteClothingItem(itemId: string, imagePath?: string) {
  return deleteImpl(itemId, imagePath);
}
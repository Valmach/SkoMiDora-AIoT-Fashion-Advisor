'use server';

/**
 * FILE: src/app/actions.ts
 * * PURPOSE:
 * - Central Server Action entrypoint
 * - MUST define async functions directly
 * - NO re-exports allowed
 */

// Ensure these paths match your actual file structure exactly (check for .ts vs .tsx)
import { analyzeStyleDNA as analyzeStyleDNAImpl } from './actions/analyze-style-dna';
import {
  generateOutfitForEventAction as generateOutfitForEventImpl,
} from './actions/generate-outfit-for-event';

/* -----------------------------------------------------------
   ACTION WRAPPERS (REQUIRED)
----------------------------------------------------------- */

/**
 * analyzeStyleDNAAction
 * Wrapped to match the import name used in page.tsx
 */
export async function analyzeStyleDNAAction(input: any) {
  return analyzeStyleDNAImpl(input);
}

/**
 * generateOutfitForEventAction
 */
export async function generateOutfitForEventAction(input: any) {
  return generateOutfitForEventImpl(input);
}
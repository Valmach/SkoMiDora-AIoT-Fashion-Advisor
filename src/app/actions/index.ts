'use server';
/**
 * FILE: src/app/actions/index.ts
 */
import { analyzeStyleDNA as analyzeStyleDNAImpl } from './analyze-style-dna';
import {
  generateOutfitForEventAction as generateOutfitForEventImpl,
} from './generate-outfit-for-event';

export async function analyzeStyleDNAAction(input?: any) {
  return analyzeStyleDNAImpl(input);
}

export async function generateOutfitForEventAction(input: any) {
  return generateOutfitForEventImpl(input);
}
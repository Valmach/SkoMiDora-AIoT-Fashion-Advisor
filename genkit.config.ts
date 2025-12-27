/**
 * Genkit configuration — Firebase Studio / GCP native
 *
 * IMPORTANT:
 * - DO NOT pass API keys
 * - Use Application Default Credentials (ADC)
 * - Firebase Studio / Cloud Workstations already provide a service account
 */

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export const ai = genkit({
  plugins: [
    googleAI(), // ✅ NO apiKey — uses ADC
  ],
});

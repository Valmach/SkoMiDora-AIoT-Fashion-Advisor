/**
 * @fileoverview This is the Genkit configuration file.
 *
 * It is used to configure the Genkit framework and its plugins.
 * It is also used to load environment variables from the .env file.
 */
import "dotenv/config"; // Load environment variables from .env

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

// IMPORTANT: For deployed environments (like Firebase Cloud Functions / App Hosting),
// GOOGLE_API_KEY MUST be set as an environment variable in that function's/backend's configuration.
// For local development, this config ensures the GOOGLE_API_KEY is loaded from your .env file.
const plugins = [
  googleAI(), // Enabled Google AI plugin
];

// If plugins array is empty, Genkit will initialize without specific model providers.
// AI calls will likely fail, but the server should start if this was the blocking issue.
export const ai = genkit({
  plugins: plugins,
});

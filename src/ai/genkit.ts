/**
 * @fileoverview This file re-exports the configured Genkit 'ai' instance.
 *
 * All AI flows and components should import the 'ai' object from this file
 * to ensure they use the single, properly configured Genkit instance.
 * The actual configuration and initialization happens in `genkit.config.ts`
 * at the root of the project, which is loaded first.
 */

// This now imports the configured instance from the root config file.
import { ai } from "../../genkit.config";

export { ai };

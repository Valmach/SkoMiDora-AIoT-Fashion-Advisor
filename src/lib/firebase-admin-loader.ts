/**
 * @fileOverview Centralized Firebase Admin initialization for Server Actions & SSR.
 * This loader guarantees:
 *   - Admin is initialized ONLY once
 *   - Works with Google-managed runtime credentials (Cloud Run / Hosting / Functions)
 *   - Works with manual local secrets via .env
 */

import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

let app: admin.app.App | null = null;

/**
 * Safely initializes Firebase Admin only once.
 * Supports automatic Google credentials and manual local secrets.
 */
export function getAdmin(): admin.app.App {
  // -------------------------------------------------------
  // 0. Already initialized? Return instance immediately.
  // -------------------------------------------------------
  if (app) return app;

  // -------------------------------------------------------
  // 1. GOOGLE CLOUD RUNTIME (Cloud Functions, Cloud Run, Hosting)
  // -------------------------------------------------------
  const hasGoogleRuntimeCreds =
    process.env.FIREBASE_CONFIG ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (hasGoogleRuntimeCreds) {
    try {
      // Uses automatically injected service account credentials
      app = admin.initializeApp({
        storageBucket: "styleai-footwear.appspot.com",
      });
      return app;
    } catch (err) {
      console.warn("⚠ Failed automatic Google runtime init, falling back to manual cert…", err);
    }
  }

  // -------------------------------------------------------
  // 2. LOCAL DEVELOPMENT (Manual Service Account Secrets)
  // -------------------------------------------------------
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Fix newline escaping inside environment variables
    privateKey = privateKey.replace(/\\n/g, "\n");

    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        } as ServiceAccount),
        storageBucket: "styleai-footwear.appspot.com",
      });

      return app;
    } catch (err) {
      console.error("❌ Failed manual Firebase Admin initialization:", err);
      throw err;
    }
  }

  // -------------------------------------------------------
  // 3. NO VALID CREDS → HARD ERROR
  // -------------------------------------------------------
  throw new Error(
    "❌ Firebase Admin not initialized (missing FIREBASE_ADMIN_* env vars OR GOOGLE creds)."
  );
}

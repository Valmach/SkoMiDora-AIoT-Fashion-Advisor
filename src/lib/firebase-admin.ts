// src/lib/firebase-admin.ts
import * as admin from "firebase-admin";

let adminApp: admin.app.App | undefined;

/**
 * ===========================================================
 * FIREBASE ADMIN — SINGLE SOURCE OF TRUTH
 * ===========================================================
 *
 * Bucket in use (CONFIRMED, DO NOT CHANGE):
 *   gs://styleai-footwear.firebasestorage.app
 */
export function getAdmin(): admin.app.App {
  if (adminApp) return adminApp;

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),

    // ✅ CRITICAL: MUST MATCH CLIENT BUCKET EXACTLY
    storageBucket: "styleai-footwear.firebasestorage.app",
  });

  return adminApp;
}
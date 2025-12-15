/**
 * Centralized Firebase Admin initialization for Server Actions & SSR.
 * - Never returns null
 * - Prevents duplicate initializeApp()
 */

import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

let adminApp: admin.app.App | undefined;

export function getAdmin(): admin.app.App {
  // 1) Reuse cached instance
  if (adminApp) return adminApp;

  // 2) Reuse already-initialized global instance (hot reload / RSC)
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  // 3) Google runtime (Cloud Run/Functions/Hosting) auto credentials
  if (process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = admin.initializeApp({
      storageBucket: "styleai-footwear.appspot.com",
    });
    return adminApp;
  }

  // 4) Local/manual env vars
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(
        { projectId, clientEmail, privateKey } as ServiceAccount
      ),
      storageBucket: "styleai-footwear.appspot.com",
    });

    return adminApp;
  }

  // 5) Hard fail (prevents null/undefined returns)
  throw new Error(
    "❌ Firebase Admin not initialized — missing GOOGLE creds or FIREBASE_ADMIN_* env vars."
  );
}

// src/lib/firebase-admin-loader.ts
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

export function getAdmin() {
  if (app) return app;

  if (admin.apps.length > 0) {
    app = admin.app();
    return app;
  }

  // Uses GOOGLE_APPLICATION_CREDENTIALS automatically. No manual secrets.
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  return app;
}

import admin, { ServiceAccount } from "firebase-admin";

let app: admin.app.App | null = null;

export function getAdmin() {
  if (app) return app;

  // Case 1: Firebase Hosting / Cloud Functions / Cloud Run
  const auto = process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (auto || process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      // Try using GOOGLE_APPLICATION_CREDENTIALS first
      app = admin.initializeApp();
      return app;
    } catch {
      // Try explicit key if provided
      try {
        const svc = process.env.FIREBASE_SERVICE_ACCOUNT
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : undefined;

        if (svc) {
          app = admin.initializeApp({
            credential: admin.credential.cert(svc as ServiceAccount),
          });
          return app;
        }
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
      }
    }
  }

  // Case 2: Local development using manual secrets
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");

    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      } as ServiceAccount),
    });
    return app;
  }

  console.error("❌ Firebase Admin not initialized. Missing credentials.");
  return null;
}

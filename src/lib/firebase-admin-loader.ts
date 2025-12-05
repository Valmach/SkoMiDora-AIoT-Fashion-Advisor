import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

export async function getAdmin() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: "styleai-footwear.appspot.com", // 👈 YOUR BUCKET (fixed)
    });
  }
  return app;
}

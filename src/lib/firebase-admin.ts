import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getFirebaseAdmin() {
  const apps = getApps();
  // Look specifically for the default app, ignoring any internal Google Cloud apps
  const defaultApp = apps.find(app => app.name === '[DEFAULT]');

  let app;
  if (!defaultApp) {
    console.log("[Firebase Admin] Bootstrapping [DEFAULT] instance...");
    app = initializeApp({
      credential: applicationDefault(),
      projectId: 'styleai-footwear', 
    });
  } else {
    console.log("[Firebase Admin] Utilizing existing [DEFAULT] instance...");
    app = defaultApp;
  }

  return {
    db: getFirestore(app),
    auth: getAuth(app)
  };
}
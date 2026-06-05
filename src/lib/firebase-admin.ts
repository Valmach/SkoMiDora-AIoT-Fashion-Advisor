import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getFirebaseAdmin() {
  const apps = getApps();
  const defaultApp = apps.find(app => app.name === '[DEFAULT]');

  let app;
  if (!defaultApp) {
    console.log("[Firebase Admin] Bootstrapping [DEFAULT] instance...");
    
    // We removed the strict 'credential' requirement. 
    // Firebase will now automatically and safely discover Cloud Run credentials 
    // without crashing if it runs locally or during the Next.js build.
    app = initializeApp({
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
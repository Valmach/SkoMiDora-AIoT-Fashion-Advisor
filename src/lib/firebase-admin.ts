import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function getFirebaseAdmin() {
  let app: admin.app.App;

  // 1. Explicitly hunt for the [DEFAULT] app to prevent Next.js caching conflicts
  const existingApp = admin.apps.find((a) => a?.name === '[DEFAULT]');
  
  if (existingApp) {
    app = existingApp;
  } else {
    try {
      // 2. Check for the local physical key file
      const keyPath = path.resolve(process.cwd(), 'firebase-admin-key.json');
      
      if (fs.existsSync(keyPath)) {
        console.log("Booting Firebase Admin (Local Mode)");
        const serviceAccount = require(keyPath);
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // 3. PRODUCTION MODE: Zero arguments. 
        // This forces Firebase to securely inherit Cloud Run's internal service account.
        console.log("Booting Firebase Admin (Production Serverless Mode)");
        app = admin.initializeApp(); 
      }
    } catch (error: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin:", error);
      throw new Error(`FIREBASE INIT FAILED: ${error.message}`);
    }
  }

  // 4. Bind Firestore directly to the confirmed app instance
  return { 
    db: app.firestore(), 
    storage: app.storage() 
  };
}
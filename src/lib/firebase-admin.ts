import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function getFirebaseAdmin() {
  let app: admin.app.App;

  const existingApp = admin.apps.find((a) => a?.name === '[DEFAULT]');
  
  if (existingApp) {
    app = existingApp;
  } else {
    try {
      const keyPath = path.resolve(process.cwd(), 'firebase-admin-key.json');
      
      if (fs.existsSync(keyPath)) {
        console.log("Booting Firebase Admin (Local Mode)");
        // Force the local environment to use the absolute path so Google Auth doesn't get confused
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath; 
        const serviceAccount = require(keyPath);
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        console.log("Booting Firebase Admin (Production Serverless Mode)");
        
        // 🚨 THE KILLSWITCH 🚨
        // Force-delete the rogue environment variable so Google Cloud Run 
        // is forced to use its built-in internal metadata server for security.
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          console.log("Deleting rogue GOOGLE_APPLICATION_CREDENTIALS to force serverless auth.");
          delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        
        app = admin.initializeApp(); 
      }
    } catch (error: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin:", error);
      throw new Error(`FIREBASE INIT FAILED: ${error.message}`);
    }
  }

  return { 
    db: app.firestore(), 
    storage: app.storage() 
  };
}
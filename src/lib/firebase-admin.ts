import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // Step 1: Check for the local file in Firebase Studio
      const keyPath = path.resolve(process.cwd(), 'firebase-admin-key.json');
      
      if (fs.existsSync(keyPath)) {
        console.log("Initializing Firebase Admin locally...");
        const serviceAccount = require(keyPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // Step 2: Production Initialization
        // In Firebase Next.js hosting, zero-arguments is the official standard.
        console.log("Initializing Firebase Admin in Production...");
        admin.initializeApp({
           projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "styleai-footwear"
        });
      }
    } catch (error: any) {
      // Step 3: NO MORE SWALLOWING ERRORS.
      // If initialization fails, we throw the exact reason directly back to the browser.
      throw new Error(`INIT FAILURE: ${error.message || String(error)}`);
    }
  }

  // If we made it here, the database is legally connected.
  return { 
    db: admin.firestore(), 
    storage: admin.storage() 
  };
}
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // Step 1: Check if we are running locally and the key file exists
      const keyPath = path.resolve(process.cwd(), 'firebase-admin-key.json');
      
      if (fs.existsSync(keyPath)) {
        // LOCAL ENVIRONMENT: Use the physical JSON key
        console.log("Initializing Firebase Admin with local key file.");
        const serviceAccount = require(keyPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // PRODUCTION ENVIRONMENT: The file isn't uploaded for security.
        // Tell Firebase to automatically use its own internal server credentials.
        console.log("Initializing Firebase Admin with Application Default Credentials.");
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    } catch (error) {
      console.error('Firebase Admin Initialization Error:', error);
      // Absolute fallback if the above methods fail
      if (!admin.apps.length) {
        admin.initializeApp();
      }
    }
  }

  return { 
    db: admin.firestore(), 
    storage: admin.storage() 
  };
}
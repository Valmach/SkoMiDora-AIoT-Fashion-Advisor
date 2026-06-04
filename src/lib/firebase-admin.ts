import * as admin from 'firebase-admin';

// Check if Firebase is already initialized to prevent duplicate app crashes
if (!admin.apps.length) {
  try {
    let formattedPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    // LOCAL DEVELOPMENT: If a private key exists in the .env, use explicit initialization
    if (formattedPrivateKey) {
      formattedPrivateKey = formattedPrivateKey.replace(/^["']|["']$/g, '');
      formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
      formattedPrivateKey = formattedPrivateKey.replace(/\r/g, '');
      if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: formattedPrivateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase Admin Initialized via Explicit Credentials');
    } 
    // PRODUCTION: Use Google Cloud's built-in Application Default Credentials
    else if (process.env.NODE_ENV === 'production') {
      admin.initializeApp({
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase Admin Initialized via Application Default Credentials');
    }
    // MISSING LOCAL KEYS: Throw a clear error instead of a confusing Metadata crash
    else {
      throw new Error('❌ Local development environment is missing FIREBASE_ADMIN_PRIVATE_KEY in .env file.');
    }
  } catch (error) {
    console.error('❌ Firebase Admin Init Error:', error);
    // Force the error to throw loudly so we never silently export a broken connection
    throw error;
  }
}

// Export guaranteed, active service connections
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
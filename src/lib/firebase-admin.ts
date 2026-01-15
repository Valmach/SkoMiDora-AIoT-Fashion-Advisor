import * as admin from 'firebase-admin';

// 1. Check for missing variables to prevent hard crashes
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error('---------------------------------------------------');
    console.error('❌ FIREBASE ADMIN SDK FAILED TO INITIALIZE');
    console.error('Missing one or more environment variables:');
    if (!projectId) console.error(' - FIREBASE_ADMIN_PROJECT_ID is missing');
    if (!clientEmail) console.error(' - FIREBASE_ADMIN_CLIENT_EMAIL is missing');
    if (!privateKey) console.error(' - FIREBASE_ADMIN_PRIVATE_KEY is missing');
    console.error('---------------------------------------------------');
    // We do NOT throw here so the app doesn't crash completely, 
    // but database calls will fail later if not fixed.
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Handle both standard newlines and escaped newlines
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase Admin Initialized Successfully');
    } catch (error) {
      console.error('❌ Firebase Admin Init Error:', error);
    }
  }
}

// 2. Export services safely
export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;
export const storage = admin.apps.length ? admin.storage() : null;

// Messaging often causes crashes if not configured in Google Cloud, so we comment it out for now.
// export const messaging = admin.apps.length ? admin.messaging() : null;
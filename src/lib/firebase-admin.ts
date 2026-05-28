import * as admin from 'firebase-admin';

// 1. Extract variables
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

// ------------------------------------------------------------------
// 🔥 BULLETPROOF PRIVATE KEY SANITIZER
// ------------------------------------------------------------------
let formattedPrivateKey = rawPrivateKey;
if (formattedPrivateKey) {
  // Step A: Strip surrounding double or single quotes if accidentally pasted into GCP Secret Manager
  formattedPrivateKey = formattedPrivateKey.replace(/^["']|["']$/g, '');
  
  // Step B: Convert literal '\n' strings into actual line breaks
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
}

// 2. Initialize
if (!admin.apps.length) {
  if (!projectId || !clientEmail || !formattedPrivateKey) {
    console.error('---------------------------------------------------');
    console.error('❌ FIREBASE ADMIN SDK FAILED TO INITIALIZE');
    console.error('Missing one or more environment variables:');
    if (!projectId) console.error(' - FIREBASE_ADMIN_PROJECT_ID is missing');
    if (!clientEmail) console.error(' - FIREBASE_ADMIN_CLIENT_EMAIL is missing');
    if (!formattedPrivateKey) console.error(' - FIREBASE_ADMIN_PRIVATE_KEY is missing');
    console.error('---------------------------------------------------');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Pass the aggressively sanitized key
          privateKey: formattedPrivateKey, 
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase Admin Initialized Successfully');
    } catch (error) {
      console.error('❌ Firebase Admin Init Error:', error);
    }
  }
}

// 3. Export services safely
export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;
export const storage = admin.apps.length ? admin.storage() : null;
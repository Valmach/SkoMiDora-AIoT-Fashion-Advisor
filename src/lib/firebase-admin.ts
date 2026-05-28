import * as admin from 'firebase-admin';

// 1. Extract variables
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

// ------------------------------------------------------------------
// 🔥 BULLETPROOF PRIVATE KEY SANITIZER
// ------------------------------------------------------------------
let formattedPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (formattedPrivateKey) {
  // 1. Strip accidental surrounding quotes
  formattedPrivateKey = formattedPrivateKey.replace(/^["']|["']$/g, '');
  
  // 2. Convert literal '\n' strings into actual line breaks
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

  // 3. Strip Windows carriage returns (\r) which violently crash the crypto decoder
  formattedPrivateKey = formattedPrivateKey.replace(/\r/g, '');

  // 4. Auto-inject headers if they are somehow still missing
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`;
  }
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
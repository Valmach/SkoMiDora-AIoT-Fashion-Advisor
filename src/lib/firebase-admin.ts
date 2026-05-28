import * as admin from 'firebase-admin';

// Make sure you have your formattedPrivateKey logic here as we discussed previously
let formattedPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (formattedPrivateKey) {
  formattedPrivateKey = formattedPrivateKey.replace(/^["']|["']$/g, '');
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  formattedPrivateKey = formattedPrivateKey.replace(/\r/g, '');
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`;
  }
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: formattedPrivateKey, 
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    console.log('✅ Firebase Admin Initialized Successfully');
  } catch (error) {
    console.error('❌ Firebase Admin Init Error:', error);
  }
}

export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;
export const storage = admin.apps.length ? admin.storage() : null;
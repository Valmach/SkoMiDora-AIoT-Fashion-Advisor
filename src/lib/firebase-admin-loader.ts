import admin from 'firebase-admin';

let app: admin.app.App;

async function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (projectId && clientEmail && privateKey) {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket,
      });
      console.log('✅ Firebase Admin initialized via Service Account');
      return app;
    } catch (e: any) {
      console.error('🔥 Firebase Admin initialization with Service Account FAILED', e);
      // Fallback to default credentials if service account fails
    }
  }

  try {
    app = admin.initializeApp({
      storageBucket,
    });
    console.log('✅ Firebase Admin initialized via Default Credentials');
    return app;
  } catch (e: any) {
    console.error('🔥 Firebase Admin initialization with Default Credentials FAILED', e);
    throw new Error('Firebase Admin SDK failed to initialize.');
  }
}

export async function getAdmin() {
  if (app) {
    return app;
  }
  return await initializeAdminApp();
}

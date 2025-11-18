
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("FIREBASE_ADMIN_PRIVATE_KEY environment variable is not set.");
    }
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
      throw new Error("FIREBASE_ADMIN_PROJECT_ID environment variable is not set.");
    }
    if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error("FIREBASE_ADMIN_CLIENT_EMAIL environment variable is not set.");
    }

    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // The following line is the critical fix:
      // It replaces the literal "\\n" characters in the private key
      // with actual newline characters "\n", which the SDK requires.
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error: any) {
    // Provide a more detailed error log for debugging.
    console.error("CRITICAL_ERROR: Firebase Admin SDK initialization failed.", {
        errorMessage: error.message,
        errorStack: error.stack,
    });
    // Re-throwing the error is important as it signals a critical failure in app setup.
    throw new Error(`Firebase Admin SDK could not be initialized. Error: ${error.message}`);
  }
}

export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();

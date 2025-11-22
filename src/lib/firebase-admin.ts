import * as admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        // 1. Attempt to initialize using the default credentials from the hosting environment.
        admin.initializeApp({
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });

        console.log("✅ Firebase Admin SDK initialized successfully (via Default Credentials)");

    } catch (errDefault) {
        // 2. If default initialization fails, fall back to using explicit Service Account credentials (from .env file).
        try {
            if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY || !process.env.FIREBASE_ADMIN_PROJECT_ID) {
                throw new Error("Missing explicit admin credentials.");
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                    // The replace is crucial for multiline private keys from environment variables
                    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
                }),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
            console.log("✅ Firebase Admin SDK initialized successfully (via Service Account)");

        } catch (errExplicit) {
            console.error("🔥 Firebase Admin Init Error (Default and Explicit Failed):", errExplicit);
            // Re-throw the error so the build process is aware of the failure
            throw errExplicit;
        }
    }
}

export const db = admin.firestore();
export const storage = admin.storage();
export const Timestamp = admin.firestore.Timestamp;
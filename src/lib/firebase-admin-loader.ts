// src/lib/firebase-admin-loader.ts

export async function getAdmin() {
  const admin = (await import("firebase-admin")).default;

  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    admin.initializeApp({
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    console.log("✅ Admin initialized via Default Credentials");
    return admin;

  } catch (errDefault) {
    if (errDefault instanceof Error) {
        console.log("⚠️ Default credential init failed:", errDefault.message);
    } else {
        console.log("⚠️ Default credential init failed with an unknown error:", errDefault);
    }
  }

  try {
    if (
      !process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      !process.env.FIREBASE_ADMIN_PROJECT_ID
    ) {
      throw new Error("Missing explicit admin credentials");
    }
    admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });

      console.log("✅ Admin initialized via Service Account");
      return admin;

    } catch (errExplicit) {
        if (errExplicit instanceof Error) {
            console.error("🔥 Firebase Admin initialization FAILED:", errExplicit.message);
        } else {
            console.error("🔥 Firebase Admin initialization FAILED with an unknown error:", errExplicit);
        }
      throw errExplicit;
    }
}

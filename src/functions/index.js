/**
 * SkoMiDora Cloud Function: skomidora
 * - Uses Secret Manager (ADMIN_PRIVATE_KEY, ADMIN_CLIENT_EMAIL)
 * - Initializes Firebase Admin exactly once per container
 * - Returns a simple health-check string when OK
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Secrets defined in Google Secret Manager
//   ADMIN_PRIVATE_KEY   -> full PEM private key (with \n in it is fine)
//   ADMIN_CLIENT_EMAIL  -> service account client email
const adminPrivateKey = defineSecret("ADMIN_PRIVATE_KEY");
const adminClientEmail = defineSecret("ADMIN_CLIENT_EMAIL");

let adminInitialized = false;

function ensureAdminInitialized() {
  if (adminInitialized) {
    return;
  }

  try {
    const privateKeyRaw = adminPrivateKey.value();
    const clientEmail = adminClientEmail.value();

    if (!privateKeyRaw || !clientEmail) {
      throw new Error(
        "Missing ADMIN_PRIVATE_KEY or ADMIN_CLIENT_EMAIL secret values"
      );
    }

    // Handles both cases:
    //  - key stored with literal "\n"
    //  - key stored with real newlines
    const privateKey = privateKeyRaw.includes("\\n")
      ? privateKeyRaw.replace(/\\n/g, "\n")
      : privateKeyRaw;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.GCLOUD_PROJECT,
        clientEmail,
        privateKey,
      }),
    });

    console.log("✅ Firebase Admin initialized in Cloud Function container");
    adminInitialized = true;
  } catch (err) {
    console.error("❌ Firebase Admin initialization failed:", err);
    throw err;
  }
}

// Main HTTPS function used by your app + health check
exports.skomidora = onRequest(
  {
    region: "us-central1",
    secrets: [adminPrivateKey, adminClientEmail],
  },
  async (req, res) => {
    try {
      ensureAdminInitialized();

      res
        .status(200)
        .send("Admin SDK initialized successfully (skomidora, v2 secrets)");
    } catch (err) {
      console.error("skomidora handler error:", err);
      res.status(500).send(
        `Admin SDK status: init failed: ${
          err && err.message ? err.message : String(err)
        }`
      );
    }
  }
);

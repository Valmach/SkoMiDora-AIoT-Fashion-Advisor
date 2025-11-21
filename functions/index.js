/* eslint-disable max-len */
/**
 * Cloud Function: skomidora
 * Health check + Admin SDK initialization test.
 */

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");

/** Secrets from Secret Manager */
const adminPrivateKey = defineSecret("ADMIN_PRIVATE_KEY");
const adminClientEmail = defineSecret("ADMIN_CLIENT_EMAIL");

let adminInitialized = false;

/**
 * Safely resolve the correct projectId.
 */
function resolveProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;

  if (process.env.FIREBASE_CONFIG) {
    try {
      const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
      if (cfg.projectId) return cfg.projectId;
    } catch (e) {
      console.warn("Could not parse FIREBASE_CONFIG:", e);
    }
  }

  return "styleai-footwear"; // safe fallback
}

/**
 * Initialize Firebase Admin exactly once per container.
 */
function ensureAdminInitialized() {
  if (adminInitialized) return;

  try {
    const rawKey = adminPrivateKey.value();
    const email = adminClientEmail.value();

    if (!rawKey || !email) {
      throw new Error("Missing ADMIN_PRIVATE_KEY or ADMIN_CLIENT_EMAIL secret");
    }

    // Normalize secret formatting
    const privateKey = rawKey
        .trim()
        .replace(/^"|"$/g, "") // strip outer quotes if present
        .replace(/\\n/g, "\n");

    const projectId = resolveProjectId();

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: email,
        privateKey,
      }),
    });

    console.log(
        `✅ Firebase Admin initialized successfully (projectId=${projectId}).`,
    );

    adminInitialized = true;
  } catch (err) {
    console.error("❌ Admin initialization failure:", err);
    throw err;
  }
}

/**
 * HTTP Cloud Function: skomidora
* @return {void}
 */
exports.skomidora = onRequest(
    {
      region: "us-central1",
      secrets: [adminPrivateKey, adminClientEmail],
    },
    async (req, res) => {
      try {
        ensureAdminInitialized();
        res.status(200).send("Admin SDK initialized successfully (skomidora).");
      } catch (err) {
        const msg = err?.message || String(err);
        console.error("skomidora handler error:", err);
        res.status(500).send("Admin SDK initialization failed: " + msg);
      }
    },
);

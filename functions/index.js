const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Secrets (must be set once)
const adminPrivateKey = defineSecret("ADMIN_PRIVATE_KEY");
const adminClientEmail = defineSecret("ADMIN_CLIENT_EMAIL");

let adminInitialized = false;

function initAdmin() {
  if (adminInitialized) return;

  const key = adminPrivateKey.value();
  const email = adminClientEmail.value();

  if (!key || !email) {
    throw new Error("Missing ADMIN_PRIVATE_KEY or ADMIN_CLIENT_EMAIL");
  }

  // Normalize \n if pasted escaped
  const fixedKey = key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.GCLOUD_PROJECT,
      clientEmail: email,
      privateKey: fixedKey,
    }),
  });

  adminInitialized = true;
}

exports.skomidora = onRequest(
  { region: "us-central1", secrets: [adminPrivateKey, adminClientEmail] },
  (req, res) => {
    try {
      initAdmin();
      res.status(200).send("Admin SDK initialized (skomidora)");
    } catch (err) {
      res.status(500).send(`Admin init failed: ${err.message}`);
    }
  }
);

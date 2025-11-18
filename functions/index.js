const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
  console.log("✅ Firebase Admin initialized");
}

exports.skomidora = onRequest(async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      status: "online",
      service: "SkoMiDora AI Fashion Advisor",
      project: process.env.GCLOUD_PROJECT || "styleai-footwear",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("🔥 Function error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal Server Error",
    });
  }
});

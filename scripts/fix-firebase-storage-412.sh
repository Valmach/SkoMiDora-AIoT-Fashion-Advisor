#!/usr/bin/env bash

set -e

PROJECT_ID="styleai-footwear"

echo "🔍 Resolving Firebase Storage 412 error for project: $PROJECT_ID"

# --------------------------------------------------
# Resolve project number
# --------------------------------------------------
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" \
  --format="value(projectNumber)")

if [[ -z "$PROJECT_NUMBER" ]]; then
  echo "❌ Could not resolve project number"
  exit 1
fi

echo "📛 Project number: $PROJECT_NUMBER"

# --------------------------------------------------
# Firebase Storage service account
# --------------------------------------------------
FIREBASE_STORAGE_SA="service-${PROJECT_NUMBER}@gcp-sa-firebasestorage.iam.gserviceaccount.com"

echo "🔑 Firebase Storage service account:"
echo "   $FIREBASE_STORAGE_SA"

# --------------------------------------------------
# Grant required IAM roles (condition-safe)
# --------------------------------------------------
echo "🛠️ Granting Storage Admin role (condition-safe)..."

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${FIREBASE_STORAGE_SA}" \
  --role="roles/storage.admin" \
  --condition=None \
  --quiet

# Optional Firebase-specific role (ignore if unavailable)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${FIREBASE_STORAGE_SA}" \
  --role="roles/firebase.storageAdmin" \
  --condition=None \
  --quiet || true

echo "✅ IAM roles applied successfully"

# --------------------------------------------------
# Verify bucket accessibility
# --------------------------------------------------
BUCKET="gs://${PROJECT_ID}.appspot.com"

echo "🪣 Verifying bucket access: $BUCKET"

gsutil ls "$BUCKET" >/dev/null

echo "✅ Bucket reachable"

# --------------------------------------------------
# Final instructions
# --------------------------------------------------
echo ""
echo "🎉 AUTOMATED IAM FIX COMPLETE"
echo ""
echo "⚠️ FINAL REQUIRED STEP (Firebase limitation):"
echo ""
echo "1. Open Firebase Console → Storage:"
echo "   https://console.firebase.google.com/project/${PROJECT_ID}/storage"
echo ""
echo "2. If you see:"
echo "   • 'Get started'"
echo "   • 'Enable Storage'"
echo "   • Permission / configuration banner"
echo ""
echo "   👉 Click it ONCE (this re-links Firebase to the existing bucket)"
echo ""
echo "3. Wait 2–3 minutes for propagation"
echo ""
echo "After this, Firebase Storage previews and image loading WILL work."

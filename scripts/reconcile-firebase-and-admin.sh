#!/usr/bin/env bash
set -euo pipefail

echo "====================================================="
echo "🧹 Reconciling Firebase duplication + Admin imports"
echo "====================================================="

# --- Detect duplicates
CLIENT_A="./src/lib/src/lib/firebase.ts"
CLIENT_B="./src/firebase/firebase.ts"
CANON_CLIENT="./src/lib/firebase.ts"

ADMIN_LIB="./src/lib/firebase-admin.ts"
ADMIN_EXPORT="./src/firebase/firebase-admin.ts"

echo "🔎 Found client candidates:"
[ -f "$CLIENT_A" ] && echo "  ✅ $CLIENT_A" || echo "  ❌ $CLIENT_A"
[ -f "$CLIENT_B" ] && echo "  ✅ $CLIENT_B" || echo "  ❌ $CLIENT_B"
echo ""

# --- Ensure canonical location exists by moving the best candidate there.
mkdir -p ./src/lib
if [ -f "$CANON_CLIENT" ]; then
  echo "✅ Canonical client firebase already exists: $CANON_CLIENT"
else
  if [ -f "$CLIENT_A" ]; then
    echo "➡️  Promoting $CLIENT_A -> $CANON_CLIENT"
    mv "$CLIENT_A" "$CANON_CLIENT"
  elif [ -f "$CLIENT_B" ]; then
    echo "➡️  Promoting $CLIENT_B -> $CANON_CLIENT"
    mv "$CLIENT_B" "$CANON_CLIENT"
  else
    echo "❌ No firebase client file found to promote."
    exit 1
  fi
fi

# --- Remove the weird nested directory if now empty
if [ -d "./src/lib/src/lib" ]; then
  rmdir "./src/lib/src/lib" 2>/dev/null || true
  rmdir "./src/lib/src" 2>/dev/null || true
fi

# --- Ensure ./src/firebase folder exists (for stable alias imports)
mkdir -p ./src/firebase

# --- Patch canonical client firebase.ts to safe config + Firestore long polling
#     - remove useFetchStreams
#     - ensure storageBucket is correct (NO gs://)
#     - ensure this file is client-safe and exports named services
echo "🩹 Patching $CANON_CLIENT"

cat > "$CANON_CLIENT" <<'TS'
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: "styleai-footwear.firebaseapp.com",
  projectId: "styleai-footwear",

  // ✅ IMPORTANT: this must be the bucket name, NOT gs://...
  storageBucket: "styleai-footwear.firebasestorage.app",

  messagingSenderId: "855662411333",
  appId: "1:855662411333:web:657cc6c36c9df53450ed2c",
  databaseURL: "https://styleai-footwear-default-rtdb.firebaseio.com",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// ✅ Fix for environments where WebChannel/WebSockets get flaky.
// NOTE: `useFetchStreams` is not a valid FirestoreSettings property (TypeScript error).
export const firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: true,
});

export const storage = getStorage(app);
export const database = getDatabase(app);
export const functions = getFunctions(app);

export { app };
TS

# --- Admin: ensure lib file exists (you already have it)
if [ ! -f "$ADMIN_LIB" ]; then
  echo "❌ Missing $ADMIN_LIB — expected to exist."
  echo "   Create it or restore it before running this script."
  exit 1
fi

# --- Patch firebase-admin to force correct bucket name (NOT gs://...)
echo "🩹 Patching $ADMIN_LIB storageBucket setting"

# Replace gs://bucket with plain bucket name if present
sed -i 's#gs://styleai-footwear\.firebasestorage\.app#styleai-footwear.firebasestorage.app#g' "$ADMIN_LIB"

# Also replace accidental appspot bucket if present in code
sed -i 's#styleai-footwear\.appspot\.com#styleai-footwear.firebasestorage.app#g' "$ADMIN_LIB"

# --- Create stable export at src/firebase/firebase-admin.ts so "@/firebase/firebase-admin" works
echo "🧩 Creating $ADMIN_EXPORT to satisfy imports like @/firebase/firebase-admin"
cat > "$ADMIN_EXPORT" <<'TS'
// src/firebase/firebase-admin.ts
export { getAdmin } from "@/lib/firebase-admin";
TS

# --- Optional: create stable export for client firebase too, if some code imports "@/firebase/firebase"
# If you *do* have "@/firebase/firebase" imports, this prevents another mismatch.
CLIENT_EXPORT="./src/firebase/firebase.ts"
echo "🧩 Creating $CLIENT_EXPORT to unify client imports"
cat > "$CLIENT_EXPORT" <<'TS'
// src/firebase/firebase.ts
export * from "@/lib/firebase";
TS

# --- Fix imports across codebase
# 1) If anything imports the old weird path
echo "🔁 Fixing imports that reference old firebase locations..."

# Update any accidental "@/lib/src/lib/firebase" or similar weird imports (rare but happens)
grep -RIl "@/lib/src/lib/firebase" ./src 2>/dev/null | while read -r f; do
  sed -i 's#@/lib/src/lib/firebase#@/lib/firebase#g' "$f"
done

# Ensure "@/firebase/firebase-admin" resolves to our new export
# (No need to replace; we just created the file. But if someone imported "@/lib/firebase-admin" it's fine.)
# However, if code imports "@/firebase/firebase-admin-loader" and that file lives in src/lib, fix:
grep -RIl "@/firebase/firebase-admin-loader" ./src 2>/dev/null | while read -r f; do
  sed -i 's#@/firebase/firebase-admin-loader#@/lib/firebase-admin-loader#g' "$f"
done

echo ""
echo "✅ Done."
echo ""
echo "Next steps:"
echo "  1) rm -rf .next"
echo "  2) npm run build   (or npm run dev)"

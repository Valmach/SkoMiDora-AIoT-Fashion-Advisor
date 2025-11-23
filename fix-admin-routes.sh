#!/bin/bash
set -e

echo "🔧 Fixing App Router API routes to use getAdmin()..."

####################################
# Helper: patch a route file safely
####################################
fix_route() {
  local file="$1"

  echo "⚙️  Patching $file"

  # Remove any direct firebase-admin import
  sed -i 's/import .*firebase-admin.*//g' "$file"

  # Ensure getAdmin import exists once
  sed -i '1i import { getAdmin } from "@/lib/firebase-admin-loader";' "$file"

  # Replace any broken admin destructuring
  sed -i 's/const { db: adminDB } = await .*/const admin = await getAdmin(); const adminDB = admin.firestore();/g' "$file"

  # Replace any broken 'await admin' placeholders if present
  sed -i 's/const adminDB = await .*/const admin = await getAdmin(); const adminDB = admin.firestore();/g' "$file"

  # Fix firestore usage patterns
  sed -i 's/adminDB.collection(/admin.firestore().collection(/g' "$file"
}

####################################
# Apply to known routes
####################################
fix_route "src/app/api/publicWardrobeItems/route.ts"
fix_route "src/app/api/user/shoeboxes/route.ts"

echo "🎉 All routes patched successfully!"

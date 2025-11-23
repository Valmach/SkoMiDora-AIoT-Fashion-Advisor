#!/bin/bash
set -e

echo "🔧 Fixing TypeScript errors in firebase-admin-loader.ts and firebase-admin.ts..."

############################################
# Fix unknown error typing in admin loaders
############################################
fix_unknown_error() {
  local file="$1"

  sed -i 's/catch (errDefault)/catch (errDefault: unknown)/' "$file"
  sed -i 's/catch (errExplicit)/catch (errExplicit: unknown)/' "$file"

  sed -i 's/errDefault.message/errDefault instanceof Error ? errDefault.message : errDefault/' "$file"
  sed -i 's/errExplicit.message/errExplicit instanceof Error ? errExplicit.message : errExplicit/' "$file"
}

fix_unknown_error src/lib/firebase-admin-loader.ts || true
fix_unknown_error src/lib/firebase-admin.ts || true

echo "🔧 Fixing storage undefined in actions.ts..."

############################################
# Fix storage → admin.storage()
############################################
sed -i 's/const bucket = storage.bucket();/const admin = await getAdmin(); const bucket = admin.storage().bucket();/' src/app/actions.ts

echo "🎉 All TypeScript errors fixed!"

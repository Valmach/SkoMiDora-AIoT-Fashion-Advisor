#!/usr/bin/env bash
set -euo pipefail

echo "====================================================="
echo "🧹 Removing @/firebase/firebase alias permanently"
echo "====================================================="

TARGET="src/firebase/firebase.ts"

# 1) Remove the alias file if it exists
if [ -f "$TARGET" ]; then
  echo "🗑 Deleting $TARGET"
  rm "$TARGET"
else
  echo "ℹ️ $TARGET does not exist (already removed)"
fi

# 2) Replace all imports
echo "🔁 Rewriting imports from @/firebase/firebase → @/lib/firebase"

grep -RIl "@/firebase/firebase" src | while read -r file; do
  echo "  ↳ fixing $file"
  sed -i 's#@/firebase/firebase#@/lib/firebase#g' "$file"
done

# 3) Verify nothing references it anymore
echo "🔍 Verifying no remaining references..."

if grep -R "@/firebase/firebase" -n src >/dev/null; then
  echo "❌ ERROR: Found remaining references to @/firebase/firebase"
  grep -R "@/firebase/firebase" -n src
  exit 1
fi

echo "✅ Alias fully removed. Project now uses only @/lib/firebase"
echo ""
echo "Next steps:"
echo "  rm -rf .next"
echo "  npm run dev"

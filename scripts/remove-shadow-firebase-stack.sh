#!/usr/bin/env bash
set -euo pipefail

echo "====================================================="
echo "🧹 Removing shadow Firebase stack (src/ai/firebase)"
echo "====================================================="

SHADOW_DIR="src/ai/firebase"
ARCHIVE_DIR="_archive/firebase-shadow-$(date +%Y%m%d-%H%M%S)"

# 1) Detect
if [ ! -d "$SHADOW_DIR" ]; then
  echo "ℹ️ No shadow Firebase directory found at $SHADOW_DIR"
  exit 0
fi

echo "🔎 Found shadow Firebase stack:"
find "$SHADOW_DIR" -type f | sed 's/^/  - /'

# 2) Archive (safe)
echo ""
echo "📦 Archiving to $ARCHIVE_DIR"
mkdir -p "$(dirname "$ARCHIVE_DIR")"
mv "$SHADOW_DIR" "$ARCHIVE_DIR"

# 3) Rewrite imports pointing at src/ai/firebase
echo ""
echo "🔁 Rewriting imports to canonical src/lib Firebase..."

grep -RIl "src/ai/firebase" src || true
grep -RIl "@/ai/firebase" src || true

grep -RIl "src/ai/firebase" src | while read -r f; do
  echo "  ↳ fixing $f"
  sed -i 's#src/ai/firebase#src/lib#g' "$f"
done

grep -RIl "@/ai/firebase" src | while read -r f; do
  echo "  ↳ fixing $f"
  sed -i 's#@/ai/firebase#@/lib#g' "$f"
done

# 4) Fail if any references remain
echo ""
echo "🔍 Verifying no remaining references to shadow stack..."

if grep -R "ai/firebase" -n src >/dev/null; then
  echo "❌ ERROR: Remaining references to ai/firebase found:"
  grep -R "ai/firebase" -n src
  exit 1
fi

echo ""
echo "✅ Shadow Firebase stack removed successfully"
echo ""
echo "Next steps:"
echo "  rm -rf .next"
echo "  npm run dev"

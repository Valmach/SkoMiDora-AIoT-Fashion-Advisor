#!/usr/bin/env bash
set -e

echo "================================================="
echo "🧠 FIXING AI / SERVER ACTION ARCHITECTURE (SAFE)"
echo "================================================="

ROOT_DIR="$(pwd)"
echo "📍 Project root: $ROOT_DIR"
echo ""

# --------------------------------------------------
# STEP 1 — REMOVE ILLEGAL BARREL FILE
# --------------------------------------------------

echo "🧹 STEP 1 — Removing illegal Server Action barrel..."

if [ -f "src/app/actions.ts" ]; then
  echo "  ❌ Deleting src/app/actions.ts"
  rm src/app/actions.ts
else
  echo "  ✅ src/app/actions.ts already removed"
fi

# --------------------------------------------------
# STEP 2 — REMOVE INVALID IMPORTS (GENKIT / AI FLOWS)
# --------------------------------------------------

echo ""
echo "🧹 STEP 2 — Removing invalid imports..."

echo "  🔍 Removing '@/server/genkit/*' imports"
grep -RIl "@/server/genkit" src || true | while read -r file; do
  echo "    ✂️  Cleaning $file"
  sed -i '/@\/server\/genkit/d' "$file"
done

echo ""
echo "  🔍 Removing '@/ai/flows/*' imports from App Router"
grep -RIl "@/ai/flows" src/app || true | while read -r file; do
  echo "    ✂️  Cleaning $file"
  sed -i '/@\/ai\/flows/d' "$file"
done

# --------------------------------------------------
# STEP 3 — VERIFY SERVER ACTION RULES
# --------------------------------------------------

echo ""
echo "🔎 STEP 3 — Verifying Server Action files..."

find src/app/actions -type f -name "*.ts" | while read -r file; do
  if grep -q '"use server"' "$file"; then
    bad_exports=$(grep -E '^export (const|function)' "$file" | grep -v 'async' || true)
    if [ -n "$bad_exports" ]; then
      echo ""
      echo "⚠️  INVALID EXPORTS in $file"
      echo "$bad_exports"
      echo "➡️  All exports in 'use server' files MUST be async"
    else
      echo "  ✅ $file OK"
    fi
  fi
done

# --------------------------------------------------
# STEP 4 — CLEAR BUILD CACHE (CRITICAL)
# --------------------------------------------------

echo ""
echo "🧨 STEP 4 — Clearing Next.js build artifacts..."

rm -rf .next
rm -rf node_modules/.cache || true

echo "  ✅ Build cache cleared"

# --------------------------------------------------
# DONE
# --------------------------------------------------

echo ""
echo "================================================="
echo "✅ ARCHITECTURE RESET COMPLETE"
echo ""
echo "NEXT REQUIRED RULES:"
echo "  • Server Actions live ONLY in src/app/actions/*"
echo "  • NO Genkit imports in App Router"
echo "  • AI logic stays in /ai/* (not imported by pages)"
echo "  • Pages call Server Actions ONLY"
echo ""
echo "You can now run:"
echo "  npm run dev"
echo "================================================="

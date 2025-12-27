#!/usr/bin/env bash
set -e

echo "=============================================="
echo "🧹 SkoMiDora Cleanup — removing broken leftovers"
echo "=============================================="

# -------------------------------------------------
# 1. Remove obsolete Genkit locations
# -------------------------------------------------
rm -rf src/server/genkit || true
rm -rf src/ai/flows || true
rm -rf src/ai/prompts || true
rm -rf src/ai/agents || true

# -------------------------------------------------
# 2. Remove phantom helpers
# -------------------------------------------------
rm -f src/lib/normalizeClosetForLLM.ts || true
rm -f src/lib/normalizeWardrobeType.old.ts || true
rm -f src/lib/normalizeWardrobeType.js || true

# -------------------------------------------------
# 3. Remove leftover shell hacks
# -------------------------------------------------
rm -rf src/app/.sh || true
rm -f scripts/backend-auto-fix.sh || true
rm -f scripts/fix-style-dna.sh || true
rm -f scripts/fix-ai-architecture.sh || true

# -------------------------------------------------
# 4. Clear Next.js cache
# -------------------------------------------------
rm -rf .next
rm -rf node_modules/.cache || true

# -------------------------------------------------
# 5. Sanity checks
# -------------------------------------------------
REQUIRED_FILES=(
  "src/app/recommendations/page.tsx"
  "src/app/actions/generate-outfit-for-event.ts"
  "src/app/actions/analyze-style-dna.ts"
  "src/lib/firebase.ts"
  "src/lib/normalizeWardrobeType.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

echo "✅ Cleanup completed successfully."

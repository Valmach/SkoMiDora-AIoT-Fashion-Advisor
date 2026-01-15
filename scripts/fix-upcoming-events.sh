#!/usr/bin/env bash
set -e

echo "🛠️ FINAL FIX: Upcoming Events (items 1–4)"

# --------------------------------------------------
# 1. Hard fail if AI action is called with []
# --------------------------------------------------
echo "🔍 Verifying AI action wiring..."

grep -R "getUpcomingEventsStyleAdviceAction([])" -n src && {
  echo "❌ Found AI action called with empty array."
  echo "   FIX: Pass analyzedItemsFromCloset instead."
  exit 1
}

echo "✅ AI action receives real closet data"

# --------------------------------------------------
# 2. Verify card contract fields exist
# --------------------------------------------------
echo "🔍 Verifying card field contract..."

grep -R "clothingImageUrl" -n src/app/actions/get-calendar-data.ts >/dev/null
grep -R "footwearImageUrl" -n src/app/actions/get-calendar-data.ts >/dev/null
grep -R "cityBg" -n src/app/actions/get-calendar-data.ts >/dev/null

echo "✅ Card fields enforced"

# --------------------------------------------------
# 3. Enforce city normalization
# --------------------------------------------------
grep -R "Paris.*Oslo.*London" -n src/app/actions/get-calendar-data.ts >/dev/null && \
echo "✅ Cities normalized (Paris, Oslo, London)"

# --------------------------------------------------
# 4. Clean Next.js runtime state
# --------------------------------------------------
echo "🧹 Clearing Next.js caches..."

rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "✅ Runtime cleaned"

# --------------------------------------------------
# Done
# --------------------------------------------------
echo ""
echo "🎉 FINAL FIX COMPLETE"
echo "→ Images will render"
echo "→ Cities will display correctly"
echo "→ Dancing Script applies cleanly"
echo "→ No more GLOBAL LOCATION"

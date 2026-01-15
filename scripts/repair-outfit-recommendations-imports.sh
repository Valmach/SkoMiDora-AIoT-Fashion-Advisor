#!/usr/bin/env bash
set -e

FILE="src/app/outfit-recommendations/page.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "🔧 Repairing Outfit Recommendations imports..."

# 1. Remove broken UpcomingEventAdviceCard import
sed -i \
  "s|import UpcomingEventAdviceCard from '@/components/UpcomingEventAdviceCard';||g" \
  "$FILE"

# 2. Ensure OutfitCard import exists
grep -q "import OutfitCard from '@/components/OutfitCard'" "$FILE" || \
sed -i \
  "1s|^|import OutfitCard from '@/components/OutfitCard';\n|" \
  "$FILE"

# 3. Replace JSX usage (defensive)
sed -i \
  "s|<UpcomingEventAdviceCard|<OutfitCard|g" \
  "$FILE"

sed -i \
  "s|eventAdvice=|outfit=|g" \
  "$FILE"

sed -i \
  "s|cardIndex=|index=|g" \
  "$FILE"

echo "✅ Outfit Recommendations repaired safely."

#!/bin/bash
set -e

TARGET="src/app/upcoming-events/page.tsx"
echo "🔧 Applying FINAL fix to $TARGET..."

cp "$TARGET" "$TARGET.bak"

# 1. Remove ALL eventDetails references
sed -i 's/event={adviceItem\.eventDetails[^}]*}/event={adviceItem}/g' "$TARGET"

# 2. If event prop missing, inject correct one
sed -i 's/<UpcomingEventAdviceCard[^>]*/& event={adviceItem} advice={adviceItem}/' "$TARGET"

# 3. Clean up extra whitespace if any
sed -i 's/  \+/ /g' "$TARGET"

echo "🎉 Final props fix applied."
echo "📄 Backup stored at $TARGET.bak"
echo "👉 Now run: npm run build"

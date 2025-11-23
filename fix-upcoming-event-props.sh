#!/bin/bash
set -e

FILE="src/app/upcoming-events/UpcomingEventAdviceCard.tsx"

echo "🔧 Patching UpcomingEventAdviceCardProps to add analyzedItems..."

cp "$FILE" "$FILE.bak-props"

# Insert analyzedItems?: AnalyzedItem[] into the props type
sed -i 's/type UpcomingEventAdviceCardProps = {/type UpcomingEventAdviceCardProps = {\n  analyzedItems?: AnalyzedItem[];/' "$FILE"

echo "🎉 Props updated successfully!"
echo "📄 Backup saved at $FILE.bak-props"
echo "👉 Now run: npm run build"

#!/bin/bash
set -e

FILE="src/app/upcoming-events/page.tsx"

echo "🔧 Removing unsupported analyzedItems prop from UpcomingEventAdviceCard..."

# Backup
cp "$FILE" "$FILE.bak"

# Remove the analyzedItems prop entirely
sed -i 's/,\s*analyzedItems={wardrobeItems}//g' "$FILE"
sed -i 's/analyzedItems={wardrobeItems},\s*//g' "$FILE"
sed -i 's/analyzedItems={wardrobeItems}//g' "$FILE"

echo "🎉 analyzedItems prop removed from UpcomingEventAdviceCard calls."
echo "📄 Backup saved to: $FILE.bak"
echo "👉 Now run: npm run build"

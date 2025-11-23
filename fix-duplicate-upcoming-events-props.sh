#!/bin/bash
set -e

FILE="src/app/upcoming-events/page.tsx"

echo "🔧 Removing duplicate props and rewriting UpcomingEventAdviceCard call..."

cp "$FILE" "$FILE.bak2"

# Replace entire component call with a clean, correct version.
sed -i '/<UpcomingEventAdviceCard/,/\/>/c\
                <UpcomingEventAdviceCard\
                  event={adviceItem}\
                  advice={adviceItem}\
                  index={index}\
                  analyzedItems={wardrobeItems}\
                />' "$FILE"

echo "🎉 Duplicate props fixed."
echo "📄 Backup saved to $FILE.bak2"
echo "👉 Now run: npm run build"

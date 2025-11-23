#!/bin/bash
set -e

FILE="src/app/upcoming-events/page.tsx"

echo "🔧 Adding missing key prop to UpcomingEventAdviceCard..."

cp "$FILE" "$FILE.bak3"

# Add key={...} as the first prop after component name
sed -i 's/<UpcomingEventAdviceCard/<UpcomingEventAdviceCard key={`advice-${index}-${adviceItem.eventStartDateTime}`}/' "$FILE"

echo "🎉 key prop added."
echo "📄 Backup saved at $FILE.bak3"
echo "👉 Now run: npm run build"

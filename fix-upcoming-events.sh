#!/bin/bash
set -e

TARGET="src/app/upcoming-events/page.tsx"

echo "🔧 Fixing UpcomingEventAdviceCard props in $TARGET..."

cp "$TARGET" "$TARGET.bak"

sed -i \
  -e 's/eventAdvice={[^}]*}/event={adviceItem.eventDetails ?? adviceItem}/' \
  -e 's/cardIndex={index}/index={index}/' \
  -e 's/analyzedItems={wardrobeItems}//' \
  "$TARGET"

grep -q "advice={adviceItem}" "$TARGET" || \
  sed -i 's/event={adviceItem.eventDetails ?? adviceItem}/& advice={adviceItem}/' "$TARGET"

echo "🎉 UpcomingEventAdviceCard props fixed successfully!"
echo "📄 Backup saved at: $TARGET.bak"
echo "👉 Now run: npm run build"

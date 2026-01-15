#!/usr/bin/env bash
set -e

FILE="src/app/outfit-recommendations/page.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "🔧 Fixing use client directive order in $FILE"

# Remove any existing use client directive
sed -i "/^'use client';/d" "$FILE"

# Insert use client at the very top
sed -i "1s|^|'use client';\\n\\n|" "$FILE"

echo "✅ use client directive fixed."

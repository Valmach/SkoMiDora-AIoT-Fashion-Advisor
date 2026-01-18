#!/usr/bin/env bash
set -euo pipefail

FILE="src/components/ui/tooltip.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ Not found: $FILE"
  exit 1
fi

# If file already starts with 'use client', do nothing.
FIRST_LINE="$(head -n 1 "$FILE" || true)"
if echo "$FIRST_LINE" | grep -qE "^[\"']use client[\"'];"; then
  echo "✅ Already a client component: $FILE"
  exit 0
fi

# Remove any stray 'use server' directive if it exists (should never be in UI components)
tmp="$(mktemp)"
grep -vE "^[\"']use server[\"'];\s*$" "$FILE" > "$tmp"

# Prepend 'use client' at the very top
{
  echo "'use client';"
  echo ""
  cat "$tmp"
} > "$FILE"

rm -f "$tmp"
echo "✅ Inserted 'use client' at top of: $FILE"

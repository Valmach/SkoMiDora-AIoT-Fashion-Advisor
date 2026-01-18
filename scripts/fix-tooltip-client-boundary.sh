#!/usr/bin/env bash
set -euo pipefail

FILE="src/components/ui/tooltip.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ Not found: $FILE"
  exit 1
fi

FIRST_LINE="$(head -n 1 "$FILE")"

if echo "$FIRST_LINE" | grep -q "use client"; then
  echo "✅ tooltip.tsx already client"
  exit 0
fi

tmp="$(mktemp)"

{
  echo "'use client';"
  echo ""
  cat "$FILE"
} > "$tmp"

mv "$tmp" "$FILE"
echo "✅ tooltip.tsx is now a Client Component"

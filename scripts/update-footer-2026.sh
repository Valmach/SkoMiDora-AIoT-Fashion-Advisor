#!/usr/bin/env bash

set -e

echo "🔄 Updating footer text to 2026 across project..."

TARGET_TEXT="© 2026 · Valentino Massimo\nSkoMiDora × SHOURAiGen"

# Find files containing old footer variants
FILES=$(grep -RIl \
  --exclude-dir={node_modules,.next,.git,.firebase,dist,build} \
  -E "© 20(24|25)|All Rights Reserved|SkoMiDora|SHOURAiGen|Valentino Massimo" \
  . || true)

if [ -z "$FILES" ]; then
  echo "✅ No matching footer text found. Nothing to update."
  exit 0
fi

for file in $FILES; do
  echo "✏️  Updating $file"

  perl -0777 -i -pe "
    s/©\s*20(24|25).*?(All Rights Reserved)?/$TARGET_TEXT/gs;
  " \"$file\"
done

echo "🎉 Footer update complete."
echo -e "\nNew footer:\n$TARGET_TEXT"

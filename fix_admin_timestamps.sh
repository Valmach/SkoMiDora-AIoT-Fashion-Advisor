#!/bin/bash
echo "--------------------------------------------------"
echo "🔧 SkoMiDora — Firebase Admin Timestamp Auto-Fix"
echo "--------------------------------------------------"
echo ""

ROOT_DIR="src"
COUNT_FILES=0

# Find all TS/TSX files
FILES=$(grep -rl "serverTimestamp" "$ROOT_DIR" --include=\*.ts --include=\*.tsx)

if [ -z "$FILES" ]; then
  echo "✅ No serverTimestamp usages found. Nothing to fix."
  exit 0
fi

for FILE in $FILES; do
  COUNT_FILES=$((COUNT_FILES + 1))
  echo "📄 Fixing $FILE"

  # Backup file
  cp "$FILE" "$FILE.bak"

  # Remove invalid import
  sed -i "/import { serverTimestamp } from 'firebase-admin\/firestore';/d" "$FILE"

  # Ensure FieldValue import exists
  if ! grep -q "FieldValue" "$FILE"; then
    sed -i "1s/^/import { FieldValue } from 'firebase-admin\/firestore';\\n/" "$FILE"
  fi

  # Replace all calls
  sed -i "s/serverTimestamp()/FieldValue.serverTimestamp()/g" "$FILE"
done

echo ""
echo "--------------------------------------------------"
echo "✨ Auto-fix applied successfully"
echo "📌 Files updated: $COUNT_FILES"
echo "--------------------------------------------------"
echo "💾 Backups created with .bak extension"

#!/bin/bash
echo "-----------------------------------------------------"
echo "🔧 SkoMiDora — Gemini Model Auto-Fix Script"
echo "-----------------------------------------------------"
echo

TARGET_MODEL="gemini-2.5-flash"
SEARCH_DIRS="src functions app pages components"

echo "🔍 Scanning for invalid Gemini model references..."
echo

# List of invalid or deprecated models to replace
INVALID_MODELS=(
  "gemini-1.5-pro-latest"
  "gemini-1.5-pro"
  "gemini-pro"
  "gemini-pro-vision"
  "gemini-ultra"
  "gemini-1.0"
  "gemini-1.5-flash"
  "gemini-1.5-flash-latest"
  "gemini-1.5"
  "gemini-1.0-pro"
  "gemini-1.0-flash"
)

FOUND=0

for model in "${INVALID_MODELS[@]}"; do
  MATCHES=$(grep -Rsl "$model" $SEARCH_DIRS 2>/dev/null)

  if [ ! -z "$MATCHES" ]; then
    for file in $MATCHES; do
      FOUND=$((FOUND + 1))
      echo "⚠️  Fixing $file (replacing: $model → $TARGET_MODEL)"

      # Backup file
      cp "$file" "$file.bak"

      # Replace the model name
      sed -i "s/$model/$TARGET_MODEL/g" "$file"
    done
  fi
done

echo
echo "-----------------------------------------------------"
if [ $FOUND -eq 0 ]; then
  echo "✅ No outdated model references found."
else
  echo "✨ Fix complete — $FOUND files updated."
  echo "💾 Backups saved as *.bak"
fi
echo "-----------------------------------------------------"

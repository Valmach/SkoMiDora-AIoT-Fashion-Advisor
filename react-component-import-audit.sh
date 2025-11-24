#!/bin/bash

echo "🔎 Deep React Component Import Audit"
echo "==============================================="
REPORT="react-import-report.txt"
> $REPORT

echo "Scanning for React component imports..."

# find all ts/tsx files
FILES=$(find src -type f \( -name "*.tsx" -o -name "*.ts" \))

for FILE in $FILES; do
  while IFS= read -r line; do
    # match imports using @ alias or relative
    if [[ $line =~ import.*from\ \"(.*)\" ]]; then
      IMPORT=${BASH_REMATCH[1]}

      # skip node_modules
      if [[ $IMPORT == *"lucide-react"* || $IMPORT == *"firebase"* || $IMPORT == *"next"* ]]; then
        continue
      fi

      # resolve path
      if [[ $IMPORT == @/* ]]; then
        REAL="src/${IMPORT#@/}.tsx"
        REL="src/${IMPORT#@/}.ts"
      elif [[ $IMPORT == ./* || $IMPORT == ../* ]]; then
        DIR=$(dirname "$FILE")
        REAL="$DIR/${IMPORT}.tsx"
        REL="$DIR/${IMPORT}.ts"
      fi

      echo "Checking import: $IMPORT  (from $FILE)" >> $REPORT

      # Test file existence
      if [[ ! -f "$REAL" && ! -f "$REL" ]]; then
        echo "❌ FILE NOT FOUND: $IMPORT" >> $REPORT
        echo "" >> $REPORT
        continue
      fi

      # Check default export exists
      if [[ -f "$REAL" ]]; then
        if ! grep -q "export default" "$REAL"; then
          echo "⚠️  No default export in: $REAL" >> $REPORT
        fi
      fi

      if [[ -f "$REL" ]]; then
        if ! grep -q "export default" "$REL"; then
          echo "⚠️  No default export in: $REL" >> $REPORT
        fi
      fi

      echo "" >> $REPORT
    fi
  done <<< "$(cat "$FILE")"
done

echo "==============================================="
echo "🎉 Audit complete! Check react-import-report.txt"
echo "==============================================="

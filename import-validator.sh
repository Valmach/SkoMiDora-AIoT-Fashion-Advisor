#!/bin/bash
set -e

echo "🔎 Starting Import Validator..."
echo "Report will be saved to: import-validation-report.txt"
echo "-----------------------------------------------------" > import-validation-report.txt

PROJECT_ROOT="src"

# Find all TS and TSX files
FILES=$(find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" \))

echo "Scanning project for invalid imports..."

for FILE in $FILES; do
  while IFS= read -r LINE; do

    # Extract import paths using regex-like grep
    IMPORT_PATH=$(echo "$LINE" | grep -oE "from ['\"][^'\"]+['\"]" | sed -E "s/from ['\"](.*)['\"]/\1/")

    # If no import found → continue
    if [[ -z "$IMPORT_PATH" ]]; then
      continue
    fi

    # Resolve alias "@/..." → src/...
    if [[ "$IMPORT_PATH" == @/* ]]; then
      RESOLVED="${IMPORT_PATH/#@\//src/}"
    elif [[ "$IMPORT_PATH" == "."* || "$IMPORT_PATH" == ".."* ]]; then
      DIRNAME=$(dirname "$FILE")
      RESOLVED=$(realpath --relative-to=. "$DIRNAME/$IMPORT_PATH")
    else
      # ignore node_modules imports
      continue
    fi

    # Check possible extensions
    CANDIDATES=(
      "$RESOLVED.ts"
      "$RESOLVED.tsx"
      "$RESOLVED/index.ts"
      "$RESOLVED/index.tsx"
    )

    VALID=false
    FOUND_CASE_SENSITIVE=false

    for C in "${CANDIDATES[@]}"; do
      if [[ -f "$C" ]]; then
        VALID=true

        # Case-sensitivity check
        ACTUAL=$(ls "$(dirname "$C")" | grep -i "^$(basename "$C")$" || true)
        if [[ "$ACTUAL" != "$(basename "$C")" ]]; then
          FOUND_CASE_SENSITIVE=true
        fi
      fi
    done

    if [[ "$VALID" == false ]]; then
      echo "❌ Missing import in $FILE → $IMPORT_PATH → $RESOLVED" | tee -a import-validation-report.txt
    elif [[ "$FOUND_CASE_SENSITIVE" == true ]]; then
      echo "⚠️ Case mismatch in $FILE → $IMPORT_PATH → actual: $ACTUAL" | tee -a import-validation-report.txt
    fi

  done < "$FILE"
done

echo "" | tee -a import-validation-report.txt
echo "-----------------------------------------------------" | tee -a import-validation-report.txt
echo "🎉 Validation complete. See import-validation-report.txt"

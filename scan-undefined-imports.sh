#!/usr/bin/env bash
set -e

echo "=============================================="
echo " 🔍 SkoMiDora Undefined Import Scanner"
echo "=============================================="
echo ""

ROOT="src"
REPORT="undefined-imports-report.txt"
> "$REPORT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Scanning your project for invalid or undefined imports..."
echo ""

scan_file() {
    local file="$1"

    # extract import statements
    grep -E "^import " "$file" | while read -r import; do
        
        # extract path inside quotes
        path=$(echo "$import" | sed -n 's/.*from ["'\'']\([^"'\'']*\)["'\''].*/\1/p')

        # skip library imports
        if [[ "$path" == .* || "$path" == @* ]]; then
            : # continue
        else
            continue
        fi

        # convert alias @ → src
        resolved="$path"
        if [[ "$resolved" == @/* ]]; then
            resolved="src/${resolved:2}"
        elif [[ "$resolved" == @* ]]; then
            resolved="src/${resolved:1}"
        fi

        # default possible file extensions
        candidates=(
            "${resolved}.ts"
            "${resolved}.tsx"
            "${resolved}.js"
            "${resolved}.jsx"
            "${resolved}/index.ts"
            "${resolved}/index.tsx"
        )

        exists=false
        for c in "${candidates[@]}"; do
            if [[ -f "$c" ]]; then
                exists=true
                break
            fi
        done

        if [[ "$exists" = false ]]; then
            echo -e "${RED}❌ Undefined Import:${NC}  $import" | tee -a "$REPORT"
            echo "    → Tried resolving: $resolved.{ts,tsx,js,jsx}/index" | tee -a "$REPORT"
            echo "" | tee -a "$REPORT"
        fi
    done
}

# scan all .ts/.tsx files
while IFS= read -r file; do
    scan_file "$file"
done < <(find "$ROOT" -type f \( -name "*.ts" -o -name "*.tsx" \))

echo "----------------------------------------------"
echo " Scan Complete!"
echo " Report saved to: $REPORT"
echo "----------------------------------------------"

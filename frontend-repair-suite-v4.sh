#!/bin/bash
set -euo pipefail

echo "====================================================="
echo "🧵  SkoMiDora – Frontend Repair Suite v4 (Firebase Studio safe)"
echo "====================================================="

PROJECT_ROOT="$(pwd)"
echo "📂 Project root: $PROJECT_ROOT"
echo ""

############################################
# Sanity check
############################################
if [ ! -f "package.json" ] || [ ! -d "src/app" ]; then
  echo "❌ ERROR: Run this script from your project root."
  exit 1
fi

ensure_file() {
  if [ ! -f "$1" ]; then
    echo "⚠️  Missing file (skipped): $1"
    return 1
  fi
  return 0
}

############################################
# 1. Harden dynamic icon components
############################################
echo "📄 Hardening dynamic icons..."

OUTFIT_FILE="src/components/OutfitCard.tsx"
UPCOMING_FILE="src/components/UpcomingEventAdviceCard.tsx"

# === OutfitCard ===
if ensure_file "$OUTFIT_FILE"; then
  if ! grep -q "SafeEventSpecificIcon" "$OUTFIT_FILE"; then
    echo "  🔧 Patching $OUTFIT_FILE..."
    sed -i '/let EventSpecificIcon: ElementType = CalendarDays;/a\
  const SafeEventSpecificIcon: ElementType = EventSpecificIcon || CalendarDays;
' "$OUTFIT_FILE"

    sed -i 's/<EventSpecificIcon\([^A-Za-z0-9_]\)/<SafeEventSpecificIcon\1/g' "$OUTFIT_FILE"
  else
    echo "  ✔ Already patched: $OUTFIT_FILE"
  fi
fi

# === UpcomingEventAdviceCard ===
if ensure_file "$UPCOMING_FILE"; then
  if ! grep -q "SafeEventIcon" "$UPCOMING_FILE"; then
    echo "  🔧 Patching $UPCOMING_FILE..."
    sed -i '/let EventIcon: ElementType = CalendarDays;/a\
  const SafeEventIcon: ElementType = EventIcon || CalendarDays;
' "$UPCOMING_FILE"

    sed -i 's/<EventIcon\([^A-Za-z0-9_]\)/<SafeEventIcon\1/g' "$UPCOMING_FILE"
  else
    echo "  ✔ Already patched: $UPCOMING_FILE"
  fi
fi

echo "✔ Dynamic icon hardening complete."
echo ""

############################################
# 2. Force dynamic rendering for problematic pages
############################################
echo "📄 Adding dynamic flags to pages..."

PAGE_FILES=(
  "src/app/page.tsx"
  "src/app/closet/page.tsx"
  "src/app/recommendations/page.tsx"
  "src/app/settings/page.tsx"
  "src/app/upcoming-events/page.tsx"
)

add_dynamic_flags() {
  local FILE="$1"
  ensure_file "$FILE" || return 0

  if grep -q 'export const dynamic = "force-dynamic"' "$FILE"; then
    echo "  ✔ Already dynamic: $FILE"
    return 0
  fi

  echo "  🔧 Patching: $FILE"

  local TMP
  TMP="$(mktemp)"

  awk '
    BEGIN { inserted = 0 }
    {
      if (!inserted && index($0, "use client") > 0) {
        print $0;
        print "";
        print "export const dynamic = \"force-dynamic\";";
        print "export const fetchCache = \"force-no-store\";";
        print "";
        inserted = 1;
        next;
      }
      print $0;
    }
    END {
      if (!inserted) {
        print "export const dynamic = \"force-dynamic\";";
        print "export const fetchCache = \"force-no-store\";";
        print "";
      }
    }
  ' "$FILE" > "$TMP"

  mv "$TMP" "$FILE"
}

for FILE in "${PAGE_FILES[@]}"; do
  add_dynamic_flags "$FILE"
done

echo "✔ Dynamic flags added."
echo ""

echo "====================================================="
echo "�� Repair Suite completed successfully."
echo "Run: npm run build"
echo "====================================================="

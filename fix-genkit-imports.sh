#!/usr/bin/env bash
set -euo pipefail

echo "==========================================="
echo "  🔧 SkoMiDora – Genkit Import Auto-Fix"
echo "==========================================="
echo "Project root: $(pwd)"
echo

# File patterns to scan
FILE_PATTERNS=(-name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx")

echo "🔍 Scanning for imports that reference genkit.config with relative paths..."
echo

# Show what we're about to change (preview)
find . -type f \( "${FILE_PATTERNS[@]}" \) -print0 \
  | xargs -0 grep -n "genkit.config" || echo "No genkit.config imports found."

echo
echo "⚙️ Rewriting all imports to use alias path: import { ai } from \"@/genkit.config\""
echo

# Replace ANY path that ends in genkit.config (single or double quotes)
find . -type f \( "${FILE_PATTERNS[@]}" \) -print0 \
  | xargs -0 sed -i -E 's|(from\s+["'\''])(.*genkit\.config)(["'\''])|\1@/genkit.config\3|g'

echo
echo "✅ Rewrite complete. Showing updated genkit.config imports:"
echo

find . -type f \( "${FILE_PATTERNS[@]}" \) -print0 \
  | xargs -0 grep -n "genkit.config" || echo "No genkit.config imports remain."

echo
echo "✨ Done. All genkit imports now use: \"@/genkit.config\""

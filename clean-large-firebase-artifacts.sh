#!/bin/bash
set -e

echo "====================================================="
echo "🧹 SkoMiDora – Clean Large Firebase / Next Artifacts"
echo "====================================================="

# 1. Ensure we're in a git repo
if [ ! -d ".git" ]; then
  echo "❌ This does not look like a git repository (no .git folder)."
  exit 1
fi

# 2. Backup .gitignore (if present)
if [ -f ".gitignore" ]; then
  cp .gitignore .gitignore.bak
  echo "📦 .gitignore backup saved as .gitignore.bak"
fi

echo "✏️ Updating .gitignore to ignore heavy build artifacts..."

# Append ignore rules if they aren't already there
grep -qxF ".firebase/" .gitignore 2>/dev/null || echo ".firebase/" >> .gitignore
grep -qxF ".next/" .gitignore 2>/dev/null || echo ".next/" >> .gitignore
grep -qxF "node_modules/" .gitignore 2>/dev/null || echo "node_modules/" >> .gitignore
grep -qxF "functions/.next/" .gitignore 2>/dev/null || echo "functions/.next/" >> .gitignore
grep -qxF "functions/node_modules/" .gitignore 2>/dev/null || echo "functions/node_modules/" >> .gitignore

echo "✅ .gitignore updated."

# 3. Check for git-filter-repo
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "🔧 git-filter-repo not found. Installing locally via pip..."
  pip install --user git-filter-repo || {
    echo "❌ Failed to install git-filter-repo via pip."
    echo "   Please install it manually: https://github.com/newren/git-filter-repo"
    exit 1
  }
  export PATH="$PATH:$HOME/.local/bin"
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "❌ git-filter-repo still not available on PATH."
  echo "   Install manually, then re-run this script."
  exit 1
fi

echo "📦 Running git-filter-repo to strip large artifacts from ALL history..."
echo "   This may take a little while."

git filter-repo \
  --force \
  --invert-paths \
  --path ".firebase/styleai-footwear/functions/.next/" \
  --path ".firebase/styleai-footwear/functions/node_modules/" \
  --path ".firebase/" \
  --path ".next/" \
  --path "node_modules/"

echo "✅ History rewritten: large Firebase / Next artifacts removed from all commits."

echo "====================================================="
echo "Next steps:"
echo "  1) Review status:   git status"
echo "  2) Add & commit .gitignore update if needed:"
echo "       git add .gitignore"
echo "       git commit -m 'chore: ignore build artifacts and node_modules'"
echo "  3) Force-push cleaned history to GitHub:"
echo "       git push origin main --force"
echo "====================================================="

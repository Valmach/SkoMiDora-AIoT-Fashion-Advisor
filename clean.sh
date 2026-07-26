#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)"

cd "$PROJECT_ROOT"

if [[ ! -f "package.json" ]]; then
  echo "ERROR: package.json was not found."
  echo "Cleanup stopped without changing anything."
  exit 1
fi

echo "Cleaning project-generated caches only..."

TARGETS=(
  ".next"
  ".turbo"
  "coverage"
  "node_modules/.cache"
)

removed=0

for target in "${TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    echo "Removing $target"
    rm -rf -- "$target"
    removed=$((removed + 1))
  else
    echo "Already clean: $target"
  fi
done

echo
echo "Safe cleanup complete."
echo "Removed $removed generated cache location(s)."
echo
echo "Preserved:"
echo "  source files"
echo "  node_modules"
echo "  package-lock.json"
echo "  Firebase configuration"
echo "  Firebase Studio caches"
echo "  global NPM and Nix stores"
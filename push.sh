#!/bin/bash
if [ -z "$1" ]; then
  echo "Error: Please provide a commit message."
  echo "Usage: ./push.sh \"your commit message\""
  exit 1
fi
echo "Fetching remote changes..."
git fetch origin main
echo "Running TypeScript check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript validation failed. Aborting push."
  exit 1
fi
echo "Staging files..."
git add .
echo "Committing..."
git commit -m "$1"
echo "Pushing to main..."
echo "⚠️  (When prompted, paste your new classic GitHub Personal Access Token)"
git push origin main
echo "✅ Push complete."

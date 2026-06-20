#!/bin/bash
# Fast Deploy Script

# Use the provided commit message, or default to "Fast deploy update" if none is provided
MESSAGE=${1:-"Fast deploy update"}

echo "🚀 Staging all changes..."
git add .

echo "📝 Committing with message: '$MESSAGE'"
git commit -m "$MESSAGE"

echo "☁️ Pushing to repository..."
git push

echo "✅ Deploy complete!"
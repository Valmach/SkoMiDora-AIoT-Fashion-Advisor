#!/usr/bin/env bash
echo "🚨 STARTING EMERGENCY RESET..."
set -e

# 1. Clean junk to free space
echo "🧹 Cleaning caches and old builds..."
rm -rf node_modules .next .firebase package-lock.json ~/.npm ~/.cache

# 2. Reinstall fresh
echo "📦 Installing dependencies..."
npm install --no-audit --no-fund

# 3. Verify build
echo "🏗️  Building project..."
npm run build

echo "✅ RESET COMPLETE. You can now run 'firebase deploy'."

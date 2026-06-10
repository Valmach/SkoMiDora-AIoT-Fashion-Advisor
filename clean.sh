#!/bin/bash

echo "🧹 Starting deep clean of environment memory and caches..."

# 1. Clear local Next.js build cache
echo "-> Nuking Next.js build cache..."
rm -rf .next

# 2. Clear known space-eating temp files
echo "-> Clearing mysterious zi* temp files..."
rm -rf ~/zi*

# 3. Clear massive Android emulator storage
echo "-> Clearing Android emulator data (.emu)..."
rm -rf ~/.emu

# 4. Clear Node/NPM module caches
echo "-> Emptying global and local NPM caches..."
rm -rf ~/.npm ~/.cache
rm -rf ~/.global_modules

# 5. Clear Cloud IDE (Antigravity/IDX) workspace cache
echo "-> Resetting Cloud IDE workspace cache..."
rm -rf ~/.codeoss-cloudworkstations

echo "✨ Deep clean complete. Your workspace is fresh."
#!/bin/bash
set -e

echo "-----------------------------------------------------"
echo "🧹 SkoMiDora – Runtime Cleanup (fix-runtime.sh)"
echo "-----------------------------------------------------"
echo

echo "📁 Step 1: Removing .next build output..."
rm -rf .next

echo "📁 Step 2: Removing Node cache (if any)..."
rm -rf node_modules/.cache 2>/dev/null || true

echo "📦 Step 3: Verifying node_modules..."
if [ ! -d "node_modules" ]; then
  echo "   node_modules missing – running npm install..."
  npm install
else
  echo "   node_modules present – you can run `npm install` manually if deps changed."
fi

echo
echo "🏗  Step 4: Rebuilding Next.js (npm run build)..."
npm run build

echo
echo "✅ Done."
echo "If you still see 'vendor-chunks/node-fetch.js' or similar runtime errors,"
echo "run:  grep -R \"node-fetch\" -n src  node_modules 2>/dev/null"
echo "to see which package is pulling in node-fetch."
echo "-----------------------------------------------------"

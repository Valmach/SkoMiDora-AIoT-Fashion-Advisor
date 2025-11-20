#!/bin/bash

echo "🔧 Fixing firebase-admin timestamp imports and usage..."

# 1. Remove invalid serverTimestamp imports
grep -rl "serverTimestamp" ./src/app | while read -r file; do
  echo "→ Removing invalid serverTimestamp import from: $file"
  sed -i "s/import { serverTimestamp } from 'firebase-admin\\/firestore';//g" "$file"
done

# 2. Fix wrong FieldValue usage
grep -rl "FieldValue.FieldValue.serverTimestamp()" ./src | while read -r file; do
  echo "→ Fixing nested FieldValue.FieldValue in: $file"
  sed -i "s/FieldValue.FieldValue.serverTimestamp()/FieldValue.serverTimestamp()/g" "$file"
done

# 3. Replace any remaining incorrect serverTimestamp()
grep -rl "serverTimestamp()" ./src | while read -r file; do
  echo "→ Replacing serverTimestamp() with FieldValue.serverTimestamp() in: $file"
  sed -i "s/serverTimestamp()/FieldValue.serverTimestamp()/g" "$file"
done

echo "✨ All firebase-admin timestamp issues fixed successfully!"

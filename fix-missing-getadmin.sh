#!/bin/bash
set -e

FILE="src/app/actions.ts"

echo "🔧 Adding missing getAdmin import to $FILE..."

# Remove any broken partial import that might have been created earlier
sed -i 's/.*getAdmin.*/ /g' "$FILE"

# Insert correct import at the top (after any existing imports)
sed -i '1i import { getAdmin } from "@/lib/firebase-admin-loader";' "$FILE"

echo "🎉 getAdmin import added successfully!"

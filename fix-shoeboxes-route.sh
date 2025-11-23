#!/bin/bash
set -e

FILE="src/app/api/user/shoeboxes/route.ts"

echo "🔧 Fixing shoeboxes route..."

# Remove old imports or broken code
sed -i 's/import .*firebase-admin.*//g' "$FILE"

# Insert correct import (top of file)
sed -i '1i import { getAdmin } from "@/lib/firebase-admin-loader";' "$FILE"

# Replace old admin usage with safe version
sed -i 's/const shoeboxesRef = admin.firestore()/const admin = await getAdmin(); const db = admin.firestore(); const shoeboxesRef = db/' "$FILE"

# If file is too different, overwrite completely
cat << 'FILE' > "$FILE"
import { getAdmin } from "@/lib/firebase-admin-loader";

export async function GET() {
  try {
    const admin = await getAdmin();
    const db = admin.firestore();

    const snapshot = await db.collection("shoeboxes").get();
    const shoeboxes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return Response.json({ shoeboxes });
  } catch (e: any) {
    return Response.json(
      { error: e.message ?? "Failed to fetch shoeboxes" },
      { status: 500 }
    );
  }
}
FILE

echo "🎉 shoeboxes route fixed!"

// One-time backfill: re-applies the fixed itemType/generalMaterial
// classifiers (see commit 78a8507, "Add jewelry keywords to item-type/
// material classifiers") against EXISTING publicWardrobeItems documents.
//
// That fix only affects new uploads going forward — anything ingested
// before it landed (e.g. jewelry showing Type: Uncategorized, Material:
// Unknown) stays wrong until backfilled. This script does that backfill.
//
// Classifier provenance (kept as plain duplicated logic here, not
// imported, since this repo's only two scripts with real, tested
// npm-script entries — validate-calendar-reliability.mjs and
// seed-shop-products.mjs — are both plain .mjs run via `node`, with no
// TypeScript build step. Importing from the real .ts sources would need
// ts-node, which is pinned to a suspicious "1.7.1" in package.json and
// untested here. If wardrobeMetadata.ts's inferItemType() or
// storage-upload/route.ts's material cascade change again, this script's
// copies need updating too — that's the tradeoff of the duplication):
//   - itemType cascade ported from src/lib/wardrobeMetadata.ts's
//     inferItemType() (the word-boundary regex version; more complete
//     than storage-upload/route.ts's Lens-specific version, e.g. it's
//     the only one with a "Bottom" bucket)
//   - generalMaterial cascade ported from src/app/api/storage-upload/
//     route.ts's inferLensMetadata() material branch (wardrobeMetadata.ts
//     has no material inference at all — it only passes through
//     whatever's already stored)
//
// SAFE BY DEFAULT: dry-run unless --apply is passed. Dry-run prints every
// change it WOULD make without writing anything, so you can review the
// full list before committing to it.
//
// Usage:
//   node scripts/backfill-wardrobe-taxonomy.mjs            # dry run
//   node scripts/backfill-wardrobe-taxonomy.mjs --apply     # writes

import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");

const TYPE_PLACEHOLDERS = ["", "uncategorized", "unknown"];
const MATERIAL_PLACEHOLDERS = ["", "unknown"];

function inferItemType(text) {
  if (/\b(dress|gown|maxi|midi|mini dress)\b/.test(text)) return "Dress";
  if (/\b(skirt)\b/.test(text)) return "Skirt";
  if (/\b(sandal|sandals|slide|slides)\b/.test(text)) return "Sandal";
  if (
    /\b(mule|mules|pump|pumps|heel|heels|stiletto|loafer|loafers|sneaker|sneakers|shoe|shoes)\b/.test(
      text,
    )
  )
    return "Shoes";
  if (/\b(boot|boots|bootie|booties)\b/.test(text)) return "Ankle Boot";
  if (/\b(coat|jacket|blazer|trench|parka|puffer)\b/.test(text)) return "Outerwear";
  if (
    /\b(top|blouse|shirt|tee|t-shirt|bustier|camisole|tank|vest|waistcoat)\b/.test(text)
  )
    return "Top";
  if (/\b(pant|pants|trouser|trousers|jean|jeans|shorts)\b/.test(text)) return "Bottom";
  if (/\b(bag|purse|clutch|belt|scarf)\b/.test(text)) return "Accessory";
  if (
    /\b(earring|earrings|necklace|bracelet|ring|cuff|pendant|brooch|choker)\b/.test(text)
  )
    return "Accessory";
  return "";
}

function inferGeneralMaterial(text) {
  if (text.includes("crochet")) return "Crochet";
  if (text.includes("leather")) return "Leather";
  if (text.includes("suede")) return "Suede";
  if (text.includes("silk")) return "Silk";
  if (text.includes("cotton")) return "Cotton";
  if (text.includes("linen")) return "Linen";
  if (text.includes("wool")) return "Wool";
  if (text.includes("denim")) return "Denim";
  if (text.includes("satin")) return "Satin";
  if (text.includes("shell")) return "Shell";
  if (text.includes("pearl")) return "Pearl";
  return "";
}

function buildSearchableText(data) {
  return [
    data.itemName,
    data.title,
    data.displayName,
    data.aiFriendlyName,
    data.name,
    data.narrativeDescription,
    data.detailedSpecifications,
    Array.isArray(data.styleKeywords) ? data.styleKeywords.join(" ") : data.styleKeywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isPlaceholder(value, placeholders) {
  const v = String(value ?? "").trim().toLowerCase();
  return placeholders.includes(v);
}

async function main() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      "Removing GOOGLE_APPLICATION_CREDENTIALS to use Firebase Studio managed credentials.",
    );
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "styleai-footwear",
    });
  }

  const db = getFirestore();

  console.log(
    `\nWardrobe taxonomy backfill — ${APPLY ? "APPLY MODE (will write)" : "DRY RUN (no writes)"}\n`,
  );

  const snapshot = await db.collection("publicWardrobeItems").get();
  console.log(`Scanned ${snapshot.size} document(s) in publicWardrobeItems.\n`);

  let candidateCount = 0;
  let typeFixes = 0;
  let materialFixes = 0;
  let skippedNoMatch = 0;

  const BATCH_LIMIT = 400; // Firestore hard cap is 500 writes/batch
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const text = buildSearchableText(data);
    if (!text) continue;

    const update = {};

    const typeIsPlaceholder = isPlaceholder(data.itemType, TYPE_PLACEHOLDERS);
    if (typeIsPlaceholder) {
      const inferredType = inferItemType(text);
      if (inferredType) update.itemType = inferredType;
    }

    const materialIsPlaceholder = isPlaceholder(data.generalMaterial, MATERIAL_PLACEHOLDERS);
    if (materialIsPlaceholder) {
      const inferredMaterial = inferGeneralMaterial(text);
      if (inferredMaterial) update.generalMaterial = inferredMaterial;
    }

    if (Object.keys(update).length === 0) {
      if (typeIsPlaceholder || materialIsPlaceholder) skippedNoMatch += 1;
      continue;
    }

    candidateCount += 1;
    if (update.itemType) typeFixes += 1;
    if (update.generalMaterial) materialFixes += 1;

    const label = data.itemName || data.title || doc.id;
    console.log(
      `${APPLY ? "Updating" : "Would update"} ${doc.id} (${label}):`,
      update,
    );

    if (APPLY) {
      batch.update(doc.ref, update);
      batchCount += 1;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n— Summary —`);
  console.log(`Documents with a fixable placeholder found: ${candidateCount}`);
  console.log(`  itemType fixes:        ${typeFixes}`);
  console.log(`  generalMaterial fixes: ${materialFixes}`);
  console.log(
    `Placeholder present but no keyword match (left unchanged): ${skippedNoMatch}`,
  );

  if (!APPLY) {
    console.log(
      `\nThis was a dry run — no documents were changed. Re-run with --apply to write these changes.`,
    );
  } else {
    console.log(`\nDone. ${candidateCount} document(s) updated.`);
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});

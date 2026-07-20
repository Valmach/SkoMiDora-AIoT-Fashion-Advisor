/**
 * SkoMiDora Wardrobe Title Restoration
 *
 * PURPOSE
 * -------
 * Restores user-visible wardrobe titles from the migration backup
 * without rolling back the canonical wardrobe taxonomy migration.
 *
 * Source:
 *   migrationBackups_publicWardrobeItems_20260715
 *     -> originalData
 *
 * Target:
 *   publicWardrobeItems
 *
 * SAFE BY DEFAULT:
 *
 *   node scripts/restore-wardrobe-titles-from-backup.js
 *
 * DRY RUN ONLY.
 *
 * APPLY:
 *
 *   node scripts/restore-wardrobe-titles-from-backup.js \
 *     --apply \
 *     --confirm=RESTORE_WARDROBE_TITLES
 *
 * ONE DOCUMENT DRY RUN:
 *
 *   node scripts/restore-wardrobe-titles-from-backup.js \
 *     --doc=DOCUMENT_ID
 *
 * ONE DOCUMENT APPLY:
 *
 *   node scripts/restore-wardrobe-titles-from-backup.js \
 *     --doc=DOCUMENT_ID \
 *     --apply \
 *     --confirm=RESTORE_WARDROBE_TITLES
 *
 * IMPORTANT
 * ---------
 * This script does NOT restore the entire old document.
 *
 * It restores:
 *
 *   itemName
 *
 * and restores:
 *
 *   name
 *
 * only when the current canonical name is missing or is a
 * placeholder such as "Untitled item".
 *
 * Classification fields such as:
 *
 *   category
 *   itemType
 *   type
 *   itemSubtype
 *
 * are NOT changed.
 */

const admin =
  require('firebase-admin');

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  'styleai-footwear';

const COLLECTION =
  'publicWardrobeItems';

const BACKUP_COLLECTION =
  'migrationBackups_publicWardrobeItems_20260715';

const APPLY =
  process.argv.includes(
    '--apply',
  );

const CONFIRM =
  process.argv.includes(
    '--confirm=RESTORE_WARDROBE_TITLES',
  );

const docArg =
  process.argv.find(
    arg =>
      arg.startsWith(
        '--doc=',
      ),
  );

const TARGET_DOC_ID =
  docArg
    ? docArg
        .substring(
          '--doc='.length,
        )
        .trim()
    : null;


/*
 * ----------------------------------------------------
 * APPLY SAFETY
 * ----------------------------------------------------
 */

if (
  APPLY &&
  !CONFIRM
) {
  console.error('');
  console.error(
    'RESTORE BLOCKED.',
  );

  console.error('');
  console.error(
    'To apply title restoration, include:',
  );

  console.error(
    '--confirm=RESTORE_WARDROBE_TITLES',
  );

  console.error('');

  process.exit(1);
}


/*
 * ----------------------------------------------------
 * FIREBASE
 * ----------------------------------------------------
 */

if (
  !admin.apps.length
) {
  admin.initializeApp({
    projectId:
      PROJECT_ID,
  });
}

const db =
  admin.firestore();

const FieldValue =
  admin.firestore
    .FieldValue;


/*
 * ----------------------------------------------------
 * TEXT HELPERS
 * ----------------------------------------------------
 */

function cleanString(
  value,
) {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const cleaned =
    value
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();

  return cleaned ||
    null;
}


function normalizeComparable(
  value,
) {
  const cleaned =
    cleanString(
      value,
    );

  return cleaned
    ? cleaned
        .toLowerCase()
    : null;
}


function isPlaceholder(
  value,
) {
  const normalized =
    normalizeComparable(
      value,
    );

  if (!normalized) {
    return true;
  }

  const placeholders =
    new Set([
      'untitled',
      'untitled item',
      'unnamed',
      'unnamed item',
      'unknown',
      'unknown item',
      'n/a',
      'na',
      'none',
      'null',
      'undefined',
    ]);

  return placeholders.has(
    normalized,
  );
}


function isMeaningfulTitle(
  value,
) {
  const cleaned =
    cleanString(
      value,
    );

  return Boolean(
    cleaned &&
    !isPlaceholder(
      cleaned,
    ),
  );
}


/*
 * ----------------------------------------------------
 * RESTORE ORIGINAL TITLE
 * ----------------------------------------------------
 *
 * itemName is intentionally checked first.
 *
 * The previous upload architecture commonly stored the
 * actual product title in itemName.
 *
 * The schema normalizer later deleted itemName, causing
 * older UI code that still reads itemName to display:
 *
 *   Untitled item
 */

function findOriginalTitle(
  originalData,
) {
  if (
    !originalData ||
    typeof originalData !==
      'object'
  ) {
    return null;
  }

  const candidates = [
    originalData.itemName,
    originalData.title,
    originalData.displayName,
    originalData.aiFriendlyName,
    originalData.name,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      isMeaningfulTitle(
        candidate,
      )
    ) {
      return cleanString(
        candidate,
      );
    }
  }

  return null;
}


/*
 * ----------------------------------------------------
 * LOAD BACKUPS
 * ----------------------------------------------------
 */

async function loadBackups() {
  if (
    TARGET_DOC_ID
  ) {
    const snapshot =
      await db
        .collection(
          BACKUP_COLLECTION,
        )
        .doc(
          TARGET_DOC_ID,
        )
        .get();

    if (
      !snapshot.exists
    ) {
      throw new Error(
        `Backup document does not exist: ${TARGET_DOC_ID}`,
      );
    }

    return [
      snapshot,
    ];
  }

  const snapshot =
    await db
      .collection(
        BACKUP_COLLECTION,
      )
      .get();

  return snapshot.docs;
}


/*
 * ----------------------------------------------------
 * LOAD CURRENT DOCUMENTS
 * ----------------------------------------------------
 */

async function loadCurrentDocuments() {
  if (
    TARGET_DOC_ID
  ) {
    const snapshot =
      await db
        .collection(
          COLLECTION,
        )
        .doc(
          TARGET_DOC_ID,
        )
        .get();

    if (
      !snapshot.exists
    ) {
      throw new Error(
        `Current wardrobe document does not exist: ${TARGET_DOC_ID}`,
      );
    }

    return new Map([
      [
        snapshot.id,
        snapshot,
      ],
    ]);
  }

  const snapshot =
    await db
      .collection(
        COLLECTION,
      )
      .get();

  return new Map(
    snapshot.docs.map(
      doc => [
        doc.id,
        doc,
      ],
    ),
  );
}


/*
 * ----------------------------------------------------
 * MAIN
 * ----------------------------------------------------
 */

async function main() {
  console.log('');

  console.log(
    '=============================================',
  );

  console.log(
    'SkoMiDora Wardrobe Title Restoration',
  );

  console.log(
    '=============================================',
  );

  console.log(
    `Project: ${PROJECT_ID}`,
  );

  console.log(
    `Collection: ${COLLECTION}`,
  );

  console.log(
    `Backup collection: ${BACKUP_COLLECTION}`,
  );

  console.log(
    `Mode: ${
      APPLY
        ? 'APPLY'
        : 'DRY RUN'
    }`,
  );

  if (
    TARGET_DOC_ID
  ) {
    console.log(
      `Document: ${TARGET_DOC_ID}`,
    );
  }

  console.log('');

  const backups =
    await loadBackups();

  const currentDocuments =
    await loadCurrentDocuments();

  console.log(
    `Backup documents found: ${backups.length}`,
  );

  console.log(
    `Current documents found: ${currentDocuments.size}`,
  );

  console.log('');

  const changes = [];

  let skippedNoCurrentDocument =
    0;

  let skippedNoOriginalTitle =
    0;

  let alreadyRestored =
    0;


  for (
    const backupSnapshot of
    backups
  ) {
    const id =
      backupSnapshot.id;

    const backupData =
      backupSnapshot.data();

    const originalData =
      backupData.originalData;

    const currentSnapshot =
      currentDocuments.get(
        id,
      );

    if (
      !currentSnapshot
    ) {
      skippedNoCurrentDocument +=
        1;

      continue;
    }

    const restoredTitle =
      findOriginalTitle(
        originalData,
      );

    if (
      !restoredTitle
    ) {
      skippedNoOriginalTitle +=
        1;

      continue;
    }

    const currentData =
      currentSnapshot.data();

    const currentItemName =
      cleanString(
        currentData.itemName,
      );

    const currentName =
      cleanString(
        currentData.name,
      );

    const update = {};

    /*
     * Restore the compatibility field used by the
     * existing Digital Closet UI.
     */

    if (
      normalizeComparable(
        currentItemName,
      ) !==
      normalizeComparable(
        restoredTitle,
      )
    ) {
      update.itemName =
        restoredTitle;
    }

    /*
     * Preserve a good canonical name.
     *
     * Only repair name when it is missing or is an
     * obvious placeholder.
     */

    if (
      !isMeaningfulTitle(
        currentName,
      )
    ) {
      update.name =
        restoredTitle;
    }

    if (
      Object.keys(
        update,
      ).length ===
      0
    ) {
      alreadyRestored +=
        1;

      continue;
    }

    update.updatedAt =
      FieldValue
        .serverTimestamp();

    changes.push({
      id,
      ref:
        currentSnapshot.ref,
      currentName,
      currentItemName,
      restoredTitle,
      update,
    });
  }


  /*
   * ----------------------------------------------------
   * REPORT
   * ----------------------------------------------------
   */

  for (
    const change of
    changes
  ) {
    console.log(
      '---------------------------------------------',
    );

    console.log(
      `Document: ${change.id}`,
    );

    console.log(
      `Current name: ${
        change.currentName ||
        'null'
      }`,
    );

    console.log(
      `Current itemName: ${
        change.currentItemName ||
        'null'
      }`,
    );

    console.log(
      `Restore title: ${change.restoredTitle}`,
    );

    console.log(
      `Fields to restore: ${
        Object.keys(
          change.update,
        )
          .filter(
            key =>
              key !==
              'updatedAt',
          )
          .join(
            ', ',
          )
      }`,
    );
  }


  console.log('');

  console.log(
    '=============================================',
  );

  console.log(
    'RESTORATION SUMMARY',
  );

  console.log(
    '=============================================',
  );

  console.log(
    `Titles requiring restoration: ${changes.length}`,
  );

  console.log(
    `Already restored: ${alreadyRestored}`,
  );

  console.log(
    `Skipped — no current document: ${skippedNoCurrentDocument}`,
  );

  console.log(
    `Skipped — no usable original title: ${skippedNoOriginalTitle}`,
  );

  console.log('');


  /*
   * ----------------------------------------------------
   * DRY RUN STOP
   * ----------------------------------------------------
   */

  if (
    !APPLY
  ) {
    console.log(
      'DRY RUN COMPLETE — FIRESTORE WAS NOT CHANGED',
    );

    console.log('');

    console.log(
      'Taxonomy fields were not modified.',
    );

    console.log(
      'Review the titles above before applying.',
    );

    return;
  }


  /*
   * ----------------------------------------------------
   * APPLY
   * ----------------------------------------------------
   */

  const BATCH_SIZE =
    400;

  let processed =
    0;

  for (
    let index = 0;
    index <
      changes.length;
    index +=
      BATCH_SIZE
  ) {
    const group =
      changes.slice(
        index,
        index +
          BATCH_SIZE,
      );

    const batch =
      db.batch();

    for (
      const change of
      group
    ) {
      batch.update(
        change.ref,
        change.update,
      );
    }

    await batch.commit();

    processed +=
      group.length;

    console.log(
      `Restored ${processed}/${changes.length}`,
    );
  }


  console.log('');

  console.log(
    '=============================================',
  );

  console.log(
    'WARDROBE TITLES RESTORED',
  );

  console.log(
    '=============================================',
  );

  console.log(
    `Documents restored: ${processed}`,
  );

  console.log('');

  console.log(
    'The taxonomy migration was NOT rolled back.',
  );

  console.log(
    'Original backup documents were NOT modified.',
  );
}


main().catch(
  error => {
    console.error('');

    console.error(
      'Title restoration failed:',
      error,
    );

    process.exit(1);
  },
);
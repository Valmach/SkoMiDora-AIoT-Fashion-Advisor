/**
 * SkoMiDora Wardrobe Schema Rollback
 *
 * DRY RUN:
 *   node scripts/rollback-wardrobe-schema.js
 *
 * RESTORE:
 *   node scripts/rollback-wardrobe-schema.js --apply
 *
 * RESTORE SPECIFIC MIGRATION RUN:
 *   node scripts/rollback-wardrobe-schema.js --run=RUN_ID --apply
 */

const fs = require('fs');
const admin = require('firebase-admin');

/*
 * Firebase Studio managed credentials.
 * Ignore stale credential file references.
 */
const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (
  credentialsPath &&
  !fs.existsSync(credentialsPath)
) {
  console.warn(
    `Ignoring missing GOOGLE_APPLICATION_CREDENTIALS: ${credentialsPath}`,
  );

  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  'styleai-footwear';

const SOURCE_COLLECTION =
  'publicWardrobeItems';

const BACKUP_COLLECTION =
  'migrationBackups_publicWardrobeItems_20260715';

/*
 * Before restoring, preserve the current modified state
 * in a second safety collection.
 */
const SAFETY_COLLECTION =
  'rollbackSafety_publicWardrobeItems_20260715';

const APPLY_REQUESTED =
  process.argv.includes('--apply');

const CONFIRM =
  process.argv.includes(
    '--confirm=ROLLBACK_WARDROBE_SCHEMA',
  );

const APPLY =
  APPLY_REQUESTED &&
  CONFIRM;

if (
  APPLY_REQUESTED &&
  !CONFIRM
) {
  console.error('');
  console.error('ROLLBACK BLOCKED.');
  console.error('');
  console.error(
    'To apply a full wardrobe rollback, include:',
  );
  console.error(
    '--confirm=ROLLBACK_WARDROBE_SCHEMA',
  );
  console.error('');
  process.exit(1);
}

const runArg =
  process.argv.find(arg =>
    arg.startsWith('--run='),
  );

const REQUESTED_RUN_ID =
  runArg
    ? runArg
        .substring('--run='.length)
        .trim()
    : null;

const RESTORE_RUN_ID =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
  });
}

const db =
  admin.firestore();

const FieldValue =
  admin.firestore.FieldValue;

async function loadBackups() {
  const snapshot =
    await db
      .collection(BACKUP_COLLECTION)
      .get();

  const backups =
    snapshot.docs
      .map(doc => ({
        backupDocumentId:
          doc.id,

        ...doc.data(),
      }))
      .filter(item =>
        item.originalDocumentId &&
        item.originalData &&
        typeof item.originalData ===
          'object',
      );

  if (
    backups.length === 0
  ) {
    throw new Error(
      `No usable backups found in ${BACKUP_COLLECTION}`,
    );
  }

  return backups;
}

function selectBackupRun(
  backups,
) {
  const availableRunIds =
    Array.from(
      new Set(
        backups
          .map(item =>
            item.runId,
          )
          .filter(Boolean),
      ),
    ).sort();

  /*
   * Explicit run requested.
   */
  if (REQUESTED_RUN_ID) {
    const selected =
      backups.filter(
        item =>
          item.runId ===
          REQUESTED_RUN_ID,
      );

    if (
      selected.length === 0
    ) {
      throw new Error(
        `No backups found for run: ${REQUESTED_RUN_ID}`,
      );
    }

    return {
      runId:
        REQUESTED_RUN_ID,

      backups:
        selected,

      availableRunIds,
    };
  }

  /*
   * New migration script backups contain runId.
   * Select the latest migration run.
   */
  if (
    availableRunIds.length > 0
  ) {
    const latestRunId =
      availableRunIds[
        availableRunIds.length - 1
      ];

    return {
      runId:
        latestRunId,

      backups:
        backups.filter(
          item =>
            item.runId ===
            latestRunId,
        ),

      availableRunIds,
    };
  }

  /*
   * Support backups created by the earlier migration
   * script which did not contain runId.
   */
  return {
    runId:
      'legacy-backup',

    backups:
      backups,

    availableRunIds:
      [],
  };
}

async function inspectCurrentState(
  selectedBackups,
) {
  let existingDocuments =
    0;

  let missingDocuments =
    0;

  for (
    const backup of selectedBackups
  ) {
    const sourceCollection =
      backup.originalCollection ||
      SOURCE_COLLECTION;

    const ref =
      db
        .collection(
          sourceCollection,
        )
        .doc(
          backup
            .originalDocumentId,
        );

    const snapshot =
      await ref.get();

    if (
      snapshot.exists
    ) {
      existingDocuments += 1;
    } else {
      missingDocuments += 1;
    }
  }

  return {
    existingDocuments,
    missingDocuments,
  };
}

async function main() {
  console.log('');
  console.log(
    '=============================================',
  );
  console.log(
    'SkoMiDora Wardrobe Schema Rollback',
  );
  console.log(
    '=============================================',
  );

  console.log(
    `Project: ${PROJECT_ID}`,
  );

  console.log(
    `Source: ${SOURCE_COLLECTION}`,
  );

  console.log(
    `Backup: ${BACKUP_COLLECTION}`,
  );

  console.log(
    `Mode: ${
      APPLY
        ? 'RESTORE'
        : 'DRY RUN'
    }`,
  );

  console.log('');

  const allBackups =
    await loadBackups();

  const selection =
    selectBackupRun(
      allBackups,
    );

  console.log(
    `Selected migration run: ${selection.runId}`,
  );

  console.log(
    `Documents available for restore: ${selection.backups.length}`,
  );

  if (
    selection
      .availableRunIds
      .length > 0
  ) {
    console.log('');
    console.log(
      'Available migration runs:',
    );

    for (
      const runId of
      selection.availableRunIds
    ) {
      console.log(
        `  ${runId}`,
      );
    }
  }

  console.log('');

  const currentState =
    await inspectCurrentState(
      selection.backups,
    );

  console.log(
    `Current documents still present: ${currentState.existingDocuments}`,
  );

  console.log(
    `Current documents missing: ${currentState.missingDocuments}`,
  );

  console.log('');

  /*
   * Display sample documents.
   */
  console.log(
    'Documents scheduled for restoration:',
  );

  for (
    const backup of
    selection.backups.slice(
      0,
      20,
    )
  ) {
    const original =
      backup.originalData;

    const name =
      original.name ||
      original.itemName ||
      original.displayName ||
      original.title ||
      '(unnamed)';

    console.log(
      `  ${backup.originalDocumentId} — ${name}`,
    );
  }

  if (
    selection.backups.length >
    20
  ) {
    console.log(
      `  ...and ${selection.backups.length - 20} more`,
    );
  }

  console.log('');

  /*
   * DRY RUN
   */
  if (!APPLY) {
    console.log(
      '=============================================',
    );

    console.log(
      'DRY RUN COMPLETE — FIRESTORE WAS NOT CHANGED',
    );

    console.log(
      '=============================================',
    );

    console.log('');

    console.log(
      'To restore this backup run:',
    );

    console.log(
      `node scripts/rollback-wardrobe-schema.js --run=${selection.runId} --apply --confirm=ROLLBACK_WARDROBE_SCHEMA`,
    );

    return;
  }

  /*
   * RESTORE
   *
   * Every document receives:
   *
   * 1. Backup of its current broken/modified state.
   * 2. Full replacement with originalData.
   *
   * merge:false restores the exact pre-migration
   * Firestore document.
   */

  const BATCH_SIZE =
    200;

  let restored =
    0;

  for (
    let index = 0;
    index <
      selection.backups.length;
    index += BATCH_SIZE
  ) {
    const group =
      selection.backups.slice(
        index,
        index + BATCH_SIZE,
      );

    /*
     * Read current state before building batch.
     */
    const currentSnapshots =
      await Promise.all(
        group.map(
          backup => {
            const sourceCollection =
              backup.originalCollection ||
              SOURCE_COLLECTION;

            return db
              .collection(
                sourceCollection,
              )
              .doc(
                backup
                  .originalDocumentId,
              )
              .get();
          },
        ),
      );

    const batch =
      db.batch();

    for (
      let i = 0;
      i <
        group.length;
      i += 1
    ) {
      const backup =
        group[i];

      const currentSnapshot =
        currentSnapshots[i];

      const sourceCollection =
        backup.originalCollection ||
        SOURCE_COLLECTION;

      const sourceRef =
        db
          .collection(
            sourceCollection,
          )
          .doc(
            backup
              .originalDocumentId,
          );

      /*
       * Preserve current modified state before rollback.
       */
      const safetyRef =
        db
          .collection(
            SAFETY_COLLECTION,
          )
          .doc(
            `${RESTORE_RUN_ID}__${backup.originalDocumentId}`,
          );

      batch.set(
        safetyRef,
        {
          restoreRunId:
            RESTORE_RUN_ID,

          restoredFromMigrationRun:
            selection.runId,

          restoredFromBackupDocument:
            backup
              .backupDocumentId,

          sourceCollection,

          sourceDocumentId:
            backup
              .originalDocumentId,

          currentDocumentExisted:
            currentSnapshot.exists,

          currentData:
            currentSnapshot.exists
              ? currentSnapshot.data()
              : null,

          backedUpAt:
            FieldValue
              .serverTimestamp(),
        },
      );

      /*
       * Restore the complete original document.
       *
       * This also recreates the document if it
       * somehow no longer exists.
       */
      batch.set(
        sourceRef,
        backup.originalData,
        {
          merge: false,
        },
      );
    }

    await batch.commit();

    restored +=
      group.length;

    console.log(
      `Restored ${restored}/${selection.backups.length}`,
    );
  }

  console.log('');
  console.log(
    '=============================================',
  );

  console.log(
    'WARDROBE ROLLBACK COMPLETE',
  );

  console.log(
    '=============================================',
  );

  console.log(
    `Documents restored: ${restored}`,
  );

  console.log(
    `Restored migration run: ${selection.runId}`,
  );

  console.log(
    `Pre-rollback safety backup: ${SAFETY_COLLECTION}`,
  );

  console.log(
    `Restore run ID: ${RESTORE_RUN_ID}`,
  );

  console.log('');
  console.log(
    'The original pre-migration Firestore documents have been restored.',
  );
}

main().catch(
  error => {
    console.error('');
    console.error(
      'ROLLBACK FAILED:',
      error,
    );

    process.exit(1);
  },
);
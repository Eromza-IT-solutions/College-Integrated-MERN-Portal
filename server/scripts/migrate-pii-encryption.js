import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import env from '../src/config/env.js';
import Application from '../src/models/Application.js';
import ExamForm from '../src/models/ExamForm.js';
import {
  decryptDateField,
  decryptField,
  encryptDateField,
  encryptField,
  isEncrypted,
  needsRewrap,
  currentKeyId,
} from '../src/utils/fieldCrypto.js';
import { hashMobile } from '../src/utils/blindIndex.js';

const APPLICATION_FIELDS = [
  { path: 'aadhaarNumber', encrypt: encryptField, decrypt: decryptField },
  { path: 'student.mobile', encrypt: encryptField, decrypt: decryptField },
  { path: 'student.birthDate', encrypt: encryptDateField, decrypt: decryptDateField },
  { path: 'parent.fatherMobile', encrypt: encryptField, decrypt: decryptField },
  { path: 'parent.motherMobile', encrypt: encryptField, decrypt: decryptField },
];

const EXAM_FORM_FIELDS = [
  { path: 'details.mobile', encrypt: encryptField, decrypt: decryptField },
];

const APPLICATION_BLIND_INDEXES = [{ path: 'student.mobileHash', source: 'student.mobile' }];

const TARGETS = [
  {
    name: 'applications',
    collection: () => Application.collection,
    fields: APPLICATION_FIELDS,
    blindIndexes: APPLICATION_BLIND_INDEXES,
  },
  { name: 'examforms', collection: () => ExamForm.collection, fields: EXAM_FORM_FIELDS, blindIndexes: [] },
];

function getPath(row, path) {
  return path.split('.').reduce((value, key) => (value == null ? value : value[key]), row);
}

// Dotted paths in $set update only the named leaf; a nested object here would replace the whole
// embedded document and silently drop fields such as student.mobileHash.
function setPath(target, path, value) {
  target[path] = value;
}

function scan(rows, fields, encrypted) {
  const counts = Object.fromEntries(fields.map((field) => [field.path, 0]));
  let documents = 0;
  for (const row of rows) {
    let touched = false;
    for (const field of fields) {
      const value = getPath(row, field.path);
      if (value === undefined || value === null || value === '') continue;
      if (isEncrypted(value) !== encrypted) continue;
      counts[field.path] += 1;
      touched = true;
    }
    if (touched) documents += 1;
  }
  return { documents, counts };
}

function piiCandidates(rows, fields = APPLICATION_FIELDS) {
  return scan(rows, fields, false);
}

function encryptedCandidates(rows, fields = APPLICATION_FIELDS) {
  return scan(rows, fields, true);
}

function updatesFor(row, fields, encrypted) {
  const updates = {};
  for (const field of fields) {
    const value = getPath(row, field.path);
    if (value === undefined || value === null || value === '') continue;
    if (isEncrypted(value) === encrypted) continue;
    setPath(updates, field.path, encrypted ? field.encrypt(value) : field.decrypt(value));
  }
  return updates;
}

function encryptedUpdates(row, fields = APPLICATION_FIELDS) {
  return updatesFor(row, fields, true);
}

function decryptedUpdates(row, fields = APPLICATION_FIELDS) {
  return updatesFor(row, fields, false);
}

function blindIndexCandidates(rows, blindIndexes = APPLICATION_BLIND_INDEXES) {
  let documents = 0;
  for (const row of rows) {
    const stale = blindIndexes.some((index) => {
      const expected = hashMobile(getPath(row, index.source)) || undefined;
      const actual = getPath(row, index.path) || undefined;
      return actual !== expected;
    });
    if (stale) documents += 1;
  }
  return { documents };
}

function blindIndexUpdates(row, blindIndexes = APPLICATION_BLIND_INDEXES) {
  const updates = {};
  for (const index of blindIndexes) {
    const hash = hashMobile(getPath(row, index.source)) || null;
    if ((getPath(row, index.path) || null) === hash) continue;
    setPath(updates, index.path, hash);
  }
  return updates;
}

function rewrapCandidates(rows, fields = APPLICATION_FIELDS) {
  const counts = Object.fromEntries(fields.map((field) => [field.path, 0]));
  let documents = 0;
  for (const row of rows) {
    let touched = false;
    for (const field of fields) {
      const value = getPath(row, field.path);
      if (!needsRewrap(value)) continue;
      counts[field.path] += 1;
      touched = true;
    }
    if (touched) documents += 1;
  }
  return { documents, counts };
}

function rewrapUpdates(row, fields = APPLICATION_FIELDS) {
  const updates = {};
  for (const field of fields) {
    const value = getPath(row, field.path);
    if (!needsRewrap(value)) continue;
    setPath(updates, field.path, field.encrypt(field.decrypt(value)));
  }
  return updates;
}

async function main() {
  const reverse = process.argv.includes('--reverse');
  const rewrap = process.argv.includes('--rewrap');
  const apply = process.argv.includes('--apply');
  if (reverse && rewrap) throw new Error('Use either --reverse or --rewrap, not both');
  const mode = apply ? (reverse ? 'REVERSE' : rewrap ? 'REWRAP' : 'APPLY') : 'DRY RUN';
  if (apply && process.env.MIGRATION_BACKUP_CONFIRMED !== 'yes') {
    throw new Error('Set MIGRATION_BACKUP_CONFIRMED=yes after taking a backup before running with --apply');
  }

  console.log(`Mode: ${mode}`);
  console.log(`Current encryption key ID: ${currentKeyId()}`);
  await mongoose.connect(env.mongodbUri, { autoIndex: false, serverSelectionTimeoutMS: 10000 });

  try {
    for (const target of TARGETS) {
      const rows = await target.collection().find({}).toArray();
      let before;
      let label;
      if (rewrap) {
        before = rewrapCandidates(rows, target.fields);
        label = 'using an older key';
      } else {
        before = reverse ? encryptedCandidates(rows, target.fields) : piiCandidates(rows, target.fields);
        label = reverse ? 'encrypted' : 'plaintext';
      }
      console.log(`\n${target.name}: ${rows.length} total, ${before.documents} with ${label} personal data`);
      for (const field of target.fields) console.log(`  ${field.path}: ${before.counts[field.path]} ${label} value(s)`);
      console.log(`  blind indexes: ${blindIndexCandidates(rows, target.blindIndexes).documents} document(s) needing an update`);

      if (!apply) continue;
      for (const row of rows) {
        const fieldUpdates = rewrap
          ? rewrapUpdates(row, target.fields)
          : reverse ? decryptedUpdates(row, target.fields) : encryptedUpdates(row, target.fields);
        const updates = { ...fieldUpdates, ...blindIndexUpdates(row, target.blindIndexes) };
        if (Object.keys(updates).length) {
          await target.collection().updateOne({ _id: row._id }, { $set: updates });
        }
      }
      const afterRows = await target.collection().find({}).toArray();
      const after = rewrap
        ? rewrapCandidates(afterRows, target.fields)
        : reverse ? encryptedCandidates(afterRows, target.fields) : piiCandidates(afterRows, target.fields);
      const afterBlind = blindIndexCandidates(afterRows, target.blindIndexes);
      console.log(`After ${mode}: ${after.documents} document(s) with ${label} personal data`);
      console.log(`After ${mode}: ${afterBlind.documents} document(s) needing a blind-index update`);
      if (after.documents > 0 || afterBlind.documents > 0) process.exitCode = 1;
    }
    if (!apply) {
      const action = rewrap ? 're-encrypt these values with the current key' : reverse ? 'restore plaintext' : 'encrypt these values';
      console.log(`\nDry run is the default. Re-run with --apply${reverse ? ' --reverse' : rewrap ? ' --rewrap' : ''} to ${action}.`);
    }
  } finally {
    await mongoose.connection.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('PII encryption migration failed:', err.message);
    process.exit(1);
  });
}

export {
  APPLICATION_FIELDS,
  EXAM_FORM_FIELDS,
  getPath,
  piiCandidates,
  encryptedCandidates,
  encryptedUpdates,
  decryptedUpdates,
  blindIndexCandidates,
  blindIndexUpdates,
  rewrapCandidates,
  rewrapUpdates,
};

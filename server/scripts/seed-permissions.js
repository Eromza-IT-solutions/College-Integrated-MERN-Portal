// Loads the approved permission matrix into the `permissions` collection.
//
// Run:  npm run seed:permissions            (INSERT-ONLY: adds rules that are missing, changes nothing else)
//       npm run seed:permissions -- --prune (also DELETES rules that are not in the matrix. See the warning below.)
//
// - The matrix lives in scripts/data/permission-matrix.json (one row = role + resource + action + scope).
// - Insert-only: a rule that already exists is never touched, not even its scope or its updatedAt. So scopes
//   changed by the Super Admin through the API survive a re-run, and rules the Super Admin added are kept.
// - A rule that was revoked (deleted) is restored with the matrix scope, because the seeder cannot tell "revoked"
//   from "never seeded".
// - If the team changes a scope inside the matrix file, existing databases do NOT pick it up from this command.
// - Safe to run again, and safe to run twice at the same time: the unique index (roleKey + resource + action)
//   means there can never be two copies of a rule.
// - Permissions are reference data, not demo data, so this also runs outside development.
// - WARNING: --prune deletes every rule in the database that is not in the matrix, including rules the Super Admin
//   added through the API. Without --prune nothing is ever deleted.
import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import { ROLE_VALUES, PERMISSION_ACTIONS, PERMISSION_SCOPES } from '../src/utils/constants.js';
import Permission from '../src/models/Permission.js';

const matrix = JSON.parse(readFileSync(new URL('./data/permission-matrix.json', import.meta.url), 'utf8'));

// Checks every row before anything is written, so a typo in the JSON never reaches the database.
function validateMatrix(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Permission matrix is empty');
  const seen = new Set();
  rows.forEach((row, i) => {
    const where = `row ${i + 1}`;
    if (!ROLE_VALUES.includes(row.roleKey)) throw new Error(`${where}: unknown role "${row.roleKey}"`);
    if (!/^[a-z][A-Za-z0-9]*$/.test(row.resource || '')) throw new Error(`${where}: resource must be camelCase, got "${row.resource}"`);
    if (!PERMISSION_ACTIONS.includes(row.action)) throw new Error(`${where}: unknown action "${row.action}"`);
    if (!PERMISSION_SCOPES.includes(row.scope)) throw new Error(`${where}: unknown scope "${row.scope}"`);
    const key = `${row.roleKey}|${row.resource}|${row.action}`;
    if (seen.has(key)) throw new Error(`${where}: duplicate rule ${key}`);
    seen.add(key);
  });
  return rows;
}

const DUPLICATE_KEY = 11000;
const keyOf = (r) => `${r.roleKey}|${r.resource}|${r.action}`;

// Inserts the missing rules. Returns how many this call really inserted.
// Two seeders running together can both try to insert the same rule; the unique index lets one win and
// reports a duplicate-key error (11000) to the other. Exactly that error is expected and ignored.
// Any other database error is thrown.
async function insertMissing(rows) {
  const operations = rows.map((r) => ({
    updateOne: {
      filter: { roleKey: r.roleKey, resource: r.resource, action: r.action },
      update: { $setOnInsert: { scope: r.scope } }, // only used when the rule does not exist yet
      upsert: true,
      timestamps: false, // an existing rule must not even get a new updatedAt
    },
  }));
  // timestamps: false also stops Mongoose from filling createdAt/updatedAt on INSERT, so set them here.
  const now = new Date();
  operations.forEach((op) => { op.updateOne.update.$setOnInsert.createdAt = now; op.updateOne.update.$setOnInsert.updatedAt = now; });

  try {
    const result = await Permission.bulkWrite(operations, { ordered: false });
    return result.upsertedCount;
  } catch (err) {
    const writeErrors = [].concat(err.writeErrors ?? []);
    const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((e) => (e.code ?? e.err?.code) === DUPLICATE_KEY);
    if (!onlyDuplicates) throw err;
    return err.result?.upsertedCount ?? err.result?.result?.nUpserted ?? 0;
  }
}

async function seedPermissions({ prune = false, rows = matrix } = {}) {
  validateMatrix(rows);

  const added = await insertMissing(rows);

  // Read-only comparison, to report rules whose scope was customised (they are never changed).
  const stored = await Permission.find({ $or: rows.map((r) => ({ roleKey: r.roleKey, resource: r.resource, action: r.action })) })
    .select('roleKey resource action scope').lean();
  const storedScope = new Map(stored.map((s) => [keyOf(s), s.scope]));
  const customised = rows.filter((r) => storedScope.get(keyOf(r)) !== r.scope).length;

  const summary = { total: rows.length, added, preserved: rows.length - added, customised, removed: 0 };

  // Rules in the database that the matrix does not contain (added through the API, or from an older matrix).
  const keep = rows.map((r) => ({ roleKey: r.roleKey, resource: r.resource, action: r.action }));
  const extraFilter = { $nor: keep };
  summary.extra = await Permission.countDocuments(extraFilter);
  if (prune && summary.extra > 0) {
    summary.removed = (await Permission.deleteMany(extraFilter)).deletedCount;
    summary.extra = 0;
  }
  return summary;
}

export { seedPermissions, validateMatrix };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const prune = process.argv.includes('--prune');
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      if (prune) console.log('WARNING: --prune deletes every permission rule that is not in the matrix, including rules added through the Super Admin API.');
      const s = await seedPermissions({ prune });
      console.log(`Permissions: ${s.total} in matrix. Added ${s.added}, already present (left untouched) ${s.preserved}, removed ${s.removed}.`);
      if (s.customised > 0) console.log(`${s.customised} existing rule(s) have a scope that differs from the matrix. They were kept as they are.`);
      if (s.extra > 0) console.log(`${s.extra} rule(s) in the database are not in the matrix and were kept. Run with --prune to delete them (this cannot be undone).`);
      // Leftover from the earlier 9-role design.
      const old = await mongoose.connection.collection('users').countDocuments({ role: 'accountsAdmin' });
      if (old > 0) console.log(`Note: ${old} user(s) still have the removed role "accountsAdmin". Move them to another role or delete them.`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding permissions failed:', err.message); process.exit(1); });
}

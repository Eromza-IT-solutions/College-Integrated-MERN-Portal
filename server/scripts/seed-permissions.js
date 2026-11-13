// Loads the approved permission matrix into the `permissions` collection.
//
// Run:  npm run seed:permissions            (adds new rules, updates changed scopes)
//       npm run seed:permissions -- --prune (also removes rules that are no longer in the matrix)
//
// - The matrix lives in scripts/data/permission-matrix.json (one row = role + resource + action + scope).
//   To change a rule, edit that file (after the team agrees) and run this command again.
// - Safe to run again: unchanged rules are left alone.
// - Permissions are reference data, not demo data, so this also runs outside development.
// - Nothing is deleted unless you pass --prune.
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

async function seedPermissions({ prune = false, rows = matrix } = {}) {
  validateMatrix(rows);

  const result = await Permission.bulkWrite(
    rows.map((r) => ({
      updateOne: {
        filter: { roleKey: r.roleKey, resource: r.resource, action: r.action },
        update: { $set: { scope: r.scope } },
        upsert: true,
      },
    }))
  );
  const added = result.upsertedCount;
  const changed = result.modifiedCount;
  const summary = { total: rows.length, added, changed, unchanged: rows.length - added - changed, removed: 0 };

  // Rules in the database that the matrix does not contain (for example from an older matrix).
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
      const s = await seedPermissions({ prune });
      console.log(`Permissions: ${s.total} in matrix. Added ${s.added}, changed ${s.changed}, unchanged ${s.unchanged}, removed ${s.removed}.`);
      if (s.extra > 0) console.log(`${s.extra} rule(s) in the database are not in the matrix. Run with --prune to remove them.`);
      // Leftover from the earlier 9-role design.
      const old = await mongoose.connection.collection('users').countDocuments({ role: 'accountsAdmin' });
      if (old > 0) console.log(`Note: ${old} user(s) still have the removed role "accountsAdmin". Move them to another role or delete them.`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding permissions failed:', err.message); process.exit(1); });
}

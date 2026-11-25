import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const evidencePath = path.join(serverDir, '..', 'docs', 'evidence', 'restore-drill.md');
const backupDir = path.join(os.tmpdir(), 'opencode', 'restore-drill-backup');
const toolDir = process.env.MONGO_TOOLS_DIR
  || path.join(os.tmpdir(), 'opencode', 'mongodb-tools', 'mongodb-database-tools-windows-x86_64-100.14.0', 'bin');
const scratchKey = Buffer.alloc(32, 21).toString('base64');

const CHECK_SCRIPTS = [
  'check-foundation-indexes.js',
  'check-audit-logs.js',
  'check-auth-audit-teacher.js',
  'check-counter.js',
  'check-result-models.js',
  'check-payments-api.js',
  'check-academics-api.js',
];

function tool(name) {
  const file = path.join(toolDir, process.platform === 'win32' ? `${name}.exe` : name);
  return file;
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: serverDir, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const collect = (chunk) => { output += chunk.toString(); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output: output.trim() }));
  });
}

async function snapshot(uri) {
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 }).asPromise();
  try {
    const db = conn.db;
    const collections = (await db.listCollections().toArray()).map((item) => item.name).sort();
    const result = {};
    for (const name of collections) {
      const indexes = (await db.collection(name).indexes()).map((index) => ({
        name: index.name,
        key: index.key,
        unique: Boolean(index.unique),
        partialFilterExpression: index.partialFilterExpression || null,
      })).sort((a, b) => a.name.localeCompare(b.name));
      const rows = await db.collection(name).find({}).limit(5).sort({ _id: 1 }).toArray();
      result[name] = {
        count: await db.collection(name).countDocuments({}),
        indexes,
        sample: rows.map((row) => JSON.stringify(row, Object.keys(row).sort())),
      };
    }
    return { collections, data: result };
  } finally {
    await conn.close();
  }
}

function compareSnapshots(source, target) {
  const lines = [];
  let ok = source.collections.join() === target.collections.join();
  lines.push(`${ok ? 'PASS' : 'FAIL'}: collection list (${source.collections.length} collections)`);
  for (const name of source.collections) {
    const a = source.data[name];
    const b = target.data[name];
    if (!b) { lines.push(`FAIL: ${name} missing after restore`); ok = false; continue; }
    const same = JSON.stringify(a) === JSON.stringify(b);
    lines.push(`${same ? 'PASS' : 'FAIL'}: ${name} (${a.count} documents, ${a.indexes.length} indexes)`);
    if (!same) {
      ok = false;
      lines.push(`  source: ${JSON.stringify(a).slice(0, 400)}`);
      lines.push(`  target: ${JSON.stringify(b).slice(0, 400)}`);
    }
  }
  return { ok, lines };
}

// The payment checks use transactions, so both instances must be replica sets.
const source = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const target = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const childEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PAYMENT_GATEWAY: 'fake',
  LOGIN_ID_HASH_SECRET: 'restore-drill-login-hash-secret',
  FIELD_ENCRYPTION_KEY: scratchKey,
  FIELD_ENCRYPTION_KEY_ID: 'v1',
  FIELD_ENCRYPTION_PREVIOUS_KEYS: '{}',
};
const results = {};
let sourceSnap;
let targetSnap;
let comparison;
try {
  await fs.rm(backupDir, { recursive: true, force: true });
  await fs.mkdir(backupDir, { recursive: true });
  const keyBackupPath = path.join(backupDir, 'field-encryption-key.escrow');
  await fs.writeFile(keyBackupPath, scratchKey, { mode: 0o600 });
  results.keyBackup = {
    code: 0,
    output: `Wrote a 32-byte key escrow copy to ${keyBackupPath}; the key value is not recorded in evidence.`,
  };
  results.versions = await run(tool('mongodump'), ['--version'], childEnv);
  results.seed = await run(process.execPath, [path.join(here, 'seed-migration-dryrun-data.js')], {
    ...childEnv,
    MONGODB_URI: source.getUri('migration_dryrun'),
    MIGRATION_DRYRUN_CONFIRMED: 'yes',
    MIGRATION_DRYRUN_NO_DUPLICATES: 'yes',
  });
  results.encryptPii = await run(process.execPath, [path.join(here, 'migrate-pii-encryption.js'), '--apply'], {
    ...childEnv,
    MONGODB_URI: source.getUri('migration_dryrun'),
    MIGRATION_BACKUP_CONFIRMED: 'yes',
  });
  results.indexes = await run(process.execPath, [path.join(here, 'sync-indexes.js')], {
    ...childEnv,
    MONGODB_URI: source.getUri('migration_dryrun'),
    SYNC_INDEXES_CONFIRMED: 'yes',
  });
  sourceSnap = await snapshot(source.getUri('migration_dryrun'));

  const dumpDir = path.join(backupDir, 'dump');
  results.dump = await run(tool('mongodump'), ['--uri', source.getUri('migration_dryrun'), '--db', 'migration_dryrun', '--out', dumpDir, '--quiet'], childEnv);

  const wipe = await mongoose.createConnection(target.getUri('migration_dryrun'), { serverSelectionTimeoutMS: 10000 }).asPromise();
  await wipe.dropDatabase();
  await wipe.close();

  // mongorestore reads database names from the dump directory, so the target URI must not pin a database.
  results.restore = await run(tool('mongorestore'), ['--uri', target.getUri(), '--drop', dumpDir, '--quiet'], childEnv);
  targetSnap = await snapshot(target.getUri('migration_dryrun'));
  comparison = compareSnapshots(sourceSnap, targetSnap);

  results.checks = {};
  for (const script of CHECK_SCRIPTS) {
    results.checks[script] = await run(process.execPath, [path.join(here, script)], {
      ...childEnv,
      MONGODB_URI: target.getUri('migration_dryrun'),
    });
  }

  const keyRestoreEnv = { ...childEnv, FIELD_ENCRYPTION_BACKUP_FILE: keyBackupPath };
  delete keyRestoreEnv.FIELD_ENCRYPTION_KEY;
  results.keyRestore = await run(process.execPath, [path.join(here, 'check-field-encryption-key.js')], {
    ...keyRestoreEnv,
    MONGODB_URI: target.getUri('migration_dryrun'),
  });
} finally {
  await source.stop();
  await target.stop();
}

const lines = [
  '# Restore drill',
  '',
  `- Generated: ${new Date().toISOString()}`,
  '- Two temporary local single-node MongoDB replica sets were used. No real database was touched.',
  `- Source was seeded with ${sourceSnap ? Object.values(sourceSnap.data).reduce((n, v) => n + v.count, 0) : 0} documents, had PII encrypted with the scratch key, and had all model indexes synchronised.`,
  `- Backup: \`mongodump\`, restore: \`mongorestore --drop\`. Backup files stayed under \`${backupDir}\`.`,
  '- Key restore: a 32-byte scratch key was written to a separate local escrow file, removed from the deployment environment, then restored by `check-field-encryption-key.js` to decrypt a row in the restored database. Only the key fingerprint is recorded.',
  `- Snapshot comparison: **${comparison && comparison.ok ? 'PASS' : 'FAIL'}**.`,
  '',
  '## Tool version',
  '',
  '```text',
  results.versions?.output || '(not captured)',
  '```',
  '',
  '## Collection, count, index and sample comparison',
  '',
  '```text',
  (comparison?.lines || ['comparison not run']).join('\n'),
  '```',
  '',
  '## Command output',
  '',
];
for (const [name, result] of Object.entries(results)) {
  if (name === 'versions' || name === 'checks') continue;
  lines.push(`### ${name} (exit ${result?.code ?? 'not run'})`, '', '```text', result?.output || '(no output)', '```', '');
}
lines.push('## check-* scripts against the restored database', '');
for (const [name, result] of Object.entries(results.checks || {})) {
  lines.push(`### ${name} (exit ${result.code})`, '', '```text', result.output || '(no output)', '```', '');
}
await fs.mkdir(path.dirname(evidencePath), { recursive: true });
await fs.writeFile(evidencePath, lines.join('\n'));
console.log(`Snapshot comparison: ${comparison && comparison.ok ? 'PASS' : 'FAIL'}`);
for (const [name, result] of Object.entries(results.checks || {})) console.log(`${name}: exit ${result.code}`);
console.log(`keyRestore: exit ${results.keyRestore?.code ?? 'not run'}`);
console.log(`Evidence saved to ${evidencePath}`);
const failed = !comparison?.ok
  || ['seed', 'encryptPii', 'indexes', 'dump', 'restore', 'keyBackup', 'keyRestore'].some((key) => results[key]?.code !== 0)
  || Object.values(results.checks || {}).some((result) => result.code !== 0);
process.exitCode = failed ? 1 : 0;

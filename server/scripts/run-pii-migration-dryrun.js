import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const evidencePath = path.join(serverDir, '..', 'docs', 'evidence', 'pii-encryption-dryrun.md');

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: serverDir, env, shell: command === 'npm', stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const collect = (chunk) => { output += chunk.toString(); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output: output.trim() }));
  });
}

const mongod = await MongoMemoryServer.create({ instance: { dbName: 'migration_dryrun' } });
const keyV1 = Buffer.alloc(32, 11).toString('base64');
const keyV2 = Buffer.alloc(32, 12).toString('base64');
const baseEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PAYMENT_GATEWAY: 'fake',
  MONGODB_URI: mongod.getUri('migration_dryrun'),
  MIGRATION_DRYRUN_CONFIRMED: 'yes',
  FIELD_ENCRYPTION_KEY: keyV1,
  FIELD_ENCRYPTION_KEY_ID: 'v1',
  FIELD_ENCRYPTION_PREVIOUS_KEYS: '{}',
};
const applyEnv = { ...baseEnv, MIGRATION_BACKUP_CONFIRMED: 'yes' };
const rotatedEnv = {
  ...applyEnv,
  FIELD_ENCRYPTION_KEY: keyV2,
  FIELD_ENCRYPTION_KEY_ID: 'v2',
  FIELD_ENCRYPTION_PREVIOUS_KEYS: JSON.stringify({ v1: keyV1 }),
};
const migrationArgs = ['run', 'migrate:pii-encryption'];
const readBack = [
  process.execPath,
  ['--input-type=module', '-e', "import mongoose from 'mongoose'; import Application from './src/models/Application.js'; await mongoose.connect(process.env.MONGODB_URI); const a = await Application.findOne({}).select('+aadhaarNumber'); console.log('MODEL_READ aadhaar=' + a.aadhaarNumber + ' mobile=' + a.student.mobile); await mongoose.connection.close();"],
];
const results = {};
const expectedFailures = new Set(['applyWithoutBackupConfirmation']);
const steps = [
  ['seed', process.execPath, [path.join(here, 'seed-migration-dryrun-data.js')], baseEnv],
  ['dryRun', 'npm', migrationArgs, baseEnv],
  ['applyWithoutBackupConfirmation', 'npm', [...migrationArgs, '--', '--apply'], baseEnv],
  ['apply', 'npm', [...migrationArgs, '--', '--apply'], applyEnv],
  ['reapplyAfterCrash', 'npm', [...migrationArgs, '--', '--apply'], applyEnv],
  ['readBack', readBack[0], readBack[1], baseEnv],
  ['verifyAfterApply', 'npm', migrationArgs, baseEnv],
  ['rewrapDryRun', 'npm', [...migrationArgs, '--', '--rewrap'], rotatedEnv],
  ['rewrap', 'npm', [...migrationArgs, '--', '--apply', '--rewrap'], rotatedEnv],
  ['readBackAfterRewrap', readBack[0], readBack[1], rotatedEnv],
  ['verifyAfterRewrap', 'npm', migrationArgs, rotatedEnv],
  ['reverse', 'npm', [...migrationArgs, '--', '--apply', '--reverse'], rotatedEnv],
  ['verifyAfterReverse', 'npm', migrationArgs, rotatedEnv],
];
try {
  for (const [name, command, args, env] of steps) results[name] = await run(command, args, env);
} finally {
  await mongod.stop();
}

const lines = [
  '# PII encryption migration dry run',
  '',
  `- Generated: ${new Date().toISOString()}`,
  '- Target: local scratch MongoDB created by `mongodb-memory-server`; no real database was used.',
  '- Sequence: seed plaintext -> dry run -> apply refused without backup confirmation -> apply -> repeat apply (crash resume) -> read back -> dry run -> key rotation dry run -> rewrap -> read back -> dry run -> reverse -> dry run.',
  '',
];
for (const [name, result] of Object.entries(results)) {
  lines.push(`## ${name} (exit ${result.code})`, '', '```text', result.output || '(no output)', '```', '');
}
await fs.mkdir(path.dirname(evidencePath), { recursive: true });
await fs.writeFile(evidencePath, lines.join('\n'));
console.log(`Evidence saved to ${evidencePath}`);
const failed = Object.entries(results).some(([name, result]) => result.code !== 0 && !expectedFailures.has(name))
  || results.applyWithoutBackupConfirmation?.code === 0;
process.exitCode = failed ? 1 : 0;

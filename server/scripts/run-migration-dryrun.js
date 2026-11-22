import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const repoDir = path.resolve(serverDir, '..');
const evidencePath = path.join(repoDir, 'docs', 'evidence', 'data-integrity-dryrun.md');

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: serverDir,
      env,
      shell: command === 'npm',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
  });
}

process.env.NODE_ENV = 'test';
process.env.PAYMENT_GATEWAY = 'fake';
process.env.MIGRATION_DRYRUN_CONFIRMED = 'yes';
delete process.env.MIGRATION_BACKUP_CONFIRMED;

const mongod = await MongoMemoryServer.create({ instance: { dbName: 'migration_dryrun' } });
const childEnv = { ...process.env, MONGODB_URI: mongod.getUri('migration_dryrun') };

let seed;
let migration;
try {
  seed = await run(process.execPath, [path.join(here, 'seed-migration-dryrun-data.js')], childEnv);
  migration = await run('npm', ['run', 'migrate:data-integrity'], childEnv);
} finally {
  await mongod.stop();
}

const report = [
  '# Data-integrity migration dry run',
  '',
  `- Generated: ${new Date().toISOString()}`,
  '- Target: local scratch MongoDB created by `mongodb-memory-server`; no real database was used.',
  '- Mode: dry run only. `--apply` and `--drop` were not used.',
  `- Seed command: \`node scripts/seed-migration-dryrun-data.js\` (exit ${seed?.code ?? 'not run'})`,
  `- Migration command: \`npm run migrate:data-integrity\` (exit ${migration?.code ?? 'not run'})`,
  '',
  '## Seed output',
  '',
  '```text',
  (seed?.output || '').trim(),
  '```',
  '',
  '## Migration report',
  '',
  '```text',
  (migration?.output || '').trim(),
  '```',
  '',
];

await fs.mkdir(path.dirname(evidencePath), { recursive: true });
await fs.writeFile(evidencePath, report.join('\n'));
console.log(`\nEvidence saved to ${evidencePath}`);
process.exitCode = migration?.code ?? 1;

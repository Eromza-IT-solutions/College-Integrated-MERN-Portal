import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const evidencePath = path.join(serverDir, '..', 'docs', 'evidence', 'query-performance.md');
const rowCount = 3000;
const ownerId = new mongoose.Types.ObjectId();

const mongod = await MongoMemoryServer.create({ instance: { dbName: 'perf_check' } });
process.env.NODE_ENV = 'test';
process.env.PAYMENT_GATEWAY = 'fake';
process.env.MONGODB_URI = mongod.getUri('perf_check');
process.env.LOGIN_ID_HASH_SECRET ||= 'performance-check-login-hash-secret';
process.env.FIELD_ENCRYPTION_KEY ||= Buffer.alloc(32, 31).toString('base64');

let connection;
let evidence;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  connection = mongoose.connection;
  const db = connection.db;
  const start = Date.UTC(2025, 0, 1);
  const createdAt = (i) => new Date(start + i * 60 * 60 * 1000);

  await db.collection('applications').insertMany(Array.from({ length: rowCount }, (_, i) => ({
    applicantUserId: i % 20 === 0 ? ownerId : new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
    programId: new mongoose.Types.ObjectId(),
    status: i % 3 === 0 ? 'draft' : 'submitted',
    student: { fullName: `Applicant ${i}`, mobileHash: `hash-${i}` },
    createdAt: createdAt(i),
  })));
  await db.collection('payments').insertMany(Array.from({ length: rowCount }, (_, i) => ({
    purpose: i % 4 === 0 ? 'exam' : 'admission',
    status: i % 5 === 0 ? 'created' : 'paid',
    amountPaise: 10000 + i,
    createdAt: createdAt(i),
  })));
  await db.collection('auditlogs').insertMany(Array.from({ length: rowCount }, (_, i) => ({
    action: i % 2 === 0 ? 'paymentVerified' : 'applicationSubmitted',
    entityType: i % 2 === 0 ? 'payment' : 'application',
    outcome: 'success',
    details: {},
    createdAt: createdAt(i),
  })));

  await import('../src/models/index.js');
  const modelNames = mongoose.modelNames();
  for (const name of modelNames) await mongoose.model(name).syncIndexes();

  const checks = [
    {
      name: 'applications staff list',
      collection: 'applications',
      filter: { status: 'draft' },
      sort: { createdAt: -1 },
      index: 'application_status_created',
    },
    {
      name: 'applications owner list',
      collection: 'applications',
      filter: { applicantUserId: ownerId },
      sort: { createdAt: -1 },
      index: 'application_owner_created',
    },
    {
      name: 'payments filtered list',
      collection: 'payments',
      filter: { purpose: 'admission', status: 'paid' },
      sort: { createdAt: -1, _id: -1 },
      index: 'payment_purpose_status_created',
    },
    {
      name: 'audit logs list',
      collection: 'auditlogs',
      filter: { entityType: 'payment' },
      sort: { createdAt: -1, _id: -1 },
      index: 'audit_entity_created',
    },
  ];

  function stages(plan) {
    if (!plan || typeof plan !== 'object') return [];
    const found = [];
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.stage) found.push(node);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    visit(plan);
    return found;
  }

  const lines = [];
  let allOk = true;
  for (const check of checks) {
    const report = await db.collection(check.collection)
      .find(check.filter)
      .sort(check.sort)
      .skip(100)
      .limit(20)
      .explain('executionStats');
    const allStages = [
      ...stages(report.queryPlanner?.winningPlan),
      ...stages(report.executionStats?.executionStages),
    ];
    const usedIndex = allStages.find((stage) => stage.stage === 'IXSCAN')?.indexName || null;
    const collScan = allStages.some((stage) => stage.stage === 'COLLSCAN');
    const ok = usedIndex === check.index && !collScan;
    if (!ok) allOk = false;
    lines.push([
      `### ${check.name}: ${ok ? 'PASS' : 'FAIL'}`,
      '',
      `- Filter: \`${JSON.stringify(check.filter)}\``,
      `- Sort: \`${JSON.stringify(check.sort)}\``,
      `- Expected index: \`${check.index}\`; used index: \`${usedIndex || 'none'}\`; collection scan: \`${collScan}\``,
      `- Keys examined: ${report.executionStats?.totalKeysExamined ?? 'n/a'}; documents examined: ${report.executionStats?.totalDocsExamined ?? 'n/a'}`,
      '',
    ].join('\n'));
  }

  evidence = [
    '# Query performance check',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Target: local scratch MongoDB created by \`mongodb-memory-server\`; no real database was used.`,
    `- Seeded ${rowCount} rows into each of applications, payments and auditlogs, then ran \`syncIndexes()\`.`,
    '- Indexed collections checked: applications, payments, auditlogs.',
    '',
    '## explain("executionStats") results',
    '',
    lines.join('\n'),
    `Overall: **${allOk ? 'PASS' : 'FAIL'}**.`,
    '',
  ].join('\n');
  process.exitCode = allOk ? 0 : 1;
} finally {
  if (connection) await connection.close();
  await mongod.stop();
}

if (evidence) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(evidencePath, evidence);
}
console.log(`Query performance evidence saved to ${evidencePath}`);

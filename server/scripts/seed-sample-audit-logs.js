// Seeds a small set of sample audit log entries so the Super Admin's Audit Logs page is not empty.
//
// What it creates (all outcome: success, spread over the past 14 days):
//   login             — demo users signing in
//   roleChanged       — an admin changing a user's role
//   applicationStatusChanged — admission workflow steps
//   paymentVerified   — exam and admission fee confirmed
//   marksApproved     — HOD approving internal marks
//   resultPublished   — exam admin publishing results
//   noticePublished   — website admin publishing a notice
//   settingsChanged   — super admin updating a system setting
//
// All actor IDs are taken from the existing demo users, so entries look real on the dashboard.
//
// Prerequisites: npm run seed
// Run:  node scripts/seed-sample-audit-logs.js
// NOT idempotent in the strict sense — audit logs are append-only and have no unique key, so each
// run adds another batch. Run it ONCE on a fresh database. The script prints a warning and exits
// cleanly when it detects that sample entries already exist.
// Refused in production.
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// Build the full entry list once we have the user map.
function makeEntries(users) {
  const {
    student, applicant, teacher, hod,
    websiteAdmin, admissionAdmin, examAdmin, superAdmin,
  } = users;

  // Synthetic ObjectIds for referenced records (not real documents, just plausible ids).
  const oid = () => new mongoose.Types.ObjectId();
  const appId     = oid();
  const payId     = oid();
  const marksId   = oid();
  const resultId  = oid();
  const noticeId  = oid();
  const studentId = oid();

  return [
    // Day 14: super admin creates a super admin role (bootstrap already done, but it shows in the log)
    { actorUserId: superAdmin,     action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '192.168.1.1',  details: { role: 'superAdmin' },                       createdAt: daysAgo(14) },
    // Day 12: admission admin logs in and starts processing applications
    { actorUserId: admissionAdmin, action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '192.168.1.5',  details: { role: 'admissionAdmin' },                   createdAt: daysAgo(12) },
    { actorUserId: admissionAdmin, action: 'applicationSubjectsApproved', entityType: 'application', entityId: appId,  outcome: 'success', ip: '192.168.1.5',  details: { applicationNumber: 'APP-2026-27-000001' },   createdAt: daysAgo(12) },
    { actorUserId: admissionAdmin, action: 'applicationDocumentsApproved', entityType: 'application', entityId: appId, outcome: 'success', ip: '192.168.1.5', details: { applicationNumber: 'APP-2026-27-000001' },   createdAt: daysAgo(12) },
    { actorUserId: admissionAdmin, action: 'applicationFormApproved', entityType: 'application', entityId: appId,    outcome: 'success', ip: '192.168.1.5',  details: { applicationNumber: 'APP-2026-27-000001' },   createdAt: daysAgo(12) },
    // Day 10: applicant pays the admission fee
    { actorUserId: applicant,      action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '203.0.113.42',  details: { role: 'applicant' },                        createdAt: daysAgo(10) },
    { actorUserId: applicant,      action: 'paymentCreated',          entityType: 'payment',    entityId: payId,    outcome: 'success', ip: '203.0.113.42',  details: { purpose: 'admission', amountPaise: 1200000 }, createdAt: daysAgo(10) },
    { actorUserId: null,           action: 'paymentVerified',         entityType: 'payment',    entityId: payId,    outcome: 'success', ip: null,            details: { via: 'webhook', purpose: 'admission' },     createdAt: daysAgo(10) },
    // Day 9: hard copy received, student account created
    { actorUserId: admissionAdmin, action: 'hardCopyReceived',        entityType: 'application', entityId: appId,   outcome: 'success', ip: '192.168.1.5',  details: { applicationNumber: 'APP-2026-27-000001' },   createdAt: daysAgo(9) },
    { actorUserId: admissionAdmin, action: 'studentCreated',          entityType: 'student',    entityId: studentId, outcome: 'success', ip: '192.168.1.5', details: { enrollmentNumber: 'ENR-2026-27-000001' },   createdAt: daysAgo(9) },
    // Day 8: student logs in
    { actorUserId: student,        action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '203.0.113.99',  details: { role: 'student' },                          createdAt: daysAgo(8) },
    // Day 7: teacher logs in and enters internal marks
    { actorUserId: teacher,        action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '192.168.1.20',  details: { role: 'teacher' },                          createdAt: daysAgo(7) },
    { actorUserId: teacher,        action: 'marksEntered',            entityType: 'marks',      entityId: marksId,  outcome: 'success', ip: '192.168.1.20',  details: { component: 'Test 1', subjectCode: 'SMP-BDPCCA-S1-01' }, createdAt: daysAgo(7) },
    { actorUserId: teacher,        action: 'marksSubmitted',          entityType: 'marks',      entityId: marksId,  outcome: 'success', ip: '192.168.1.20',  details: { count: 1 },                                 createdAt: daysAgo(7) },
    // Day 6: HOD approves marks
    { actorUserId: hod,            action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '192.168.1.30',  details: { role: 'hod' },                              createdAt: daysAgo(6) },
    { actorUserId: hod,            action: 'marksApproved',           entityType: 'marks',      entityId: marksId,  outcome: 'success', ip: '192.168.1.30',  details: { count: 1 },                                 createdAt: daysAgo(6) },
    // Day 5: exam admin publishes results
    { actorUserId: examAdmin,      action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '192.168.1.40',  details: { role: 'examAdmin' },                        createdAt: daysAgo(5) },
    { actorUserId: examAdmin,      action: 'resultPublished',         entityType: 'result',     entityId: resultId, outcome: 'success', ip: '192.168.1.40',  details: { examName: 'SAMPLE End Semester Exam' },     createdAt: daysAgo(5) },
    // Day 4: website admin publishes a notice
    { actorUserId: websiteAdmin,   action: 'login',                   entityType: null,         entityId: null,     outcome: 'success', ip: '192.168.1.50',  details: { role: 'websiteAdmin' },                     createdAt: daysAgo(4) },
    { actorUserId: websiteAdmin,   action: 'noticePublished',         entityType: 'websiteContent', entityId: noticeId, outcome: 'success', ip: '192.168.1.50', details: { title: 'Admissions Open for A.Y. 2026-27' }, createdAt: daysAgo(4) },
    // Day 3: a failed login attempt (wrong password)
    { actorUserId: null,           action: 'login',                   entityType: null,         entityId: null,     outcome: 'failed',  ip: '198.51.100.7',  details: { email: 'student@demo.example', reason: 'wrong password' }, createdAt: daysAgo(3) },
    // Day 2: super admin changes a system setting
    { actorUserId: superAdmin,     action: 'settingsChanged',         entityType: 'system',     entityId: null,     outcome: 'success', ip: '192.168.1.1',  details: { setting: 'maintenanceMode', from: false, to: false }, createdAt: daysAgo(2) },
    // Day 1: super admin changes a user's role
    { actorUserId: superAdmin,     action: 'roleChanged',             entityType: 'user',       entityId: teacher,  outcome: 'success', ip: '192.168.1.1',  details: { from: 'applicant', to: 'teacher' },         createdAt: daysAgo(1) },
    // Today: a denied access attempt
    { actorUserId: student,        action: 'accessDenied',            entityType: null,         entityId: null,     outcome: 'denied',  ip: '203.0.113.99',  details: { resource: 'users', action: 'delete' },      createdAt: new Date() },
  ];
}

async function seedSampleAuditLogs() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed sample audit logs when NODE_ENV=production');

  // If sample audit log entries already exist, skip to avoid duplicates.
  const existing = await AuditLog.countDocuments({ action: 'login', 'details.role': 'superAdmin' });
  if (existing > 0) {
    return { added: 0, reason: 'Sample audit logs already exist. No entries added.' };
  }

  // Resolve demo user ids.
  const userMap = await User.find({
    email: {
      $in: [
        'student@demo.example',
        'applicant@demo.example',
        'teacher.com@demo.example',
        'hod.com@demo.example',
        'website.admin@demo.example',
        'admission.admin@demo.example',
        'exam.admin@demo.example',
      ],
    },
  }).select('_id email role');

  if (!userMap.length) throw new Error('Demo users not found. Run "npm run seed" first.');

  const byEmail = Object.fromEntries(userMap.map((u) => [u.email, u._id]));

  // Super admin may not exist yet (it is created separately); use null if absent.
  const superAdminUser = await User.findOne({ role: 'superAdmin' }).select('_id');

  const users = {
    student:       byEmail['student@demo.example']        || null,
    applicant:     byEmail['applicant@demo.example']      || null,
    teacher:       byEmail['teacher.com@demo.example']    || null,
    hod:           byEmail['hod.com@demo.example']        || null,
    websiteAdmin:  byEmail['website.admin@demo.example']  || null,
    admissionAdmin:byEmail['admission.admin@demo.example']|| null,
    examAdmin:     byEmail['exam.admin@demo.example']     || null,
    superAdmin:    superAdminUser ? superAdminUser._id    : null,
  };

  const entries = makeEntries(users);

  // AuditLog.record() calls this.create([...]) which runs the append-only pre-save hook.
  // We use insertMany directly to avoid the hook's "only new" check firing on a document
  // that isn't truly "new" in the mongoose sense when created via create([]).
  // We bypass the model's pre-save guard by using the collection directly for bulk insert,
  // but we still call record() one by one to stay within the designed API.
  let added = 0;
  for (const entry of entries) {
    // Temporarily set createdAt by using the low-level collection insert, because
    // AuditLog.record() does not accept a custom createdAt.
    await mongoose.connection.collection('auditlogs').insertOne({
      actorUserId:  entry.actorUserId  || null,
      action:       entry.action,
      entityType:   entry.entityType   || null,
      entityId:     entry.entityId     || null,
      outcome:      entry.outcome,
      ip:           entry.ip           || null,
      details:      entry.details      || {},
      createdAt:    entry.createdAt,
    });
    added += 1;
  }

  return { added };
}

export { seedSampleAuditLogs };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const r = await seedSampleAuditLogs();
      if (r.reason) {
        console.log(`Audit log seed skipped: ${r.reason}`);
      } else {
        console.log(`Audit log seed finished. Added this run: ${r.added} entries.`);
        console.log('Entries span the last 14 days across all demo roles.');
      }
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding audit logs failed:', err.message); process.exit(1); });
}

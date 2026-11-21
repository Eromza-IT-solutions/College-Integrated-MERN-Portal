import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import env from '../src/config/env.js';
import '../src/models/index.js';
import Enrollment from '../src/models/Enrollment.js';
import Payment from '../src/models/Payment.js';
import ExamForm from '../src/models/ExamForm.js';
import Refund from '../src/models/Refund.js';
import AuditLog from '../src/models/AuditLog.js';
import { ENROLLMENT_STATUS, PAYMENT_PURPOSE, REFUND_STATUS } from '../src/utils/constants.js';

const ACTIVE_INDEX_NAME = 'uniq_enrollment_active';
const ACTIVE_INDEX_KEYS = { studentId: 1, subjectId: 1, semester: 1, status: 1 };
const LEGACY_INDEX_KEYS = { studentId: 1, subjectId: 1, semester: 1 };

function sameKeys(actual, expected) {
  if (!actual) return false;
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => Number(actual[key]) === expected[key]);
}

function enrollmentDuplicateGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.status !== ENROLLMENT_STATUS.ENROLLED) continue;
    const key = [String(row.studentId), String(row.subjectId), row.semester].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.values()]
    .filter((items) => items.length > 1)
    .map((items) => {
      const sorted = [...items].sort((a, b) => {
        const byDate = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return byDate || String(b._id).localeCompare(String(a._id));
      });
      return {
        studentId: sorted[0].studentId,
        subjectId: sorted[0].subjectId,
        semester: sorted[0].semester,
        keepId: sorted[0]._id,
        duplicateIds: sorted.slice(1).map((row) => row._id),
      };
    });
}

function paymentBackfills(payments, forms) {
  const formsByPayment = new Map();
  for (const form of forms) {
    if (!form.paymentId) continue;
    const key = String(form.paymentId);
    if (!formsByPayment.has(key)) formsByPayment.set(key, []);
    formsByPayment.get(key).push(form);
  }

  const backfills = [];
  const mismatches = [];
  for (const payment of payments) {
    const candidates = formsByPayment.get(String(payment._id)) || [];
    if (candidates.length === 0) {
      mismatches.push({ paymentId: payment._id, reason: 'no ExamForm.paymentId points to this exam payment' });
      continue;
    }
    if (candidates.length > 1) {
      mismatches.push({ paymentId: payment._id, reason: `${candidates.length} ExamForm records point to this exam payment` });
      continue;
    }
    if (payment.examFormId && String(payment.examFormId) !== String(candidates[0]._id)) {
      mismatches.push({ paymentId: payment._id, reason: 'examFormId disagrees with ExamForm.paymentId' });
      continue;
    }
    backfills.push({ paymentId: payment._id, examFormId: candidates[0]._id });
  }
  return { backfills, mismatches };
}

function examFormLinkMismatches(forms, payments) {
  const paymentsById = new Map(payments.map((payment) => [String(payment._id), payment]));
  const mismatches = [];
  for (const form of forms) {
    if (!form.paymentId) continue;
    const payment = paymentsById.get(String(form.paymentId));
    if (payment && String(payment.examFormId) !== String(form._id)) {
      mismatches.push({ examFormId: form._id, paymentId: form.paymentId, reason: 'ExamForm.paymentId disagrees with Payment.examFormId' });
    }
  }
  return mismatches;
}

function refundBackfills(refunds, logs) {
  const gatewayIds = new Map();
  for (const log of logs) {
    const gatewayRefundId = log.details && log.details.gatewayRefundId;
    if (!log.entityId || typeof gatewayRefundId !== 'string' || !gatewayRefundId) continue;
    const key = String(log.entityId);
    const current = gatewayIds.get(key);
    if (!current || new Date(log.createdAt || 0) > new Date(current.createdAt || 0)) {
      gatewayIds.set(key, { gatewayRefundId, createdAt: log.createdAt });
    }
  }

  const backfills = [];
  const unresolved = [];
  for (const refund of refunds) {
    const found = gatewayIds.get(String(refund._id));
    if (found) {
      backfills.push({ refundId: refund._id, gatewayRefundId: found.gatewayRefundId, processedAt: found.createdAt });
    } else {
      unresolved.push({ refundId: refund._id, reason: 'no audit log contains a gateway refund id for this approved refund' });
    }
  }
  return { backfills, unresolved };
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.MIGRATION_BACKUP_CONFIRMED !== 'yes') {
    throw new Error('Set MIGRATION_BACKUP_CONFIRMED=yes after taking a backup before running with --apply');
  }

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('Dry run is the default. Re-run with --apply to make changes.');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });

  try {
    const enrollmentRows = await Enrollment.find({ status: ENROLLMENT_STATUS.ENROLLED })
      .select('_id studentId subjectId semester status createdAt')
      .lean();
    const duplicateGroups = enrollmentDuplicateGroups(enrollmentRows);
    console.log(`\nEnrollment: ${duplicateGroups.length} duplicate active group(s)`);
    for (const group of duplicateGroups) {
      console.log(`  keep ${String(group.keepId)}; drop ${group.duplicateIds.map(String).join(', ')} for student=${String(group.studentId)} subject=${String(group.subjectId)} semester=${group.semester}`);
      if (apply) {
        await Enrollment.updateMany(
          { _id: { $in: group.duplicateIds } },
          { $set: { status: ENROLLMENT_STATUS.DROPPED } }
        );
      }
    }

    const indexes = await Enrollment.collection.indexes();
    const legacyIndex = indexes.find((index) => index.unique && sameKeys(index.key, LEGACY_INDEX_KEYS));
    const activeIndex = indexes.find((index) => index.name === ACTIVE_INDEX_NAME)
      || indexes.find((index) => index.unique && sameKeys(index.key, ACTIVE_INDEX_KEYS) && index.partialFilterExpression?.status === ENROLLMENT_STATUS.ENROLLED);

    console.log(`\nEnrollment indexes: legacy=${legacyIndex ? legacyIndex.name || 'full-tuple unique' : 'absent'}; active=${activeIndex ? ACTIVE_INDEX_NAME : 'absent'}`);
    if (!activeIndex) {
      console.log('  create unique partial index uniq_enrollment_active on (studentId, subjectId, semester, status) where status=enrolled');
      if (apply) {
        await Enrollment.collection.createIndex(ACTIVE_INDEX_KEYS, {
          name: ACTIVE_INDEX_NAME,
          unique: true,
          partialFilterExpression: { status: ENROLLMENT_STATUS.ENROLLED },
        });
      }
    }
    if (legacyIndex) {
      console.log(`  drop legacy full-tuple unique index ${legacyIndex.name || 'studentId_1_subjectId_1_semester_1'}`);
      if (apply) await Enrollment.collection.dropIndex(legacyIndex.name);
    }

    const examPayments = await Payment.find({
      purpose: PAYMENT_PURPOSE.EXAM,
      $or: [{ examFormId: { $exists: false } }, { examFormId: null }],
    }).select('_id examFormId').lean();
    const formsWithPayment = await ExamForm.find({ paymentId: { $exists: true, $ne: null } })
      .select('_id paymentId').lean();
    const paymentResult = paymentBackfills(examPayments, formsWithPayment);
    const linkedPayments = await Payment.find({
      purpose: PAYMENT_PURPOSE.EXAM,
      examFormId: { $exists: true, $ne: null },
    }).select('_id examFormId').lean();
    const linkMismatches = examFormLinkMismatches(formsWithPayment, linkedPayments);

    console.log(`\nPayment/ExamForm: ${paymentResult.backfills.length} backfill(s), ${paymentResult.mismatches.length + linkMismatches.length} mismatch(es)`);
    for (const item of paymentResult.backfills) {
      console.log(`  set Payment ${String(item.paymentId)}.examFormId=${String(item.examFormId)}`);
      if (apply) {
        await Payment.updateOne(
          { _id: item.paymentId, $or: [{ examFormId: { $exists: false } }, { examFormId: null }] },
          { $set: { examFormId: item.examFormId } }
        );
      }
    }
    for (const item of [...paymentResult.mismatches, ...linkMismatches]) {
      console.log(`  MISMATCH ${JSON.stringify(item)}`);
    }

    const pendingRefunds = await Refund.find({
      status: REFUND_STATUS.APPROVED,
      $or: [{ gatewayRefundId: { $exists: false } }, { gatewayRefundId: null }],
    }).select('_id').lean();
    const refundLogs = await AuditLog.find({
      action: { $in: ['refundDecided', 'refundRetried'] },
      entityType: 'refund',
      'details.gatewayRefundId': { $type: 'string' },
    }).select('entityId details.gatewayRefundId createdAt').lean();
    const refundResult = refundBackfills(pendingRefunds, refundLogs);

    console.log(`\nRefund gateway ids: ${refundResult.backfills.length} backfill(s), ${refundResult.unresolved.length} unresolved`);
    for (const item of refundResult.backfills) {
      console.log(`  set Refund ${String(item.refundId)}.gatewayRefundId from audit log`);
      if (apply) {
        await Refund.updateOne(
          { _id: item.refundId, $or: [{ gatewayRefundId: { $exists: false } }, { gatewayRefundId: null }] },
          { $set: { gatewayRefundId: item.gatewayRefundId, processedAt: item.processedAt } }
        );
      }
    }
    for (const item of refundResult.unresolved) {
      console.log(`  UNRESOLVED ${JSON.stringify(item)}`);
    }

    const unresolvedCount = paymentResult.mismatches.length + linkMismatches.length + refundResult.unresolved.length;
    console.log(`\nSummary: mode=${apply ? 'APPLY' : 'DRY RUN'} unresolved=${unresolvedCount}`);
    if (apply && unresolvedCount > 0) process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}

export { sameKeys, enrollmentDuplicateGroups, paymentBackfills, examFormLinkMismatches, refundBackfills };

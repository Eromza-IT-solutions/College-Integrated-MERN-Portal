import Enrollment from '../src/models/Enrollment.js';
import {
  sameKeys,
  enrollmentDuplicateGroups,
  paymentBackfills,
  examFormLinkMismatches,
  refundBackfills,
} from '../scripts/migrate-data-integrity.js';

describe('active enrollment index', () => {
  test('uses a unique partial index on enrolled rows only', () => {
    const indexes = Enrollment.schema.indexes();
    const active = indexes.find(([, options]) => options.name === 'uniq_enrollment_active');
    expect(active).toBeDefined();
    expect(active[0]).toEqual({ studentId: 1, subjectId: 1, semester: 1, status: 1 });
    expect(active[1].unique).toBe(true);
    expect(active[1].partialFilterExpression).toEqual({ status: 'enrolled' });

    const legacy = indexes.find(([keys, options]) => options.unique
      && sameKeys(keys, { studentId: 1, subjectId: 1, semester: 1 })
      && !options.partialFilterExpression);
    expect(legacy).toBeUndefined();
  });
});

describe('migration helpers', () => {
  test('sameKeys compares an index key pattern exactly', () => {
    expect(sameKeys({ studentId: 1, subjectId: 1, semester: 1 }, { studentId: 1, subjectId: 1, semester: 1 })).toBe(true);
    expect(sameKeys({ studentId: 1, subjectId: 1 }, { studentId: 1, subjectId: 1, semester: 1 })).toBe(false);
    expect(sameKeys(null, { studentId: 1 })).toBe(false);
  });

  test('enrollmentDuplicateGroups ignores dropped rows and keeps the newest active row', () => {
    const studentId = '65a000000000000000000001';
    const subjectId = '65a000000000000000000002';
    const rows = [
      { _id: '65b000000000000000000001', studentId, subjectId, semester: 3, status: 'enrolled', createdAt: new Date('2026-01-01') },
      { _id: '65b000000000000000000002', studentId, subjectId, semester: 3, status: 'enrolled', createdAt: new Date('2026-02-01') },
      { _id: '65b000000000000000000003', studentId, subjectId, semester: 3, status: 'dropped', createdAt: new Date('2026-03-01') },
    ];

    const groups = enrollmentDuplicateGroups(rows);
    expect(groups).toHaveLength(1);
    expect(String(groups[0].keepId)).toBe('65b000000000000000000002');
    expect(groups[0].duplicateIds.map(String)).toEqual(['65b000000000000000000001']);
  });

  test('paymentBackfills repairs unique links and reports ambiguous links', () => {
    const payments = [
      { _id: '65c000000000000000000001' },
      { _id: '65c000000000000000000002' },
      { _id: '65c000000000000000000003' },
    ];
    const forms = [
      { _id: '65d000000000000000000001', paymentId: payments[0]._id },
      { _id: '65d000000000000000000002', paymentId: payments[1]._id },
      { _id: '65d000000000000000000003', paymentId: payments[1]._id },
    ];

    const result = paymentBackfills(payments, forms);
    expect(result.backfills).toHaveLength(1);
    expect(String(result.backfills[0].paymentId)).toBe(String(payments[0]._id));
    expect(result.mismatches).toHaveLength(2);
    expect(result.mismatches[0].reason).toMatch(/2 ExamForm/);
    expect(result.mismatches[1].reason).toMatch(/no ExamForm/);
  });

  test('examFormLinkMismatches reports forms linked to a different payment exam form', () => {
    const forms = [{ _id: '65d000000000000000000001', paymentId: '65c000000000000000000001' }];
    const payments = [{ _id: '65c000000000000000000001', examFormId: '65d000000000000000000009' }];

    const mismatches = examFormLinkMismatches(forms, payments);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].reason).toMatch(/disagrees/);
  });

  test('examFormLinkMismatches reports a payment whose exam form does not point back', () => {
    const paymentId = '65c000000000000000000002';
    const examFormId = '65d000000000000000000002';
    const allForms = [{ _id: examFormId }];
    const payments = [{ _id: paymentId, examFormId }];

    const mismatches = examFormLinkMismatches([], payments, allForms);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].reason).toMatch(/does not point back/);
  });

  test('refundBackfills uses the newest audit log and reports missing ids', () => {
    const refunds = [
      { _id: '65e000000000000000000001' },
      { _id: '65e000000000000000000002' },
    ];
    const logs = [
      { entityId: refunds[0]._id, details: { gatewayRefundId: 'rfnd_old' }, createdAt: new Date('2026-01-01') },
      { entityId: refunds[0]._id, details: { gatewayRefundId: 'rfnd_new' }, createdAt: new Date('2026-02-01') },
    ];

    const result = refundBackfills(refunds, logs);
    expect(result.backfills).toHaveLength(1);
    expect(result.backfills[0].gatewayRefundId).toBe('rfnd_new');
    expect(result.unresolved).toHaveLength(1);
    expect(String(result.unresolved[0].refundId)).toBe(String(refunds[1]._id));
  });
});

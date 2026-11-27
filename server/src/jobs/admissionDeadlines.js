import Application from '../models/Application.js';
import AuditLog from '../models/AuditLog.js';
import { APPLICATION_STATUS, AUDIT_OUTCOME } from '../utils/constants.js';

/**
 * Daily admission deadline job.
 * - Cancels approved applications whose fee window has passed.
 * - Reports fee-paid applications whose hard-copy window has passed; the office decides those.
 */
async function runAdmissionDeadlineJob({ now = new Date() } = {}) {
  const overdue = await Application.overdue({ now });
  const unpaid = await Application.find({
    status: APPLICATION_STATUS.APPROVED,
    feeDueAt: { $lt: now },
  })
    .select('_id applicationNumber')
    .lean();

  const cancelled = await Application.cancelUnpaid({ now });

  await AuditLog.record({
    action: 'admissionDeadlinesProcessed',
    entityType: 'application',
    outcome: AUDIT_OUTCOME.SUCCESS,
    details: {
      cancelled,
      overdueHardCopies: overdue.hardCopy.length,
      feeApplications: unpaid.map((application) => application.applicationNumber).filter(Boolean),
    },
  });

  return { cancelled, overdueHardCopies: overdue.hardCopy.length };
}

export { runAdmissionDeadlineJob };
export default runAdmissionDeadlineJob;

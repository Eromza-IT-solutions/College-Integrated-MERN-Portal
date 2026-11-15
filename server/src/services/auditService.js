import AuditLog from '../models/AuditLog.js';
import { AUDIT_OUTCOME } from '../utils/constants.js';

// Small helpers so every module writes audit rows the same way.
// They sit on top of AuditLog.record(), which already removes passwords and tokens from `details`.
//
//   await audit(req, {
//     action: 'refundRequested', entityType: 'refund', entityId: refund._id, details: { amountPaise },
//   });
//
// Rules for the fields (so the Audit Logs screen stays tidy):
//   action     camelCase verb phrase, e.g. paymentVerified, marksUpdated, resultPublished
//   entityType the kind of record, e.g. payment, refund, marks (the screen shows it as "Module")
//   entityId   our own record id (an ObjectId). Gateway ids such as order_xxx go in `details`.

// Who did it and from where, taken from the request.
// A webhook or a scheduled job has no request user: pass req = null and the actor stays empty.
function fromRequest(req) {
  const user = req && req.user;
  return { actorUserId: user && user.id ? user.id : null, ip: (req && req.ip) || null };
}

/**
 * Write one audit row. Throws if the write fails.
 * Use this inside a transaction ({ session }) for money and marks, so the change and its log
 * are saved together or not at all.
 */
function audit(req, { action, entityType, entityId, outcome = AUDIT_OUTCOME.SUCCESS, details }, options) {
  return AuditLog.record({ ...fromRequest(req), action, entityType, entityId, outcome, details }, options);
}

/** Same, but never throws: a failed log is printed on the server and the request carries on. */
async function auditSafe(req, entry, options) {
  try {
    return await audit(req, entry, options);
  } catch (err) {
    console.error('[audit] could not write log:', err.message);
    return null;
  }
}

export { audit, auditSafe };

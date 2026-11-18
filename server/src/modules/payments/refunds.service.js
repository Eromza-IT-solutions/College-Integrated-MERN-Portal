import AppError from '../../utils/AppError.js';
import { auditSafe } from '../../services/auditService.js';
import { getGateway } from '../../services/payment/index.js';
import { getActor } from '../../middleware/requirePermission.js';
import AuditLog from '../../models/AuditLog.js';
import Payment from '../../models/Payment.js';
import Refund from '../../models/Refund.js';
import { AUDIT_OUTCOME, REFUND_STATUS } from '../../utils/constants.js';

// The rules (paid only, never more than paid, requester cannot approve, decide once) already live in the Refund and
// Payment models. This file only adds: who is calling, the gateway money-back, and the audit rows.

function refundToClient(r) {
  return {
    _id: r._id, paymentId: r.paymentId, purpose: r.purpose, amountPaise: r.amountPaise, reason: r.reason,
    status: r.status, requestedByUserId: r.requestedByUserId, decidedByUserId: r.decidedByUserId,
    decidedAt: r.decidedAt, decisionNote: r.decisionNote, createdAt: r.createdAt,
    gatewayRefundId: r.gatewayRefundId, processedAt: r.processedAt, // empty until the money has really gone back
  };
}

// While a refund is being sent it is locked for this long. Two clicks (or a click and a retry) cannot send it twice.
const LOCK_MS = 2 * 60 * 1000;
const notSentYet = { gatewayRefundId: { $exists: false } };
const notLocked = () => ({
  $or: [{ processingAt: { $exists: false } }, { processingAt: null }, { processingAt: { $lt: new Date(Date.now() - LOCK_MS) } }],
});

/**
 * Sends an APPROVED refund back through the gateway, at most once. Used right after approval and again by retry.
 *  1. take the lock (fails if the money was already sent, or another request is sending it right now)
 *  2. ask the gateway
 *  3. save the gateway's refund id ON THE REFUND and release the lock, so "already sent" is never a guess
 * If the gateway says no, the lock is released and the refund stays approved: it can be retried.
 * If the money went out but saving the id failed, the id goes to the audit log and the lock is kept, so a
 * retry reads it from there and refuses to send the money a second time.
 */
async function sendToGateway(req, refund, { action, details, failurePrefix }) {
  const claimed = await Refund.findOneAndUpdate(
    { _id: refund._id, status: REFUND_STATUS.APPROVED, ...notSentYet, ...notLocked() },
    { $set: { processingAt: new Date() } },
    { new: true }
  );
  if (!claimed) throw new AppError('This refund was already sent, or is being sent right now. Please check again in a minute.', 409);

  let sentId = null;
  try {
    const payment = await Payment.findById(claimed.paymentId);
    if (!payment || !payment.gatewayPaymentId) throw new AppError('The payment has no gateway payment id to refund', 409);
    const gateway = getGateway();
    if (payment.gateway !== gateway.name) throw new AppError('The payment was made on a different gateway than the one now configured', 409);
    const result = await gateway.refund({
      gatewayPaymentId: payment.gatewayPaymentId, amountPaise: claimed.amountPaise,
      notes: { refundId: String(claimed._id), paymentId: String(payment._id) },
    });
    sentId = result.gatewayRefundId;
    await Refund.findOneAndUpdate(
      { _id: claimed._id },
      { $set: { gatewayRefundId: sentId, processedAt: new Date() }, $unset: { processingAt: 1 } },
      { new: true }
    );
    await auditSafe(req, { action, entityType: 'refund', entityId: claimed._id, details: { ...details, gatewayRefundId: sentId } });
    return sentId;
  } catch (err) {
    if (sentId) {
      // The money has left. Keep the lock and write the id down: this is what stops a second payout.
      await auditSafe(req, {
        action, entityType: 'refund', entityId: claimed._id, outcome: AUDIT_OUTCOME.FAILED,
        details: { ...details, gatewayRefundId: sentId, reason: `The money was sent (${sentId}) but saving it failed: ${err.message}` },
      });
      throw err;
    }
    await Refund.findOneAndUpdate({ _id: claimed._id }, { $unset: { processingAt: 1 } }).catch(() => {}); // let a retry in
    await auditSafe(req, {
      action, entityType: 'refund', entityId: claimed._id, outcome: AUDIT_OUTCOME.FAILED,
      details: { ...details, reason: `${failurePrefix}: ${err.message}` },
    });
    throw err;
  }
}

/** Admission Admin / Examination Admin asks for a refund. The amount is reserved on the payment straight away. */
async function requestRefund(req, { paymentId, amountPaise, reason }) {
  const actor = getActor(req);
  try {
    const refund = await Refund.request({ paymentId, amountPaise, reason, requestedByUserId: actor.id });
    await auditSafe(req, {
      action: 'refundRequested', entityType: 'refund', entityId: refund._id,
      details: { paymentId: String(paymentId), amountPaise, purpose: refund.purpose },
    });
    return refund;
  } catch (err) {
    await auditSafe(req, {
      action: 'refundRequested', entityType: 'refund', outcome: AUDIT_OUTCOME.FAILED,
      details: { paymentId: String(paymentId), amountPaise, reason: err.message },
    });
    throw err;
  }
}

/**
 * Super Admin approves or rejects. On approval the money goes back through the gateway.
 * Order matters: the decision is saved first (only one person can win it), then the gateway is called.
 * If the gateway fails, the refund stays "approved" and the failure is written to the audit log.
 */
async function decideRefund(req, refundId, { approve, note }) {
  const actor = getActor(req);
  let decided;
  try {
    decided = await Refund.decide(refundId, { approve, decidedByUserId: actor.id, note });
  } catch (err) {
    await auditSafe(req, {
      action: 'refundDecided', entityType: 'refund', entityId: refundId, outcome: AUDIT_OUTCOME.FAILED,
      details: { approved: approve, reason: err.message },
    });
    throw err;
  }

  const details = { approved: approve, amountPaise: decided.amountPaise, note: note || null, paymentId: String(decided.paymentId) };
  if (!approve) {
    await auditSafe(req, { action: 'refundDecided', entityType: 'refund', entityId: decided._id, details });
    return { refund: decided, gatewayRefundId: null };
  }

  const gatewayRefundId = await sendToGateway(req, decided, {
    action: 'refundDecided', details, failurePrefix: 'Approved, but the gateway refund failed',
  });
  return { refund: decided, gatewayRefundId };
}

/**
 * Super Admin sends an approved refund again, after the gateway had failed the first time.
 * It refuses when the money has already gone back (the refund itself, or the audit log for refunds approved
 * before gateway ids were saved on the refund), so a retry can never pay the same refund twice.
 */
async function retryRefund(req, refundId) {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new AppError('Refund not found', 404);
  const details = { approved: true, amountPaise: refund.amountPaise, paymentId: String(refund.paymentId) };
  const refuse = async (message) => {
    await auditSafe(req, {
      action: 'refundRetried', entityType: 'refund', entityId: refund._id, outcome: AUDIT_OUTCOME.FAILED,
      details: { ...details, reason: message },
    });
    throw new AppError(message, 409);
  };

  if (refund.status !== REFUND_STATUS.APPROVED) return refuse(`Only an approved refund can be retried (this one is ${refund.status})`);
  if (refund.gatewayRefundId) return refuse('This refund was already sent back through the gateway');

  const alreadySent = await AuditLog.findOne({
    entityType: 'refund', entityId: refund._id,
    action: { $in: ['refundDecided', 'refundRetried'] }, 'details.gatewayRefundId': { $type: 'string' },
  }).lean();
  if (alreadySent) {
    await Refund.findOneAndUpdate(
      { _id: refund._id, ...notSentYet },
      { $set: { gatewayRefundId: alreadySent.details.gatewayRefundId, processedAt: alreadySent.createdAt } }
    ); // write it on the refund too, so it is on record from now on
    return refuse('This refund was already sent back through the gateway');
  }

  const gatewayRefundId = await sendToGateway(req, refund, { action: 'refundRetried', details, failurePrefix: 'Retry failed' });
  return { refund: (await Refund.findById(refundId)) || refund, gatewayRefundId };
}

async function listRefunds({ purpose, status, page, limit }) {
  const filter = { purpose, ...(status ? { status } : {}) };
  const [rows, total] = await Promise.all([
    Refund.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Refund.countDocuments(filter),
  ]);
  return { rows: rows.map(refundToClient), total, page, limit };
}

export { requestRefund, decideRefund, retryRefund, listRefunds, refundToClient };

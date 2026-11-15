import AppError from '../../utils/AppError.js';
import { auditSafe } from '../../services/auditService.js';
import { getGateway } from '../../services/payment/index.js';
import { getActor } from '../../middleware/requirePermission.js';
import Payment from '../../models/Payment.js';
import Refund from '../../models/Refund.js';
import { AUDIT_OUTCOME } from '../../utils/constants.js';

// The rules (paid only, never more than paid, requester cannot approve, decide once) already live in the Refund and
// Payment models. This file only adds: who is calling, the gateway money-back, and the audit rows.

function refundToClient(r) {
  return {
    _id: r._id, paymentId: r.paymentId, purpose: r.purpose, amountPaise: r.amountPaise, reason: r.reason,
    status: r.status, requestedByUserId: r.requestedByUserId, decidedByUserId: r.decidedByUserId,
    decidedAt: r.decidedAt, decisionNote: r.decisionNote, createdAt: r.createdAt,
  };
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

  const payment = await Payment.findById(decided.paymentId);
  try {
    if (!payment || !payment.gatewayPaymentId) throw new AppError('The payment has no gateway payment id to refund', 409);
    const gateway = getGateway();
    if (payment.gateway !== gateway.name) throw new AppError('The payment was made on a different gateway than the one now configured', 409);
    const result = await gateway.refund({
      gatewayPaymentId: payment.gatewayPaymentId, amountPaise: decided.amountPaise,
      notes: { refundId: String(decided._id), paymentId: String(payment._id) },
    });
    await auditSafe(req, {
      action: 'refundDecided', entityType: 'refund', entityId: decided._id,
      details: { ...details, gatewayRefundId: result.gatewayRefundId },
    });
    return { refund: decided, gatewayRefundId: result.gatewayRefundId };
  } catch (err) {
    await auditSafe(req, {
      action: 'refundDecided', entityType: 'refund', entityId: decided._id, outcome: AUDIT_OUTCOME.FAILED,
      details: { ...details, reason: `Approved, but the gateway refund failed: ${err.message}` },
    });
    throw err;
  }
}

async function listRefunds({ purpose, status, page, limit }) {
  const filter = { purpose, ...(status ? { status } : {}) };
  const [rows, total] = await Promise.all([
    Refund.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Refund.countDocuments(filter),
  ]);
  return { rows: rows.map(refundToClient), total, page, limit };
}

export { requestRefund, decideRefund, listRefunds, refundToClient };

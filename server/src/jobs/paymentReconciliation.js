import env from '../config/env.js';
import Payment from '../models/Payment.js';
import { getGateway } from '../services/payment/index.js';
import { settlePaid } from '../modules/payments/payments.service.js';
import { auditSafe } from '../services/auditService.js';
import { PAYMENT_STATUS, AUDIT_OUTCOME } from '../utils/constants.js';

/**
 * Repairs payments that the browser and the webhook both missed.
 * Looks only at old "created" payments, asks the gateway for that order's payments, and settles any captured one.
 * Safe to run again: settlePaid ignores a payment that is already paid.
 */
async function runPaymentReconciliationJob({
  now = new Date(),
  gateway = getGateway(),
  minAgeMs = env.jobs.paymentReconciliationMinAgeMs,
  limit = env.jobs.batchSize,
} = {}) {
  const cutoff = new Date(now.getTime() - minAgeMs);
  const rows = await Payment.find({
    status: PAYMENT_STATUS.CREATED,
    gateway: gateway.name,
    gatewayOrderId: { $type: 'string' },
    $or: [
      { orderCreatedAt: { $lte: cutoff } },
      { orderCreatedAt: { $exists: false }, createdAt: { $lte: cutoff } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let checked = 0;
  let reconciled = 0;
  let errors = 0;

  for (const payment of rows) {
    checked += 1;
    try {
      const attempts = await gateway.listOrderPayments(payment.gatewayOrderId);
      const captured = attempts.find((attempt) => attempt && attempt.status === 'captured');
      if (!captured) continue;

      if (captured.amount !== payment.amountPaise) {
        await auditSafe(null, {
          action: 'paymentReconciliationMismatch',
          entityType: 'payment',
          entityId: payment._id,
          outcome: AUDIT_OUTCOME.FAILED,
          details: {
            reason: 'captured amount does not match the order',
            expectedPaise: payment.amountPaise,
            gotPaise: captured.amount,
            gatewayPaymentId: captured.id,
          },
        });
        continue;
      }

      await settlePaid(null, payment, captured.id, { source: 'reconciliation', method: captured.method });
      reconciled += 1;
    } catch (err) {
      errors += 1;
      await auditSafe(null, {
        action: 'paymentReconciliationFailed',
        entityType: 'payment',
        entityId: payment._id,
        outcome: AUDIT_OUTCOME.FAILED,
        details: { reason: err.message, gatewayOrderId: payment.gatewayOrderId },
      });
    }
  }

  await auditSafe(null, {
    action: 'paymentReconciliationProcessed',
    entityType: 'payment',
    details: { checked, reconciled, errors },
  });

  return { checked, reconciled, errors };
}

export { runPaymentReconciliationJob };
export default runPaymentReconciliationJob;

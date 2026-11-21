import AppError from '../../utils/AppError.js';
import { auditSafe } from '../../services/auditService.js';
import { getGateway } from '../../services/payment/index.js';
import Payment from '../../models/Payment.js';
import { PAYMENT_STATUS, AUDIT_OUTCOME } from '../../utils/constants.js';
import { settlePaid } from './payments.service.js';

// The gateway calls us (no browser, no sign-in) when a payment changes. Anyone on the internet can send a request
// to this address, so the ONLY thing we trust is the signature over the exact bytes that arrived.
const PAID_EVENTS = ['payment.captured', 'order.paid'];
const FAILED_EVENTS = ['payment.failed'];

/**
 * @param req        the Express request (used for the IP in the audit row; there is no user)
 * @param rawBody    Buffer: the body exactly as received (captured in app.js)
 * @param signature  the x-razorpay-signature header
 * @param eventId    the x-razorpay-event-id header (the gateway's own id for this delivery, may be missing)
 * Returns what to answer. Answer 2xx for anything we have understood, even if we did nothing with it,
 * so the gateway stops retrying. Answer an error only for a bad signature or a broken body.
 */
async function handleWebhook(req, { rawBody, signature, eventId }) {
  const gateway = getGateway();

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || !gateway.verifyWebhookSignature(rawBody, signature)) {
    await auditSafe(req, {
      action: 'paymentWebhookRejected', entityType: 'payment', outcome: AUDIT_OUTCOME.DENIED,
      details: { reason: 'signature missing or wrong', gatewayEventId: eventId || null },
    });
    throw new AppError('Webhook signature is not valid', 400, undefined, 'WEBHOOK_SIGNATURE_INVALID');
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new AppError('Webhook body is not valid JSON', 400, undefined, 'WEBHOOK_BODY_INVALID');
  }
  const name = event && event.event;
  const entity = event && event.payload && event.payload.payment && event.payload.payment.entity;
  const received = { event: name, gatewayEventId: eventId || null };

  if (!entity || !entity.order_id || !entity.id) {
    await auditSafe(req, { action: 'paymentWebhookReceived', entityType: 'payment', details: { ...received, handled: false, reason: 'event has no payment' } });
    return { handled: false };
  }

  const payment = (await Payment.findOne({ gateway: gateway.name, gatewayOrderId: entity.order_id }));
  if (!payment) {
    // Not one of our orders (for example another app using the same gateway account).
    await auditSafe(req, {
      action: 'paymentWebhookReceived', entityType: 'payment', outcome: AUDIT_OUTCOME.FAILED,
      details: { ...received, handled: false, reason: 'unknown order', gatewayOrderId: entity.order_id },
    });
    return { handled: false };
  }

  // Razorpay retries a delivery until it gets a 2xx. Remember the gateway's event id so a repeat is a no-op.
  if (eventId && (payment.gatewayEventIds || []).includes(eventId)) {
    await auditSafe(req, {
      action: 'paymentWebhookReceived', entityType: 'payment', entityId: payment._id,
      details: { ...received, handled: false, duplicate: true, reason: 'event already handled' },
    });
    return { handled: false, duplicate: true };
  }
  const rememberEvent = async () => {
    if (eventId) await Payment.updateOne({ _id: payment._id }, { $addToSet: { gatewayEventIds: eventId } });
  };

  if (PAID_EVENTS.includes(name)) {
    if (entity.amount !== payment.amountPaise) {
      await auditSafe(req, {
        action: 'paymentWebhookRejected', entityType: 'payment', entityId: payment._id, outcome: AUDIT_OUTCOME.DENIED,
        details: { ...received, reason: 'amount does not match', expectedPaise: payment.amountPaise, gotPaise: entity.amount },
      });
      throw new AppError('Webhook amount does not match the order', 400, undefined, 'WEBHOOK_AMOUNT_MISMATCH');
    }
    if (payment.status === PAYMENT_STATUS.FAILED) {
      // Money arrived for a payment we had closed. Needs a person to look (refund or reopen).
      await auditSafe(req, {
        action: 'paymentWebhookReceived', entityType: 'payment', entityId: payment._id, outcome: AUDIT_OUTCOME.FAILED,
        details: { ...received, handled: false, reason: 'paid at the gateway but the payment was already closed: check and refund', gatewayPaymentId: entity.id },
      });
      return { handled: false };
    }
    const { alreadyPaid } = await settlePaid(req, payment, entity.id, { source: 'webhook', method: entity.method });
    await rememberEvent();
    await auditSafe(req, {
      action: 'paymentWebhookReceived', entityType: 'payment', entityId: payment._id,
      details: { ...received, handled: !alreadyPaid, duplicate: alreadyPaid },
    });
    return { handled: !alreadyPaid, duplicate: alreadyPaid };
  }

  if (FAILED_EVENTS.includes(name)) {
    // One order can be tried again with another card, so a failed attempt does NOT close the order. We only record it.
    await Payment.recordFailedAttempt(payment._id, {
      reason: entity.error_description || 'Payment attempt failed',
      errorCode: entity.error_code,
      method: entity.method,
    });
    await rememberEvent();
    await auditSafe(req, {
      action: 'paymentWebhookReceived', entityType: 'payment', entityId: payment._id,
      details: { ...received, handled: false, attemptFailed: true, reason: entity.error_description || 'payment attempt failed' },
    });
    return { handled: false };
  }

  await rememberEvent();
  await auditSafe(req, { action: 'paymentWebhookReceived', entityType: 'payment', entityId: payment._id, details: { ...received, handled: false, reason: 'event not used' } });
  return { handled: false };
}

export { handleWebhook, PAID_EVENTS, FAILED_EVENTS };

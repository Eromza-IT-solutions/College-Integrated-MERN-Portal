import crypto from 'crypto';
import { RAZORPAY } from './constants.js';

/**
 * Razorpay helpers. Everything here is pure: nothing is saved and no network call is made.
 *
 * Two signatures matter:
 *  - Checkout signature: after the student pays, the browser sends order id, payment id and a signature.
 *    The signature is HMAC-SHA256 of "order_id|payment_id" with the KEY SECRET. Only the server knows the secret,
 *    so a valid signature proves Razorpay (not the browser) confirmed that payment for that order.
 *  - Webhook signature: Razorpay calls our server. The signature is HMAC-SHA256 of the RAW request body with the
 *    WEBHOOK SECRET. It must be checked on the raw bytes, before the body is parsed.
 */

const hmacHex = (secret, text) => crypto.createHmac('sha256', String(secret)).update(text).digest('hex');

/** Constant-time comparison of two hex strings. Different lengths are simply not equal. */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function verifyCheckoutSignature({ orderId, paymentId, signature, keySecret }) {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return safeEqualHex(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
}

function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (rawBody === undefined || rawBody === null || !signature || !webhookSecret) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  return safeEqualHex(crypto.createHmac('sha256', String(webhookSecret)).update(body).digest('hex'), signature);
}

/** Test keys start with rzp_test_. Live keys start with rzp_live_. */
const isTestKeyId = (keyId) => typeof keyId === 'string' && keyId.startsWith(RAZORPAY.testKeyPrefix);

/** What we send to Razorpay to create an order for one of our payments. The receipt is our payment id, so the two can be matched. */
function orderPayload(payment) {
  const receipt = `P${payment._id}`;
  if (receipt.length > RAZORPAY.receiptMaxLength) throw new Error('Receipt id is too long for Razorpay');
  const notes = { paymentId: String(payment._id), purpose: String(payment.purpose) };
  if (payment.applicationId) notes.applicationId = String(payment.applicationId);
  if (payment.examFormId) notes.examFormId = String(payment.examFormId);
  return { amount: payment.amountPaise, currency: payment.currency || RAZORPAY.currency, receipt, notes };
}

/**
 * Reads the parts of a Razorpay webhook body we use. Returns null for a body that has no payment in it.
 * payment.captured, payment.failed and order.paid all carry payload.payment.entity.
 */
function eventSummary(event) {
  const entity = event && event.payload && event.payload.payment && event.payload.payment.entity;
  if (!event || !entity) return null;
  return {
    name: event.event,
    orderId: entity.order_id,
    paymentId: entity.id,
    amountPaise: entity.amount,
    currency: entity.currency,
    method: entity.method,
    errorCode: entity.error_code || undefined,
    errorDescription: entity.error_description || undefined,
  };
}

export { hmacHex, safeEqualHex, verifyCheckoutSignature, verifyWebhookSignature, isTestKeyId, orderPayload, eventSummary };

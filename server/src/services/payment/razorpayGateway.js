import crypto from 'crypto';
import AppError from '../../utils/AppError.js';
import { PAYMENT_GATEWAY } from '../../utils/constants.js';
import { safeEqual } from './fakeGateway.js';

// Razorpay (test mode). Uses Node's built-in fetch and crypto, so no new npm package is needed.
// Docs: https://razorpay.com/docs/api/orders/  (Orders API: POST /v1/orders, amount in paise)
const BASE_URL = 'https://api.razorpay.com/v1';

function createRazorpayGateway({ keyId, keySecret, webhookSecret }, fetchImpl = globalThis.fetch) {
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');

  async function call(path, { method = 'POST', body } = {}) {
    let res;
    try {
      res = await fetchImpl(`${BASE_URL}${path}`, {
        method,
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new AppError('The payment gateway could not be reached', 502, undefined, 'GATEWAY_UNREACHABLE');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = (json.error && json.error.description) || `status ${res.status}`;
      throw new AppError(`The payment gateway refused the request: ${reason}`, 502, undefined, 'GATEWAY_ERROR');
    }
    return json;
  }

  return {
    name: PAYMENT_GATEWAY.RAZORPAY,
    publicKeyId: keyId, // safe to send to the browser; the secret never leaves the server
    async createOrder({ amountPaise, receipt, notes }) {
      const order = await call('/orders', { body: { amount: amountPaise, currency: 'INR', receipt, notes } });
      return { gatewayOrderId: order.id, amountPaise: order.amount, currency: order.currency, receipt: order.receipt };
    },
    async listOrderPayments(gatewayOrderId) {
      const result = await call(`/orders/${encodeURIComponent(gatewayOrderId)}/payments`, { method: 'GET' });
      return Array.isArray(result.items) ? result.items : [];
    },
    verifyPaymentSignature({ orderId, paymentId, signature }) {
      return safeEqual(hmac(keySecret, `${orderId}|${paymentId}`), signature);
    },
    verifyWebhookSignature(rawBody, signature) {
      return safeEqual(hmac(webhookSecret, rawBody), signature);
    },
    async refund({ gatewayPaymentId, amountPaise, notes }) {
      const r = await call(`/payments/${encodeURIComponent(gatewayPaymentId)}/refund`, { body: { amount: amountPaise, notes } });
      return { gatewayRefundId: r.id, gatewayPaymentId, amountPaise: r.amount };
    },
  };
}

export { createRazorpayGateway };

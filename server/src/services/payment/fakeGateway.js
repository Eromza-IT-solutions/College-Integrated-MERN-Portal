import crypto from 'crypto';
import { PAYMENT_GATEWAY } from '../../utils/constants.js';

// A pretend payment gateway for development and tests: no keys, no internet.
// It behaves like a real one: it makes order ids, and it signs "payment done" messages with a secret,
// so the verification and webhook code (Steps 3 and 4 of this module) can be tried exactly as with Razorpay.
const FAKE_SECRET = 'fake-gateway-secret'; // not a real secret: the fake gateway is for demo data only

function createFakeGateway() {
  return {
    name: PAYMENT_GATEWAY.FAKE,
    publicKeyId: null,
    secret: FAKE_SECRET,
    async createOrder({ amountPaise, receipt }) {
      return {
        gatewayOrderId: `order_fake_${crypto.randomBytes(8).toString('hex')}`,
        amountPaise,
        currency: 'INR',
        receipt,
      };
    },
    // order_id|payment_id signed with the secret (same recipe as Razorpay's checkout signature)
    sign(orderId, paymentId) {
      return crypto.createHmac('sha256', FAKE_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    },
    verifyPaymentSignature({ orderId, paymentId, signature }) {
      return safeEqual(this.sign(orderId, paymentId), signature);
    },
    signWebhook(rawBody) {
      return crypto.createHmac('sha256', FAKE_SECRET).update(rawBody).digest('hex');
    },
    verifyWebhookSignature(rawBody, signature) {
      return safeEqual(this.signWebhook(rawBody), signature);
    },
    async refund({ gatewayPaymentId, amountPaise }) {
      return { gatewayRefundId: `rfnd_fake_${crypto.randomBytes(8).toString('hex')}`, gatewayPaymentId, amountPaise };
    },
  };
}

// Compare two secret strings in constant time. A wrong length is simply "no".
function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export { createFakeGateway, safeEqual };

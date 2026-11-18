import AppError from '../utils/AppError.js';
import Payment from '../models/Payment.js';
import { RAZORPAY, PAYMENT_STATUS, PAYMENT_GATEWAY } from '../utils/constants.js';
import { orderPayload, isTestKeyId } from '../utils/razorpay.js';

/**
 * Starts a Razorpay checkout for one of our payments.
 * Creates the Razorpay order the first time and saves its id. Asking again returns the same order, so a student who
 * closes the window and comes back does not get a second order.
 * keyId and keySecret come from .env (PAYMENT_KEY_ID, PAYMENT_KEY_SECRET). fetchImpl is only replaced in tests.
 * Returns what the browser needs to open Razorpay Checkout. The secret never leaves the server.
 */
async function startCheckout(paymentId, { keyId, keySecret, fetchImpl = globalThis.fetch } = {}) {
  if (!keyId || !keySecret) throw new AppError('Razorpay keys are not set (PAYMENT_KEY_ID and PAYMENT_KEY_SECRET)', 500);
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.gateway !== PAYMENT_GATEWAY.RAZORPAY) throw new AppError('This payment does not use Razorpay', 409);
  if (payment.status !== PAYMENT_STATUS.CREATED) throw new AppError(`A ${payment.status} payment cannot be paid again`, 409);

  let orderId = payment.gatewayOrderId;
  if (!orderId) {
    const body = orderPayload(payment);
    const res = await fetchImpl(RAZORPAY.ordersUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new AppError(`Razorpay could not create the order (${res.status})`, 502);
    const order = await res.json();
    if (!order || !order.id || order.amount !== body.amount || order.currency !== body.currency) {
      throw new AppError('Razorpay returned an order that does not match this payment', 502);
    }
    // If two requests raced, one order id wins and the other is refused; both callers then use the saved one.
    const saved = await Payment.attachGatewayOrder(payment._id, { orderId: order.id }).catch(async (err) => {
      if (err.statusCode !== 409) throw err;
      return Payment.findById(payment._id);
    });
    orderId = saved.gatewayOrderId;
  }
  return { keyId, orderId, amountPaise: payment.amountPaise, currency: payment.currency || RAZORPAY.currency, isTestMode: isTestKeyId(keyId) };
}

export { startCheckout };

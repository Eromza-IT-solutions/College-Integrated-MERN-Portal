import { jest } from '@jest/globals';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Payment from '../src/models/Payment.js';
import Counter from '../src/models/Counter.js';
import AcademicYear from '../src/models/AcademicYear.js';
import { startCheckout } from '../src/services/razorpayService.js';
import {
  verifyCheckoutSignature, verifyWebhookSignature, isTestKeyId, orderPayload, eventSummary, safeEqualHex,
} from '../src/utils/razorpay.js';

const SECRET = 'test_key_secret_123';
const WEBHOOK_SECRET = 'whsec_abc';
const id = () => new mongoose.Types.ObjectId();
const sign = (orderId, paymentId, secret = SECRET) => crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

describe('signatures', () => {
  test('a checkout signature made with the key secret is valid', () => {
    expect(verifyCheckoutSignature({ orderId: 'order_A1', paymentId: 'pay_B2', signature: sign('order_A1', 'pay_B2'), keySecret: SECRET })).toBe(true);
  });
  test.each([
    ['wrong secret', { signature: sign('order_A1', 'pay_B2', 'other') }],
    ['other payment id', { signature: sign('order_A1', 'pay_ZZ') }],
    ['other order id', { orderId: 'order_ZZ' }],
    ['empty signature', { signature: '' }],
    ['missing signature', { signature: undefined }],
    ['short signature', { signature: 'abc' }],
    ['missing secret', { keySecret: '' }],
  ])('a checkout signature is refused: %s', (_n, over) => {
    expect(verifyCheckoutSignature({ orderId: 'order_A1', paymentId: 'pay_B2', signature: sign('order_A1', 'pay_B2'), keySecret: SECRET, ...over })).toBe(false);
  });
  test('the "|" joins order and payment, so moving a character between them is caught', () => {
    expect(verifyCheckoutSignature({ orderId: 'order_A', paymentId: '1pay_B2', signature: sign('order_A1', 'pay_B2'), keySecret: SECRET })).toBe(false);
  });

  const raw = Buffer.from('{"event":"payment.captured","payload":{}}');
  const wsig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  test('a webhook signature is checked on the raw body', () => {
    expect(verifyWebhookSignature({ rawBody: raw, signature: wsig, webhookSecret: WEBHOOK_SECRET })).toBe(true);
    expect(verifyWebhookSignature({ rawBody: raw.toString(), signature: wsig, webhookSecret: WEBHOOK_SECRET })).toBe(true);
  });
  test('a webhook with one changed character, a wrong secret or no signature is refused', () => {
    expect(verifyWebhookSignature({ rawBody: Buffer.from('{"event":"payment.captureD","payload":{}}'), signature: wsig, webhookSecret: WEBHOOK_SECRET })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: raw, signature: wsig, webhookSecret: 'nope' })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: raw, signature: undefined, webhookSecret: WEBHOOK_SECRET })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: undefined, signature: wsig, webhookSecret: WEBHOOK_SECRET })).toBe(false);
  });
  test('safeEqualHex never throws on odd input', () => {
    expect(safeEqualHex('a', 'ab')).toBe(false);
    expect(safeEqualHex(1, 'a')).toBe(false);
    expect(safeEqualHex('ab', 'ab')).toBe(true);
  });
});

describe('helpers', () => {
  test('test keys are told apart from live keys', () => {
    expect(isTestKeyId('rzp_test_abc')).toBe(true);
    expect(isTestKeyId('rzp_live_abc')).toBe(false);
    expect(isTestKeyId(undefined)).toBe(false);
  });
  test('the order we send has the amount in paise, INR, and a receipt of at most 40 characters', () => {
    const p = { _id: id(), purpose: 'admission', applicationId: id(), amountPaise: 925000 };
    const o = orderPayload(p);
    expect(o).toMatchObject({ amount: 925000, currency: 'INR', receipt: `P${p._id}` });
    expect(o.receipt.length).toBeLessThanOrEqual(40);
    expect(o.notes).toMatchObject({ paymentId: String(p._id), purpose: 'admission', applicationId: String(p.applicationId) });
    expect(orderPayload({ _id: id(), purpose: 'exam', examFormId: id(), amountPaise: 80000 }).notes.examFormId).toBeDefined();
  });
  test('eventSummary reads a webhook body and returns null when there is no payment', () => {
    const ev = { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 100, currency: 'INR', method: 'upi', error_code: 'BAD_REQUEST_ERROR', error_description: 'Declined' } } } };
    expect(eventSummary(ev)).toEqual({ name: 'payment.failed', orderId: 'order_1', paymentId: 'pay_1', amountPaise: 100, currency: 'INR', method: 'upi', errorCode: 'BAD_REQUEST_ERROR', errorDescription: 'Declined' });
    expect(eventSummary({ event: 'x', payload: {} })).toBeNull();
    expect(eventSummary(null)).toBeNull();
  });
});

describe('Payment model fields', () => {
  const fresh = (over = {}) => ({ purpose: 'admission', payerUserId: id(), academicYearId: id(), feeStructureId: id(), applicationId: id(), amountPaise: 1200000, ...over });
  test('defaults to Razorpay, INR, test mode, no failed attempts', async () => {
    const p = new Payment(fresh());
    await expect(p.validate()).resolves.toBeUndefined();
    expect(p).toMatchObject({ gateway: 'razorpay', currency: 'INR', isTestMode: true, failedAttempts: 0, status: 'created' });
    expect(p.gatewayEventIds).toHaveLength(0);
  });
  test.each([['method', { gatewayMethod: 'cheque' }], ['confirmedVia', { confirmedVia: 'phone' }], ['currency', { currency: 'USD' }], ['failedAttempts', { failedAttempts: -1 }]])('rejects a bad %s', async (_n, over) => {
    await expect(new Payment(fresh(over)).validate()).rejects.toThrow();
  });
  test.each(['card', 'upi', 'netbanking', 'wallet', 'emi', 'paylater', 'other'])('accepts method %s', async (gatewayMethod) => {
    await expect(new Payment(fresh({ gatewayMethod })).validate()).resolves.toBeUndefined();
  });
});

// A tiny in-memory stand-in for the database, so the payment rules can be tested without MongoDB.
let payments;
let counterValue;
const copy = (o) => (o ? JSON.parse(JSON.stringify(o), (k, v) => (k === 'paidAt' || k.endsWith('At') ? (v ? new Date(v) : v) : v)) : null);
function wireFakes() {
  payments = {};
  counterValue = 0;
  Payment.findById = (pid) => {
    const run = async () => copy(payments[pid]);
    return { session: run, then: (a, b) => run().then(a, b) };
  };
  Payment.findOne = (filter) => ({
    session: async () => copy(Object.values(payments).find((p) => Object.entries(filter).every(([k, v]) => p[k] === v)) || null),
  });
  Payment.findOneAndUpdate = async (filter, update) => {
    const p = payments[filter._id];
    if (!p) return null;
    if (filter.status && p.status !== filter.status) return null;
    if (filter.gateway && p.gateway !== filter.gateway) return null;
    if (filter.gatewayOrderId && filter.gatewayOrderId.$exists === false && p.gatewayOrderId) return null;
    if (filter.receiptNumber && filter.receiptNumber.$exists === false && p.receiptNumber) return null;
    if (update.$set) Object.assign(p, update.$set);
    if (update.$inc) Object.entries(update.$inc).forEach(([k, v]) => { p[k] = (p[k] || 0) + v; });
    return copy(p);
  };
  Payment.updateOne = async (filter, update) => {
    const p = payments[filter._id];
    if (update.$addToSet) Object.entries(update.$addToSet).forEach(([k, v]) => { p[k] = p[k] || []; if (!p[k].includes(v)) p[k].push(v); });
  };
  AcademicYear.findById = () => ({ session: async () => ({ label: '2026-27' }) });
  Counter.next = async () => { counterValue += 1; return counterValue; };
}
const addPayment = (over = {}) => {
  const p = { _id: String(id()), purpose: 'admission', gateway: 'razorpay', status: 'created', amountPaise: 925000, currency: 'INR', failedAttempts: 0, gatewayEventIds: [], academicYearId: id(), ...over };
  payments[p._id] = p;
  return p;
};
beforeEach(wireFakes);

describe('Payment.attachGatewayOrder', () => {
  test('saves the order id once; the same id again is fine', async () => {
    const p = addPayment();
    const a = await Payment.attachGatewayOrder(p._id, { orderId: 'order_ABC123' });
    expect(a.gatewayOrderId).toBe('order_ABC123');
    expect(a.orderCreatedAt).toBeDefined();
    expect((await Payment.attachGatewayOrder(p._id, { orderId: 'order_ABC123' })).gatewayOrderId).toBe('order_ABC123');
  });
  test('a different order id is refused', async () => {
    const p = addPayment({ gatewayOrderId: 'order_ONE' });
    await expect(Payment.attachGatewayOrder(p._id, { orderId: 'order_TWO' })).rejects.toMatchObject({ statusCode: 409 });
  });
  test.each([['empty', ''], ['no prefix', 'ABC123'], ['spaces', 'order_ A'], ['not a string', 5], ['missing', undefined]])('a bad order id is refused: %s', async (_n, orderId) => {
    const p = addPayment();
    await expect(Payment.attachGatewayOrder(p._id, { orderId })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('a paid payment, a fake-gateway payment and a missing one cannot get an order', async () => {
    const paid = addPayment({ status: 'paid' });
    await expect(Payment.attachGatewayOrder(paid._id, { orderId: 'order_X1' })).rejects.toMatchObject({ statusCode: 409 });
    const fake = addPayment({ gateway: 'fake' });
    await expect(Payment.attachGatewayOrder(fake._id, { orderId: 'order_X1' })).rejects.toMatchObject({ statusCode: 409 });
    await expect(Payment.attachGatewayOrder('nope', { orderId: 'order_X1' })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('Payment.confirmCheckout', () => {
  const ready = (over = {}) => addPayment({ gatewayOrderId: 'order_OK1', ...over });
  const confirm = (p, over = {}) => Payment.confirmCheckout(p._id, { orderId: 'order_OK1', paymentId: 'pay_OK1', signature: sign('order_OK1', 'pay_OK1'), keySecret: SECRET, method: 'upi', ...over });

  test('a valid signature marks it paid, with receipt, method and who confirmed it', async () => {
    const p = ready();
    const done = await confirm(p);
    expect(done).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_OK1', gatewayMethod: 'upi', confirmedVia: 'checkout', receiptNumber: 'RCT-2026-27-000001' });
    expect(done.signatureVerifiedAt).toBeInstanceOf(Date);
  });
  test('confirming twice gives the same single receipt', async () => {
    const p = ready();
    await confirm(p);
    const again = await confirm(p);
    expect(again.receiptNumber).toBe('RCT-2026-27-000001');
    expect(counterValue).toBe(1);
  });
  test('a wrong signature is refused and nothing changes', async () => {
    const p = ready();
    await expect(confirm(p, { signature: sign('order_OK1', 'pay_OK1', 'forged') })).rejects.toMatchObject({ statusCode: 400 });
    expect(payments[p._id]).toMatchObject({ status: 'created' });
    expect(payments[p._id].gatewayPaymentId).toBeUndefined();
  });
  test('a signature for another payment id is refused', async () => {
    const p = ready();
    await expect(confirm(p, { paymentId: 'pay_OTHER' })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('an order id that is not this payment\'s order is refused (even with a valid signature for it)', async () => {
    const p = ready();
    await expect(confirm(p, { orderId: 'order_ELSE', signature: sign('order_ELSE', 'pay_OK1') })).rejects.toMatchObject({ statusCode: 409 });
    const noOrder = addPayment();
    await expect(confirm(noOrder)).rejects.toMatchObject({ statusCode: 409 });
  });
  test('a second, different payment id on a settled order is refused', async () => {
    const p = ready();
    await confirm(p);
    await expect(confirm(p, { paymentId: 'pay_SECOND', signature: sign('order_OK1', 'pay_SECOND') })).rejects.toMatchObject({ statusCode: 409 });
    expect(payments[p._id].gatewayPaymentId).toBe('pay_OK1');
  });
  test('an unknown method is saved as "other"; no method leaves it empty', async () => {
    const a = ready();
    expect((await confirm(a, { method: 'cheque' })).gatewayMethod).toBe('other');
    const b = ready({ gatewayOrderId: 'order_OK1' });
    expect((await confirm(b, { method: undefined })).gatewayMethod).toBeUndefined();
  });
  test('a failed payment, a fake-gateway payment and a missing one cannot be confirmed', async () => {
    await expect(confirm(ready({ status: 'failed' }))).rejects.toMatchObject({ statusCode: 409 });
    await expect(confirm(ready({ gateway: 'fake' }))).rejects.toMatchObject({ statusCode: 409 });
    await expect(Payment.confirmCheckout('nope', {})).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('Payment.applyWebhookEvent', () => {
  const ev = (name, over = {}) => ({
    event: name,
    payload: { payment: { entity: { id: 'pay_W1', order_id: 'order_W1', amount: 925000, currency: 'INR', method: 'card', ...over } } },
  });
  const ready = (over = {}) => addPayment({ gatewayOrderId: 'order_W1', ...over });

  test.each(['payment.captured', 'order.paid'])('%s marks the payment paid', async (name) => {
    const p = ready();
    const r = await Payment.applyWebhookEvent(ev(name), { eventId: 'evt_1' });
    expect(r.handled).toBe(true);
    expect(payments[p._id]).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_W1', gatewayMethod: 'card', confirmedVia: 'webhook', receiptNumber: 'RCT-2026-27-000001' });
    expect(payments[p._id].gatewayEventIds).toEqual(['evt_1']);
  });
  test('the same event delivered twice does nothing the second time', async () => {
    const p = ready();
    await Payment.applyWebhookEvent(ev('payment.captured'), { eventId: 'evt_1' });
    const again = await Payment.applyWebhookEvent(ev('payment.captured'), { eventId: 'evt_1' });
    expect(again).toMatchObject({ handled: true, duplicate: true });
    expect(counterValue).toBe(1);
    expect(payments[p._id].gatewayEventIds).toEqual(['evt_1']);
  });
  test('a different event id for the same payment (order.paid after payment.captured) is harmless', async () => {
    const p = ready();
    await Payment.applyWebhookEvent(ev('payment.captured'), { eventId: 'evt_1' });
    await Payment.applyWebhookEvent(ev('order.paid'), { eventId: 'evt_2' });
    expect(counterValue).toBe(1);
    expect(payments[p._id].gatewayEventIds).toEqual(['evt_1', 'evt_2']);
  });
  test('the webhook arriving after the browser confirmed the same payment changes nothing', async () => {
    const p = ready();
    await Payment.confirmCheckout(p._id, { orderId: 'order_W1', paymentId: 'pay_W1', signature: sign('order_W1', 'pay_W1'), keySecret: SECRET });
    await Payment.applyWebhookEvent(ev('payment.captured'), { eventId: 'evt_1' });
    expect(payments[p._id]).toMatchObject({ status: 'paid', confirmedVia: 'checkout' });
    expect(counterValue).toBe(1);
  });
  test('an amount or currency that does not match is refused and the payment stays unpaid', async () => {
    const p = ready();
    await expect(Payment.applyWebhookEvent(ev('payment.captured', { amount: 100 }), { eventId: 'e' })).rejects.toMatchObject({ statusCode: 409 });
    await expect(Payment.applyWebhookEvent(ev('payment.captured', { currency: 'USD' }), { eventId: 'e' })).rejects.toMatchObject({ statusCode: 409 });
    expect(payments[p._id].status).toBe('created');
  });
  test('a different payment id on an order that is already paid is refused', async () => {
    ready({ status: 'paid', gatewayPaymentId: 'pay_FIRST' });
    await expect(Payment.applyWebhookEvent(ev('payment.captured'), { eventId: 'e' })).rejects.toMatchObject({ statusCode: 409 });
  });
  test('a failed attempt is recorded but the payment stays open for another try', async () => {
    const p = ready();
    await Payment.applyWebhookEvent(ev('payment.failed', { method: 'upi', error_code: 'BAD_REQUEST_ERROR', error_description: 'Payment declined' }), { eventId: 'evt_f1' });
    expect(payments[p._id]).toMatchObject({ status: 'created', failedAttempts: 1, gatewayErrorCode: 'BAD_REQUEST_ERROR', failureReason: 'Payment declined', gatewayMethod: 'upi' });
    await Payment.applyWebhookEvent(ev('payment.failed', { id: 'pay_W0' }), { eventId: 'evt_f2' });
    expect(payments[p._id].failedAttempts).toBe(2);
    await Payment.applyWebhookEvent(ev('payment.captured'), { eventId: 'evt_ok' });
    expect(payments[p._id]).toMatchObject({ status: 'paid', failedAttempts: 2, gatewayPaymentId: 'pay_W1' });
  });
  test('a failure event for an already paid payment does not change it', async () => {
    const p = ready({ status: 'paid', gatewayPaymentId: 'pay_W1', receiptNumber: 'RCT-X' });
    await Payment.applyWebhookEvent(ev('payment.failed'), { eventId: 'evt_f' });
    expect(payments[p._id]).toMatchObject({ status: 'paid', failedAttempts: 0 });
  });
  test('unknown orders, unused events and bodies without a payment are ignored, not errors', async () => {
    ready();
    expect(await Payment.applyWebhookEvent(ev('payment.captured', { order_id: 'order_NOPE' }))).toMatchObject({ handled: false, reason: 'unknown order' });
    expect(await Payment.applyWebhookEvent(ev('refund.created'))).toMatchObject({ handled: false });
    expect(await Payment.applyWebhookEvent({ event: 'payment.captured', payload: {} })).toMatchObject({ handled: false });
    expect(await Payment.applyWebhookEvent(null)).toMatchObject({ handled: false });
  });
  test('without an event id the event is still handled', async () => {
    const p = ready();
    await Payment.applyWebhookEvent(ev('payment.captured'));
    expect(payments[p._id].status).toBe('paid');
    expect(payments[p._id].gatewayEventIds).toEqual([]);
  });
});

describe('startCheckout', () => {
  const keys = { keyId: 'rzp_test_KEY', keySecret: SECRET };
  const okFetch = (over = {}) => jest.fn(async (url, opts) => ({
    ok: true, status: 200, json: async () => ({ id: 'order_NEW1', amount: JSON.parse(opts.body).amount, currency: 'INR', ...over }),
  }));

  test('creates the order at Razorpay, saves its id and returns what Checkout needs (never the secret)', async () => {
    const p = addPayment();
    const fetchImpl = okFetch();
    const r = await startCheckout(p._id, { ...keys, fetchImpl });
    expect(r).toEqual({ keyId: 'rzp_test_KEY', orderId: 'order_NEW1', amountPaise: 925000, currency: 'INR', isTestMode: true });
    expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(payments[p._id].gatewayOrderId).toBe('order_NEW1');
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.razorpay.com/v1/orders');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe(`Basic ${Buffer.from(`rzp_test_KEY:${SECRET}`).toString('base64')}`);
    expect(JSON.parse(opts.body)).toMatchObject({ amount: 925000, currency: 'INR', receipt: `P${p._id}` });
  });
  test('asking again reuses the saved order and makes no second call', async () => {
    const p = addPayment();
    const fetchImpl = okFetch();
    await startCheckout(p._id, { ...keys, fetchImpl });
    const again = await startCheckout(p._id, { ...keys, fetchImpl });
    expect(again.orderId).toBe('order_NEW1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  test('a live key is not reported as test mode', async () => {
    const p = addPayment();
    expect((await startCheckout(p._id, { keyId: 'rzp_live_K', keySecret: SECRET, fetchImpl: okFetch() })).isTestMode).toBe(false);
  });
  test('missing keys are an error before anything is called', async () => {
    const p = addPayment();
    const fetchImpl = okFetch();
    await expect(startCheckout(p._id, { keyId: '', keySecret: '', fetchImpl })).rejects.toMatchObject({ statusCode: 500 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  test('Razorpay refusing, or returning a different amount, is a 502 and saves nothing', async () => {
    const p = addPayment();
    await expect(startCheckout(p._id, { ...keys, fetchImpl: jest.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })) })).rejects.toMatchObject({ statusCode: 502 });
    await expect(startCheckout(p._id, { ...keys, fetchImpl: okFetch({ amount: 1 }) })).rejects.toMatchObject({ statusCode: 502 });
    await expect(startCheckout(p._id, { ...keys, fetchImpl: okFetch({ id: undefined }) })).rejects.toMatchObject({ statusCode: 502 });
    expect(payments[p._id].gatewayOrderId).toBeUndefined();
  });
  test('a paid payment, a fake-gateway payment and a missing one cannot start checkout', async () => {
    await expect(startCheckout(addPayment({ status: 'paid' })._id, { ...keys, fetchImpl: okFetch() })).rejects.toMatchObject({ statusCode: 409 });
    await expect(startCheckout(addPayment({ gateway: 'fake' })._id, { ...keys, fetchImpl: okFetch() })).rejects.toMatchObject({ statusCode: 409 });
    await expect(startCheckout('nope', { ...keys, fetchImpl: okFetch() })).rejects.toMatchObject({ statusCode: 404 });
  });
  test('when another request saved a different order first, that order is the one used', async () => {
    const p = addPayment();
    const orig = Payment.attachGatewayOrder;
    Payment.attachGatewayOrder = async (pid) => { payments[pid].gatewayOrderId = 'order_WON'; throw Object.assign(new Error('x'), { statusCode: 409 }); };
    try {
      expect((await startCheckout(p._id, { ...keys, fetchImpl: okFetch() })).orderId).toBe('order_WON');
    } finally { Payment.attachGatewayOrder = orig; }
  });
});

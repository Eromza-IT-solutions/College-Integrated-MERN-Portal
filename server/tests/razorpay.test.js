import mongoose from 'mongoose';
import Payment from '../src/models/Payment.js';
import Counter from '../src/models/Counter.js';
import AcademicYear from '../src/models/AcademicYear.js';

const id = () => new mongoose.Types.ObjectId();

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

let payments;
let counterValue;
const copy = (o) => (o ? { ...o } : null);

function wireFakes() {
  payments = {};
  counterValue = 0;
  Payment.findById = (pid) => ({ session: async () => copy(payments[pid] || null) });
  Payment.findOneAndUpdate = async (filter, update) => {
    const p = payments[filter._id];
    if (!p) return null;
    if (filter.status && p.status !== filter.status) return null;
    if (update.$set) Object.assign(p, update.$set);
    if (update.$inc) Object.entries(update.$inc).forEach(([k, v]) => { p[k] = (p[k] || 0) + v; });
    return copy(p);
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

describe('Payment.markPaid', () => {
  test('marks a created payment paid once, with the extra fields and one receipt', async () => {
    const p = addPayment();
    const paid = await Payment.markPaid(p._id, {
      gatewayPaymentId: 'pay_OK1',
      fields: { confirmedVia: 'checkout', signatureVerifiedAt: new Date(), gatewayMethod: 'upi' },
    });
    expect(paid).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_OK1', confirmedVia: 'checkout', gatewayMethod: 'upi', receiptNumber: 'RCT-2026-27-000001' });
    expect(paid.signatureVerifiedAt).toBeInstanceOf(Date);
    const again = await Payment.markPaid(p._id, { gatewayPaymentId: 'pay_OK1' });
    expect(again.receiptNumber).toBe('RCT-2026-27-000001');
    expect(counterValue).toBe(1);
  });

  test('a failed payment cannot be marked paid', async () => {
    const p = addPayment({ status: 'failed' });
    await expect(Payment.markPaid(p._id, { gatewayPaymentId: 'pay_OK1' })).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('Payment.recordFailedAttempt', () => {
  test('counts a failed attempt and keeps the payment open', async () => {
    const p = addPayment();
    const out = await Payment.recordFailedAttempt(p._id, { reason: 'Card declined', errorCode: 'BAD_REQUEST_ERROR', method: 'upi' });
    expect(out).toMatchObject({ status: 'created', failedAttempts: 1, failureReason: 'Card declined', gatewayErrorCode: 'BAD_REQUEST_ERROR', gatewayMethod: 'upi' });
  });

  test('an unknown method is saved as "other"', async () => {
    const p = addPayment();
    expect((await Payment.recordFailedAttempt(p._id, { method: 'cheque' })).gatewayMethod).toBe('other');
  });

  test('a paid payment is left unchanged', async () => {
    const p = addPayment({ status: 'paid', gatewayPaymentId: 'pay_OK1' });
    const out = await Payment.recordFailedAttempt(p._id, { reason: 'late failure' });
    expect(out).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_OK1' });
    expect(payments[p._id].failedAttempts).toBe(0);
  });
});

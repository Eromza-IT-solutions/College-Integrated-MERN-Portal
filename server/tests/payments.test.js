import mongoose from 'mongoose';
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';
import Refund from '../src/models/Refund.js';
import Counter from '../src/models/Counter.js';
import AcademicYear from '../src/models/AcademicYear.js';

const id = () => new mongoose.Types.ObjectId();
const fresh = (over = {}) => ({
  purpose: 'admission', payerUserId: id(), academicYearId: id(), feeStructureId: id(), applicationId: id(), amountPaise: 1200000, ...over,
});

describe('FeeStructure', () => {
  const fee = (over = {}) => new FeeStructure({ purpose: 'admission', academicYearId: id(), programId: id(), feesCategory: 'PAYING', amountPaise: 1200000, ...over });
  test('a valid fee passes', async () => { await expect(fee().validate()).resolves.toBeUndefined(); });
  test.each([
    ['negative amount', { amountPaise: -1 }],
    ['fraction of a paisa', { amountPaise: 10.5 }],
    ['unknown category', { feesCategory: 'VIP' }],
    ['unknown purpose', { purpose: 'library' }],
  ])('rejects %s', async (_n, over) => { await expect(fee(over).validate()).rejects.toThrow(); });
  test('a free category (amount 0) is allowed', async () => { await expect(fee({ amountPaise: 0 }).validate()).resolves.toBeUndefined(); });
});

describe('Payment model', () => {
  test('defaults: created, test mode, fake gateway', async () => {
    const p = new Payment(fresh());
    await expect(p.validate()).resolves.toBeUndefined();
    expect(p).toMatchObject({ status: 'created', isTestMode: true, gateway: 'fake', reservedRefundPaise: 0 });
  });
  test('admission payment needs an application; exam payment needs an exam form', async () => {
    await expect(new Payment(fresh({ applicationId: undefined })).validate()).rejects.toThrow(/application/);
    await expect(new Payment(fresh({ purpose: 'exam', applicationId: undefined })).validate()).rejects.toThrow(/exam form/);
    await expect(new Payment(fresh({ purpose: 'exam', applicationId: undefined, examFormId: id() })).validate()).resolves.toBeUndefined();
  });
  test.each([['zero', 0], ['fraction', 99.5], ['negative', -5]])('rejects amount %s', async (_n, amountPaise) => {
    await expect(new Payment(fresh({ amountPaise })).validate()).rejects.toThrow();
  });
  test('the amount of a saved payment cannot be changed', async () => {
    const saved = Payment.hydrate({ _id: id(), ...fresh() });
    saved.amountPaise = 1;
    await expect(saved.validate()).rejects.toThrow(/cannot be changed/);
  });
  test('refunds reserved cannot exceed the amount', async () => {
    await expect(new Payment(fresh({ reservedRefundPaise: 2000000 })).validate()).rejects.toThrow();
  });
});

// A tiny in-memory stand-in for the database, so the money rules can be tested without MongoDB.
let payments;
let refunds;
let counterValue;
function wireFakes() {
  payments = {};
  refunds = {};
  counterValue = 0;
  const copy = (o) => (o ? { ...o } : null);
  Payment.findById = (pid) => ({ session: async () => copy(payments[pid]) });
  Payment.findOneAndUpdate = async (filter, update) => {
    const p = payments[filter._id];
    if (!p) return null;
    if (filter.status && p.status !== filter.status) return null;
    if (filter.receiptNumber && filter.receiptNumber.$exists === false && p.receiptNumber) return null;
    if (filter.$expr) {
      const add = update.$inc.reservedRefundPaise;
      if (!(p.reservedRefundPaise + add <= p.amountPaise)) return null;
    }
    if (update.$set) Object.assign(p, update.$set);
    if (update.$inc) Object.entries(update.$inc).forEach(([k, v]) => { p[k] += v; });
    return copy(p);
  };
  Payment.updateOne = async (filter, update) => { Object.entries(update.$inc).forEach(([k, v]) => { payments[filter._id][k] += v; }); };
  AcademicYear.findById = () => ({ session: async () => ({ label: '2026-27' }) });
  Counter.next = async () => { counterValue += 1; return counterValue; };
  Refund.findById = (rid) => ({ session: async () => copy(refunds[rid]) });
  Refund.create = async ([doc]) => { const r = { _id: String(id()), status: 'requested', ...doc }; refunds[r._id] = r; return [copy(r)]; };
  Refund.findOneAndUpdate = async (filter, update) => {
    const r = refunds[filter._id];
    if (!r || (filter.status && r.status !== filter.status)) return null;
    Object.assign(r, update.$set);
    return copy(r);
  };
}
const addPayment = (over = {}) => {
  const p = { _id: String(id()), purpose: 'admission', status: 'created', amountPaise: 1000000, reservedRefundPaise: 0, academicYearId: id(), ...over };
  payments[p._id] = p;
  return p;
};
beforeEach(wireFakes);

describe('Payment.markPaid', () => {
  test('first call marks it paid and gives the receipt number', async () => {
    const p = addPayment();
    const done = await Payment.markPaid(p._id, { gatewayPaymentId: 'pay_1' });
    expect(done).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_1', receiptNumber: 'RCT-2026-27-000001' });
    expect(done.paidAt).toBeInstanceOf(Date);
  });
  test('calling it again (gateway retry) changes nothing and burns no number', async () => {
    const p = addPayment();
    await Payment.markPaid(p._id);
    const again = await Payment.markPaid(p._id);
    expect(again.receiptNumber).toBe('RCT-2026-27-000001');
    expect(counterValue).toBe(1);
  });
  test('a failed payment cannot be marked paid; a missing one is 404', async () => {
    const p = addPayment({ status: 'failed' });
    await expect(Payment.markPaid(p._id)).rejects.toMatchObject({ statusCode: 409 });
    await expect(Payment.markPaid('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
  test('a paid payment that has no receipt yet gets one (repair)', async () => {
    const p = addPayment({ status: 'paid' });
    expect((await Payment.ensureReceipt(p._id)).receiptNumber).toBe('RCT-2026-27-000001');
  });
  test('only a paid payment gets a receipt', async () => {
    const p = addPayment();
    await expect(Payment.ensureReceipt(p._id)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('Payment.markFailed', () => {
  test('a created payment can fail, a paid one cannot', async () => {
    const a = addPayment();
    expect(await Payment.markFailed(a._id, 'Card declined')).toMatchObject({ status: 'failed', failureReason: 'Card declined' });
    const b = addPayment({ status: 'paid' });
    await expect(Payment.markFailed(b._id)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('Refund', () => {
  const requester = id();
  const approver = id();
  const ask = (paymentId, amountPaise) => Refund.request({ paymentId, amountPaise, reason: 'Withdrew admission', requestedByUserId: requester });

  test('a paid payment can be refunded up to the amount paid, no more', async () => {
    const p = addPayment({ status: 'paid' });
    const r1 = await ask(p._id, 600000);
    expect(r1).toMatchObject({ status: 'requested', purpose: 'admission', amountPaise: 600000 });
    expect(payments[p._id].reservedRefundPaise).toBe(600000);
    await expect(ask(p._id, 500000)).rejects.toMatchObject({ statusCode: 409 }); // 600000 + 500000 > 1000000
    await expect(ask(p._id, 400000)).resolves.toBeDefined(); // exactly the rest
    expect(payments[p._id].reservedRefundPaise).toBe(1000000);
  });
  test('an unpaid or missing payment cannot be refunded', async () => {
    const p = addPayment();
    await expect(ask(p._id, 100)).rejects.toMatchObject({ statusCode: 409 });
    await expect(ask('nope', 100)).rejects.toMatchObject({ statusCode: 404 });
  });
  test('the amount must be a positive whole number', async () => {
    const p = addPayment({ status: 'paid' });
    await expect(ask(p._id, 0)).rejects.toMatchObject({ statusCode: 400 });
    await expect(ask(p._id, 10.5)).rejects.toMatchObject({ statusCode: 400 });
  });
  test('if saving the refund fails, the reserved amount is given back', async () => {
    const p = addPayment({ status: 'paid' });
    Refund.create = async () => { throw new Error('db down'); };
    await expect(ask(p._id, 300000)).rejects.toThrow('db down');
    expect(payments[p._id].reservedRefundPaise).toBe(0);
  });
  test('approval: the person who raised it cannot approve it', async () => {
    const p = addPayment({ status: 'paid' });
    const r = await ask(p._id, 100000);
    await expect(Refund.decide(r._id, { approve: true, decidedByUserId: requester })).rejects.toMatchObject({ statusCode: 403 });
    const done = await Refund.decide(r._id, { approve: true, decidedByUserId: approver });
    expect(done).toMatchObject({ status: 'approved', decidedByUserId: approver });
    expect(payments[p._id].reservedRefundPaise).toBe(100000); // still counted
  });
  test('rejecting needs a reason and frees the amount', async () => {
    const p = addPayment({ status: 'paid' });
    const r = await ask(p._id, 100000);
    await expect(Refund.decide(r._id, { approve: false, decidedByUserId: approver })).rejects.toMatchObject({ statusCode: 400 });
    await Refund.decide(r._id, { approve: false, decidedByUserId: approver, note: 'Not eligible' });
    expect(payments[p._id].reservedRefundPaise).toBe(0);
  });
  test('a refund can be decided only once', async () => {
    const p = addPayment({ status: 'paid' });
    const r = await ask(p._id, 100000);
    await Refund.decide(r._id, { approve: true, decidedByUserId: approver });
    await expect(Refund.decide(r._id, { approve: false, decidedByUserId: approver, note: 'x' })).rejects.toMatchObject({ statusCode: 409 });
  });
  test('model rules: rejected needs a note; decider cannot be requester', async () => {
    const base = { paymentId: id(), purpose: 'admission', amountPaise: 100, reason: 'r', requestedByUserId: requester };
    await expect(new Refund({ ...base, status: 'rejected' }).validate()).rejects.toThrow(/why/i);
    await expect(new Refund({ ...base, decidedByUserId: requester }).validate()).rejects.toThrow(/cannot decide/);
  });
});

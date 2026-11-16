import crypto from 'crypto';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js'; // register every model
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';
import User from '../src/models/User.js';
import AcademicYear from '../src/models/AcademicYear.js';

// Checks the Razorpay payment fields against the real DEV database. It makes NO call to Razorpay and needs no account:
// the signatures are made here with a made-up secret. It checks that one order id is kept per payment even when two
// requests race, that the browser confirmation and the webhook arriving together give one receipt, that a failed attempt
// leaves the payment open, and that the same order id cannot belong to two payments.
// It adds 2 test payments and removes them again. It uses up one receipt number.
// Run:  npm run seed   then   npm run seed:fees   then   node scripts/check-razorpay-fields.js
const SECRET = 'check_secret';
const sign = (o, p) => crypto.createHmac('sha256', SECRET).update(`${o}|${p}`).digest('hex');

async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const made = [];
  try {
    await Promise.all([FeeStructure.init(), Payment.init()]);
    const applicant = await User.findOne({ email: 'applicant@demo.example' });
    const year = await AcademicYear.findOne({ isCurrent: true });
    const fee = year && (await FeeStructure.findOne({ academicYearId: year._id, purpose: 'admission', feesCategory: 'PAYING' }));
    if (!applicant || !fee) throw new Error('Run "npm run seed" and "npm run seed:fees" first');
    const stamp = Date.now().toString(36).toUpperCase();
    const make = async () => {
      const p = await Payment.create({
        purpose: 'admission', payerUserId: applicant._id, academicYearId: year._id, feeStructureId: fee._id,
        applicationId: new mongoose.Types.ObjectId(), amountPaise: 100000,
      });
      made.push(p._id);
      return p;
    };
    const a = await make();
    ok(a.gateway === 'razorpay' && a.currency === 'INR' && a.failedAttempts === 0, 'a new payment uses Razorpay, INR, no failed attempts');

    let dupOpen = false;
    try {
      const extra = await Payment.create({
        purpose: 'admission', payerUserId: applicant._id, academicYearId: year._id, feeStructureId: fee._id,
        applicationId: a.applicationId, amountPaise: 100000,
      });
      made.push(extra._id);
    } catch (e) { dupOpen = e.code === 11000; }
    ok(dupOpen, 'a second open payment for the same application is refused (unique index)');

    const orderA = `order_A${stamp}`;
    const race = await Promise.allSettled([
      Payment.attachGatewayOrder(a._id, { orderId: orderA }),
      Payment.attachGatewayOrder(a._id, { orderId: `order_B${stamp}` }),
    ]);
    ok(race.filter((r) => r.status === 'fulfilled').length === 1, 'two different order ids raced: exactly one is kept');
    const keptOrder = (await Payment.findById(a._id)).gatewayOrderId;
    ok(keptOrder === orderA || keptOrder === `order_B${stamp}`, 'the payment holds one of them');

    const b = await make();
    let dup = false;
    try { await Payment.attachGatewayOrder(b._id, { orderId: keptOrder }); } catch { dup = true; }
    ok(dup, 'the same order id cannot be attached to a second payment (unique index)');

    const event = (name, over = {}) => ({ event: name, payload: { payment: { entity: { id: `pay_${stamp}`, order_id: keptOrder, amount: 100000, currency: 'INR', method: 'upi', ...over } } } });
    await Payment.applyWebhookEvent(event('payment.failed', { id: `pay_F${stamp}`, error_code: 'BAD_REQUEST_ERROR', error_description: 'Declined' }), { eventId: `evt_f_${stamp}` });
    let cur = await Payment.findById(a._id);
    ok(cur.status === 'created' && cur.failedAttempts === 1 && cur.gatewayErrorCode === 'BAD_REQUEST_ERROR', 'a failed attempt is counted and the payment stays open');

    let refused = false;
    try { await Payment.confirmCheckout(a._id, { orderId: keptOrder, paymentId: `pay_${stamp}`, signature: 'forged', keySecret: SECRET }); } catch (e) { refused = e.statusCode === 400; }
    ok(refused && (await Payment.findById(a._id)).status === 'created', 'a forged signature is refused and changes nothing');

    const both = await Promise.allSettled([
      Payment.confirmCheckout(a._id, { orderId: keptOrder, paymentId: `pay_${stamp}`, signature: sign(keptOrder, `pay_${stamp}`), keySecret: SECRET, method: 'upi' }),
      Payment.applyWebhookEvent(event('payment.captured'), { eventId: `evt_c_${stamp}` }),
    ]);
    ok(both.every((r) => r.status === 'fulfilled'), 'browser confirmation and webhook arriving together both succeed');
    cur = await Payment.findById(a._id);
    ok(cur.status === 'paid' && cur.gatewayPaymentId === `pay_${stamp}` && cur.receiptNumber, 'the payment is paid, with one receipt number');
    ok(['checkout', 'webhook'].includes(cur.confirmedVia) && cur.gatewayMethod === 'upi' && cur.failedAttempts === 1, 'it records who confirmed it, the method, and keeps the failed-attempt count');
    const receipt = cur.receiptNumber;
    await Payment.applyWebhookEvent(event('payment.captured'), { eventId: `evt_c_${stamp}` });
    ok((await Payment.findById(a._id)).receiptNumber === receipt, 'the same webhook again changes nothing');

    let mismatch = false;
    try { await Payment.applyWebhookEvent(event('payment.captured', { amount: 5 }), { eventId: `evt_m_${stamp}` }); } catch (e) { mismatch = e.statusCode === 409; }
    ok(mismatch, 'a webhook with a different amount is refused');
  } finally {
    if (made.length) await Payment.deleteMany({ _id: { $in: made } });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

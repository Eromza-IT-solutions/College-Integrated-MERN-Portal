import mongoose from 'mongoose';
import env from '../src/config/env.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';
import Refund from '../src/models/Refund.js';
import User from '../src/models/User.js';
import AcademicYear from '../src/models/AcademicYear.js';

// Checks the payment models against the real DEV database: duplicate protection, one receipt per payment
// even when the gateway confirms twice at the same moment, and refunds that can never add up to more than was paid.
// It adds records for one test payment and removes them again. It uses up one receipt number.
// Run:  npm run seed   then   npm run seed:fees   then   node scripts/check-payment-models.js
async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const made = { payment: null };
  try {
    await Promise.all([FeeStructure.init(), Payment.init(), Refund.init()]);
    const applicant = await User.findOne({ email: 'applicant@demo.example' });
    const year = await AcademicYear.findOne({ isCurrent: true });
    const fee = year && (await FeeStructure.findOne({ academicYearId: year._id, purpose: 'admission', feesCategory: 'PAYING' }));
    if (!applicant || !fee) throw new Error('Run "npm run seed" and "npm run seed:fees" first');

    made.payment = await Payment.create({
      purpose: 'admission', payerUserId: applicant._id, academicYearId: year._id, feeStructureId: fee._id,
      applicationId: new mongoose.Types.ObjectId(), amountPaise: 100000, gatewayOrderId: `check_${Date.now()}`,
    });
    ok(made.payment.status === 'created' && made.payment.isTestMode, 'new payment is created and in test mode');

    const [a, b] = await Promise.all([Payment.markPaid(made.payment._id), Payment.markPaid(made.payment._id)]);
    ok(a.status === 'paid' && b.status === 'paid', 'both confirmations end with a paid payment');
    ok(a.receiptNumber && a.receiptNumber === b.receiptNumber, 'both see the same single receipt number');
    const stored = await Payment.findById(made.payment._id);
    ok(stored.receiptNumber === a.receiptNumber, 'the receipt number is saved on the payment');

    const requester = new mongoose.Types.ObjectId();
    const approver = new mongoose.Types.ObjectId();
    const ask = (amountPaise) => Refund.request({ paymentId: made.payment._id, amountPaise, reason: 'check', requestedByUserId: requester });
    const results = await Promise.allSettled([ask(60000), ask(60000)]);
    ok(results.filter((r) => r.status === 'fulfilled').length === 1, 'two refunds of 60% raised together: exactly one is accepted');
    const accepted = results.find((r) => r.status === 'fulfilled').value;
    let blocked = false;
    try { await Refund.decide(accepted._id, { approve: true, decidedByUserId: requester }); } catch (e) { blocked = e.statusCode === 403; }
    ok(blocked, 'the person who raised a refund cannot approve it');
    const approved = await Refund.decide(accepted._id, { approve: true, decidedByUserId: approver });
    ok(approved.status === 'approved', 'a different person can approve it');
    await ask(40000);
    ok((await Payment.findById(made.payment._id)).reservedRefundPaise === 100000, 'refunds can use up exactly the amount paid');
    let over = false;
    try { await ask(1); } catch (e) { over = e.statusCode === 409; }
    ok(over, 'one more paisa is refused');
  } finally {
    if (made.payment) {
      await Refund.deleteMany({ paymentId: made.payment._id });
      await Payment.deleteOne({ _id: made.payment._id });
    }
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

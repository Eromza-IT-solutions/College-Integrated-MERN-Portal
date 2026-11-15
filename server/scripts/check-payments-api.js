// Real-database check for the payment module (orders, verification, webhook, refunds) through the real routes.
// It works in a temporary database that it deletes at the end, so your dev data is untouched.
// It uses the fake gateway, so no internet and no Razorpay keys are needed.
// Needs MONGODB_URI in .env. Run: node scripts/check-payments-api.js
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import env from '../src/config/env.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import Payment from '../src/models/Payment.js';
import Refund from '../src/models/Refund.js';
import Application from '../src/models/Application.js';
import FeeStructure from '../src/models/FeeStructure.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Counter from '../src/models/Counter.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { setGatewayForTests } from '../src/services/payment/index.js';
import { createFakeGateway } from '../src/services/payment/fakeGateway.js';
import paymentsRoutes from '../src/modules/payments/payments.routes.js';
import refundsRoutes from '../src/modules/payments/refunds.routes.js';

const matrix = JSON.parse(readFileSync(new URL('./data/permission-matrix.json', import.meta.url), 'utf8'));
const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); };

const appFor = (role, uid) => {
  const app = express();
  app.use((req, _res, next) => { if (uid) req.user = { id: String(uid), role, departmentId: null }; next(); });
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use('/payments', paymentsRoutes);
  app.use('/refunds', refundsRoutes);
  app.use(errorHandler);
  return app;
};

(async () => {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  const dbName = `eromza_check_pay_${Date.now()}`;
  await mongoose.connect(env.mongodbUri, { dbName, serverSelectionTimeoutMS: 10000 });
  try {
    await Promise.all([Permission.init(), AuditLog.init(), Payment.init(), Refund.init(), Application.init(), FeeStructure.init(), AcademicYear.init(), Counter.init()]);
    await Permission.insertMany(matrix);
    clearPermissionCache();
    const gateway = createFakeGateway();
    setGatewayForTests(gateway);

    const id = () => new mongoose.Types.ObjectId();
    const applicant = id(); const admin = id(); const boss = id(); const programId = id();
    const year = await AcademicYear.create({ label: '2026-27', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), status: 'current' });
    await FeeStructure.create({ purpose: 'admission', academicYearId: year._id, programId, feesCategory: 'PAYING', amountPaise: 1200000 });
    const application = await Application.create({ applicantUserId: applicant, academicYearId: year._id, programId, feesCategory: 'PAYING', status: 'submitted' });

    const A = appFor('applicant', applicant);
    const body = { purpose: 'admission', applicationId: String(application._id) };

    const first = await request(A).post('/payments/orders').send(body);
    const order = first.body.data;
    const saved = order && (await Payment.findById(order.paymentId));
    check('order created, amount from the fee structure, saved in the database', first.status === 201 && saved && saved.amountPaise === 1200000 && saved.gatewayOrderId === order.gatewayOrderId);

    const second = await request(A).post('/payments/orders').send(body);
    check('pressing Pay again reuses the order (one payment row)', second.status === 200 && second.body.data.gatewayOrderId === order.gatewayOrderId && (await Payment.countDocuments({ applicationId: application._id })) === 1);

    const wrong = await request(A).post(`/payments/${order.paymentId}/verify`).send({ gatewayPaymentId: 'pay_fake_1', signature: 'f'.repeat(64) });
    check('wrong signature: 400 and still unpaid', wrong.status === 400 && (await Payment.findById(order.paymentId)).status === 'created');

    // Four confirmations at the same moment: two from the browser, two from the gateway webhook.
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_fake_1', order_id: order.gatewayOrderId, amount: 1200000 } } } });
    const verify = () => request(A).post(`/payments/${order.paymentId}/verify`).send({ gatewayPaymentId: 'pay_fake_1', signature: gateway.sign(order.gatewayOrderId, 'pay_fake_1') });
    const hook = () => request(appFor(null, null)).post('/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', gateway.signWebhook(raw)).send(raw);
    const four = await Promise.all([verify(), hook(), verify(), hook()]);
    const paid = await Payment.findById(order.paymentId);
    check('4 simultaneous confirmations: all answered 200', four.every((r) => r.status === 200));
    check('...and the payment is paid with ONE receipt number', paid.status === 'paid' && /^RCT-2026-27-\d{6}$/.test(paid.receiptNumber) && four.filter((r) => r.body.data.receiptNumber).every((r) => r.body.data.receiptNumber === paid.receiptNumber));

    const receipt = await request(A).get(`/payments/${order.paymentId}/receipt`);
    check('receipt endpoint', receipt.status === 200 && receipt.body.data.receiptNumber === paid.receiptNumber && receipt.body.data.academicYear === '2026-27');

    const mine = await request(A).get('/payments?purpose=admission');
    check('list: the applicant sees their own payment (id filter works in MongoDB)', mine.status === 200 && mine.body.meta.total === 1);
    const stranger = await request(appFor('applicant', id())).get('/payments?purpose=admission');
    check('list: another applicant sees nothing', stranger.status === 200 && stranger.body.meta.total === 0);

    const again = await hook();
    check('webhook delivered again later: 200 duplicate', again.status === 200 && again.body.data.duplicate === true);

    // Two refunds of 7000 and 6000 on a 12000 payment, at the same moment: only one may win.
    const ask = (amountPaise) => request(appFor('admissionAdmin', admin)).post('/refunds').send({ paymentId: String(order.paymentId), amountPaise, reason: 'Student withdrew' });
    const [r1, r2] = await Promise.all([ask(700000), ask(600000)]);
    const statuses = [r1.status, r2.status].sort();
    const reserved = (await Payment.findById(order.paymentId)).reservedRefundPaise;
    check('two refunds at once: one accepted (201), one refused (409), never above the amount paid', statuses[0] === 201 && statuses[1] === 409 && reserved <= 1200000);

    const win = r1.status === 201 ? r1.body.data : r2.body.data;
    const self = await request(appFor('admissionAdmin', admin)).post(`/refunds/${win._id}/decision`).send({ approve: true });
    check('the admission admin cannot approve (403)', self.status === 403);
    const done = await request(appFor('superAdmin', boss)).post(`/refunds/${win._id}/decision`).send({ approve: true, note: 'ok' });
    check('super admin approves; the gateway refund id comes back', done.status === 200 && done.body.data.status === 'approved' && /^rfnd_fake_/.test(done.body.data.gatewayRefundId));
    const twice = await request(appFor('superAdmin', boss)).post(`/refunds/${win._id}/decision`).send({ approve: false, note: 'changed my mind' });
    check('a decided refund cannot be decided again (409)', twice.status === 409);

    await new Promise((resolve) => { setTimeout(resolve, 300); }); // the denial row is written without waiting
    const actions = (await AuditLog.find({}).lean()).map((a) => a.action);
    const want = ['paymentOrderCreated', 'paymentVerificationFailed', 'paymentVerified', 'paymentWebhookReceived', 'refundRequested', 'refundDecided', 'permissionDenied'];
    check(`audit log has: ${want.join(', ')}`, want.every((w) => actions.includes(w)));
    const decided = await AuditLog.findOne({ action: 'refundDecided', outcome: 'success' }).lean();
    check('the refund audit row carries the gateway refund id', decided && /^rfnd_fake_/.test(decided.details.gatewayRefundId));
  } finally {
    await mongoose.connection.dropDatabase().catch((e) => console.log('Could not delete the temporary database:', e.message));
    await mongoose.connection.close();
  }
  process.exitCode = results.every(Boolean) ? 0 : 1;
})().catch((err) => { console.error(err); process.exit(1); });

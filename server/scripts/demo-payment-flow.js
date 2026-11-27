// Shows the whole payment flow end to end WITHOUT a database: order -> pay -> verify -> webhook -> refund -> audit rows.
// The database is a small in-memory stand-in; the routes, permission checks, validation, gateway code and the Payment /
// Refund / ExamForm model rules are the REAL ones.
// Run (from the server folder, after npm install):  node scripts/demo-payment-flow.js
process.env.NODE_ENV = 'test';
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { readFileSync } = await import('fs');
const models = {
  Permission: (await import('../src/models/Permission.js')).default,
  AuditLog: (await import('../src/models/AuditLog.js')).default,
  Payment: (await import('../src/models/Payment.js')).default,
  Refund: (await import('../src/models/Refund.js')).default,
  Application: (await import('../src/models/Application.js')).default,
  FeeStructure: (await import('../src/models/FeeStructure.js')).default,
  AcademicYear: (await import('../src/models/AcademicYear.js')).default,
  Counter: (await import('../src/models/Counter.js')).default,
  User: (await import('../src/models/User.js')).default,
};
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { setGatewayForTests } = await import('../src/services/payment/index.js');
const { createFakeGateway } = await import('../src/services/payment/fakeGateway.js');
const { default: paymentsRoutes } = await import('../src/modules/payments/payments.routes.js');
const { default: refundsRoutes } = await import('../src/modules/payments/refunds.routes.js');
const { Permission, AuditLog, Payment, Refund, Application, FeeStructure, AcademicYear, Counter, User } = models;

const matrix = JSON.parse(readFileSync(new URL('./data/permission-matrix.json', import.meta.url), 'utf8'));
const id = () => new mongoose.Types.ObjectId();
const copy = (o) => (o ? { ...o } : null);
const q = (v) => ({ then: (a, b) => Promise.resolve(v).then(a, b), session: () => q(v), select: () => q(v), lean: () => q(v) });
const matches = (row, f) => Object.entries(f).every(([k, v]) => String(row[k]) === String(v));

const payments = {}; const refunds = {}; const audits = []; let counter = 0;
const YEAR = id(); const PROGRAM = id(); const applicant = id(); const admin = id(); const boss = id();
const application = { _id: id(), applicantUserId: applicant, academicYearId: YEAR, programId: PROGRAM, feesCategory: 'PAYING', status: 'submitted' };
const fee = { _id: id(), purpose: 'admission', academicYearId: YEAR, programId: PROGRAM, feesCategory: 'PAYING', amountPaise: 1200000, isActive: true };

Permission.find = () => ({ lean: async () => matrix });
AuditLog.record = async (e) => { audits.push(e); return e; };
Payment.findById = (i) => q(copy(payments[i]));
Payment.find = (f) => q(Object.values(payments).filter((p) => matches(p, f)).map(copy));
Payment.findOne = (f) => q(copy(Object.values(payments).find((p) => matches(p, f))));
Payment.create = async (d) => { const r = { status: 'created', isTestMode: true, reservedRefundPaise: 0, ...d }; payments[String(r._id)] = r; return copy(r); };
Payment.findOneAndUpdate = async (f, u) => {
  const p = payments[String(f._id)];
  if (!p || (f.status && p.status !== f.status)) return null;
  if (f.receiptNumber && f.receiptNumber.$exists === false && p.receiptNumber) return null;
  if (f.$expr && !(p.reservedRefundPaise + u.$inc.reservedRefundPaise <= p.amountPaise)) return null;
  if (u.$set) Object.assign(p, u.$set);
  if (u.$inc) Object.entries(u.$inc).forEach(([k, v]) => { p[k] += v; });
  return copy(p);
};
Payment.updateOne = async (f, u) => { Object.entries(u.$inc).forEach(([k, v]) => { payments[String(f._id)][k] += v; }); };
AcademicYear.findById = () => q({ label: '2026-27' });
Counter.next = async () => { counter += 1; return counter; };
User.findById = () => q({ fullName: 'Riya Patil' });
Refund.findById = (i) => q(copy(refunds[i]));
Refund.create = async ([d]) => { const r = { _id: id(), status: 'requested', ...d }; refunds[String(r._id)] = r; return [copy(r)]; };
Refund.findOneAndUpdate = async (f, u) => {
  const r = refunds[String(f._id)];
  if (!r || (f.status && r.status !== f.status)) return null;
  Object.assign(r, u.$set);
  return copy(r);
};
Application.findById = () => q(copy(application));
FeeStructure.findOne = () => q(copy(fee));

const gateway = createFakeGateway();
setGatewayForTests(gateway);

const appFor = (role, uid) => {
  const app = express();
  app.use((req, _res, next) => { if (uid) req.user = { id: String(uid), role, departmentId: null }; next(); });
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use('/payments', paymentsRoutes);
  app.use('/refunds', refundsRoutes);
  app.use(errorHandler);
  return app;
};

const show = (n, title, res, pick) => {
  const body = res.body.data !== undefined ? res.body.data : res.body.error;
  console.log(`${n}) ${title}\n   -> HTTP ${res.status}${pick ? ` ${JSON.stringify(pick(body))}` : ''}`);
};

const A = appFor('applicant', applicant);
const o1 = await request(A).post('/payments/orders').send({ purpose: 'admission', applicationId: String(application._id) });
show(1, 'Applicant presses "Pay admission fee" (amount comes from the server)', o1, (d) => ({ status: d.status, amountPaise: d.amountPaise, gateway: d.gateway }));
const order = o1.body.data;
const o2 = await request(A).post('/payments/orders').send({ purpose: 'admission', applicationId: String(application._id) });
show(2, 'Presses it again: same order, no duplicate', o2, (d) => ({ sameOrder: d.gatewayOrderId === order.gatewayOrderId, reused: o2.body.meta.reused }));
const sneaky = await request(A).post('/payments/orders').send({ purpose: 'admission', applicationId: String(application._id), amountPaise: 1 });
show(3, 'Browser tries to send its own amount (1 paisa)', sneaky, (e) => ({ code: e.code, field: e.errors[0].field }));
const bad = await request(A).post(`/payments/${order.paymentId}/verify`).send({ gatewayPaymentId: 'pay_fake_1', signature: 'f'.repeat(64) });
show(4, 'Verify with a WRONG signature', bad, (e) => ({ code: e.code }));
const good = await request(A).post(`/payments/${order.paymentId}/verify`).send({ gatewayPaymentId: 'pay_fake_1', signature: gateway.sign(order.gatewayOrderId, 'pay_fake_1') });
show(5, 'Verify with the RIGHT signature', good, (d) => ({ status: d.status, receiptNumber: d.receiptNumber }));
const rc = await request(A).get(`/payments/${order.paymentId}/receipt`);
show(6, 'Receipt', rc, (d) => ({ receiptNumber: d.receiptNumber, amountPaise: d.amountPaise, payerName: d.payerName, academicYear: d.academicYear }));

const event = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_fake_1', order_id: order.gatewayOrderId, amount: order.amountPaise } } } });
const wh = (sig) => request(appFor(null, null)).post('/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', sig).send(event);
show(7, 'Gateway webhook arrives for the same payment (already paid)', await wh(gateway.signWebhook(event)), (d) => ({ handled: d.handled, duplicate: d.duplicate }));
show(8, 'Webhook with a forged signature', await wh('a'.repeat(64)), (e) => ({ code: e.code }));

const ask = await request(appFor('admissionAdmin', admin)).post('/refunds').send({ paymentId: String(order.paymentId), amountPaise: 500000, reason: 'Student withdrew' });
show(9, 'Admission Admin requests a refund of Rs 5000', ask, (d) => ({ status: d.status, amountPaise: d.amountPaise }));
const refundId = ask.body.data._id;
const own = await request(appFor('admissionAdmin', admin)).post(`/refunds/${refundId}/decision`).send({ approve: true });
show(10, 'Admission Admin tries to approve it himself', own, (e) => ({ message: e.message }));
const appr = await request(appFor('superAdmin', boss)).post(`/refunds/${refundId}/decision`).send({ approve: true, note: 'ok' });
show(11, 'Super Admin approves: money goes back through the gateway', appr, (d) => ({ status: d.status, gatewayRefundId: d.gatewayRefundId.slice(0, 14) + '...' }));

console.log('\nAudit rows written during this demo (this is what Step 1 shows to the Super Admin):');
for (const a of audits) {
  const role = a.actorUserId ? (String(a.actorUserId) === String(applicant) ? 'applicant' : String(a.actorUserId) === String(admin) ? 'admissionAdmin' : 'superAdmin') : '(no user)';
  console.log(`   ${a.action.padEnd(26)} ${String(a.entityType).padEnd(8)} ${a.outcome.padEnd(8)} ${role}`);
}

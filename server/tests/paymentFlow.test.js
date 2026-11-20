import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import crypto from 'crypto';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import Payment from '../src/models/Payment.js';
import Refund from '../src/models/Refund.js';
import ExamForm from '../src/models/ExamForm.js';
import Exam from '../src/models/Exam.js';
import Student from '../src/models/Student.js';
import Application from '../src/models/Application.js';
import FeeStructure from '../src/models/FeeStructure.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Counter from '../src/models/Counter.js';
import User from '../src/models/User.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { setGatewayForTests, buildGateway } from '../src/services/payment/index.js';
import { createFakeGateway } from '../src/services/payment/fakeGateway.js';
import { createRazorpayGateway } from '../src/services/payment/razorpayGateway.js';
import paymentsRoutes from '../src/modules/payments/payments.routes.js';
import refundsRoutes from '../src/modules/payments/refunds.routes.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const id = () => new mongoose.Types.ObjectId();
const copy = (o) => (o ? { ...o } : null);

// ---------- a tiny in-memory stand-in for MongoDB (the same idea as tests/payments.test.js) ----------
// The REAL Payment.markPaid / Refund.request / Refund.decide / ExamForm.markPaid code runs on top of it.
const q = (value) => ({ then: (a, b) => Promise.resolve(value).then(a, b), session: () => q(value), select: () => q(value), lean: () => q(value) });
const cursor = (rows) => {
  const c = {
    sort: () => c, lean: () => c, skip: (n) => { c.s = n; return c; }, limit: (n) => { c.l = n; return c; },
    then: (a, b) => { let r = rows; if (c.s) r = r.slice(c.s); if (c.l) r = r.slice(0, c.l); return Promise.resolve(r).then(a, b); },
  };
  return c;
};
const matches = (row, filter) => Object.entries(filter).every(([k, v]) => String(row[k]) === String(v));

let audits; let payments; let refunds; let forms; let apps; let students; let fees; let exams; let counter; let gateway;

function wireFakes() {
  clearPermissionCache();
  audits = []; payments = {}; refunds = {}; forms = {}; apps = {}; students = {}; fees = []; exams = {}; counter = 0;
  gateway = createFakeGateway();
  setGatewayForTests(gateway);
  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async (entry) => { audits.push(entry); return entry; };

  Payment.findById = (pid) => q(copy(payments[pid]));
  Payment.find = (filter) => cursor(Object.values(payments).filter((p) => matches(p, filter)).map(copy));
  Payment.findOne = (filter) => q(copy(Object.values(payments).find((p) => matches(p, filter))));
  Payment.countDocuments = async (filter) => Object.values(payments).filter((p) => matches(p, filter)).length;
  Payment.create = async (doc) => {
    const row = { status: 'created', isTestMode: true, reservedRefundPaise: 0, createdAt: new Date(), ...doc };
    payments[String(row._id)] = row;
    return copy(row);
  };
  Payment.findOneAndUpdate = async (filter, update) => {
    const p = payments[String(filter._id)];
    if (!p) return null;
    if (filter.status && p.status !== filter.status) return null;
    if (filter.receiptNumber && filter.receiptNumber.$exists === false && p.receiptNumber) return null;
    if (filter.$expr && !(p.reservedRefundPaise + update.$inc.reservedRefundPaise <= p.amountPaise)) return null;
    if (update.$set) Object.assign(p, update.$set);
    if (update.$inc) Object.entries(update.$inc).forEach(([k, v]) => { p[k] = (p[k] || 0) + v; });
    return copy(p);
  };
  Payment.updateOne = async (filter, update) => {
    const p = payments[String(filter._id)];
    if (!p) return;
    if (update.$inc) Object.entries(update.$inc).forEach(([k, v]) => { p[k] += v; });
    if (update.$addToSet) Object.entries(update.$addToSet).forEach(([k, v]) => {
      p[k] = p[k] || [];
      if (!p[k].includes(v)) p[k].push(v);
    });
  };
  AcademicYear.findById = () => q({ label: '2026-27' });
  Counter.next = async () => { counter += 1; return counter; };
  User.findById = () => q({ fullName: 'Riya Patil' });

  Refund.findById = (rid) => q(copy(refunds[rid]));
  Refund.find = (filter) => cursor(Object.values(refunds).filter((r) => matches(r, filter)).map(copy));
  Refund.countDocuments = async (filter) => Object.values(refunds).filter((r) => matches(r, filter)).length;
  Refund.create = async ([doc]) => { const r = { _id: id(), status: 'requested', createdAt: new Date(), ...doc }; refunds[String(r._id)] = r; return [copy(r)]; };
  Refund.findOneAndUpdate = async (filter, update) => {
    const r = refunds[String(filter._id)];
    if (!r || (filter.status && r.status !== filter.status)) return null;
    Object.assign(r, update.$set);
    return copy(r);
  };

  Application.findById = (aid) => q(apps[aid] ? Application.hydrate(copy(apps[aid])) : null);
  Application.findOneAndUpdate = async (filter, update) => {
    const a = apps[String(filter._id)];
    if (!a) return null;
    const allowed = filter.status && (filter.status.$in || [filter.status]);
    if (allowed && !allowed.includes(a.status)) return null;
    if (update.$set) Object.assign(a, update.$set);
    if (update.$unset) Object.keys(update.$unset).forEach((k) => { delete a[k]; });
    return Application.hydrate(copy(a));
  };
  Student.findById = (sid) => q(copy(students[sid]));
  Exam.findById = (eid) => q(exams[eid] ? { ...exams[eid], isOpen: () => exams[eid].open } : null);
  FeeStructure.findOne = (filter) => q(copy(fees.find((f) => matches(f, filter))));
  ExamForm.findById = (fid) => q(forms[fid] ? ExamForm.hydrate(copy(forms[fid])) : null);
  ExamForm.findOneAndUpdate = async (filter, update) => {
    const f = forms[String(filter._id)];
    if (!f || (filter.status && f.status !== filter.status)) return null;
    Object.assign(f, update.$set);
    return ExamForm.hydrate(copy(f));
  };
}

// ---------- test data ----------
const YEAR = id(); const PROGRAM = id();
const applicantA = id(); const applicantB = id(); const studentUser = id(); const otherStudentUser = id();
const adminUser = id(); const examAdminUser = id(); const superUser = id();

const addFee = (over = {}) => { const f = { _id: id(), purpose: 'admission', academicYearId: YEAR, programId: PROGRAM, feesCategory: 'PAYING', amountPaise: 1200000, isActive: true, ...over }; fees.push(f); return f; };
const addApp = (over = {}) => {
  const fee = fees[fees.length - 1];
  const a = {
    _id: id(), applicantUserId: applicantA, academicYearId: YEAR, programId: PROGRAM, feesCategory: 'PAYING', status: 'approved',
    ...(fee ? { feeStructureId: fee._id, feeAmountPaise: fee.amountPaise } : {}), ...over,
  };
  apps[a._id] = a;
  return a;
};
const addExamSetup = ({ userId = studentUser, formStatus = 'pendingPayment', open = true, feeAmountPaise = 80000 } = {}) => {
  const exam = { _id: id(), academicYearId: YEAR, programId: PROGRAM, semester: 1, open }; exams[exam._id] = exam;
  const student = { _id: id(), userId }; students[student._id] = student;
  const fee = addFee({ purpose: 'exam', amountPaise: feeAmountPaise });
  const form = { _id: id(), examId: exam._id, studentId: student._id, status: formStatus, feeStructureId: fee._id, feeAmountPaise, subjects: [], details: {} };
  forms[form._id] = form;
  return { exam, student, form };
};
const addPayment = (over = {}) => {
  const p = { _id: id(), purpose: 'admission', payerUserId: applicantA, academicYearId: YEAR, feeStructureId: id(), applicationId: id(), amountPaise: 1200000, reservedRefundPaise: 0, failedAttempts: 0, status: 'created', gateway: 'fake', gatewayOrderId: `order_fake_${id()}`, isTestMode: true, gatewayEventIds: [], createdAt: new Date(), ...over };
  payments[String(p._id)] = p;
  if (p.purpose === 'admission' && p.applicationId && !apps[String(p.applicationId)]) {
    apps[String(p.applicationId)] = {
      _id: p.applicationId, applicantUserId: p.payerUserId, academicYearId: YEAR, programId: PROGRAM,
      feesCategory: 'PAYING', status: 'approved', feeStructureId: p.feeStructureId, feeAmountPaise: p.amountPaise,
    };
  }
  return p;
};
const paidPayment = (over = {}) => addPayment({ status: 'paid', gatewayPaymentId: `pay_fake_${id()}`, receiptNumber: 'RCT-2026-27-000099', paidAt: new Date(), ...over });

function appWith(user) {
  const app = express();
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use('/payments', paymentsRoutes);
  app.use('/refunds', refundsRoutes);
  app.use(errorHandler);
  return app;
}
const as = (role, uid) => appWith({ id: String(uid || id()), role, departmentId: null });
const lastAudit = (action) => [...audits].reverse().find((a) => a.action === action);

let errorSpy;
beforeEach(() => { wireFakes(); errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); }); // 502 tests log on purpose
afterEach(() => errorSpy.mockRestore());
afterAll(() => setGatewayForTests(null));

// =====================================================================================
describe('gateway layer', () => {
  test('fake gateway: makes an order and checks signatures (a wrong or short one is refused)', async () => {
    const g = createFakeGateway();
    const order = await g.createOrder({ amountPaise: 5000, receipt: 'pay_1' });
    expect(order).toMatchObject({ amountPaise: 5000, currency: 'INR', receipt: 'pay_1' });
    expect(order.gatewayOrderId).toMatch(/^order_fake_/);
    const sig = g.sign(order.gatewayOrderId, 'pay_x');
    expect(g.verifyPaymentSignature({ orderId: order.gatewayOrderId, paymentId: 'pay_x', signature: sig })).toBe(true);
    expect(g.verifyPaymentSignature({ orderId: order.gatewayOrderId, paymentId: 'pay_y', signature: sig })).toBe(false);
    expect(g.verifyPaymentSignature({ orderId: order.gatewayOrderId, paymentId: 'pay_x', signature: 'abc' })).toBe(false);
    expect(g.verifyPaymentSignature({ orderId: 'o', paymentId: 'p', signature: undefined })).toBe(false);
  });

  test('razorpay gateway: sends the order to the Orders API with Basic auth and the amount in paise', async () => {
    const calls = [];
    const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ id: 'order_R1', amount: 5000, currency: 'INR', receipt: 'pay_1' }) }; };
    const g = createRazorpayGateway({ keyId: 'rzp_test_abc', keySecret: 'sec', webhookSecret: 'wh' }, fakeFetch);
    const order = await g.createOrder({ amountPaise: 5000, receipt: 'pay_1', notes: { a: 1 } });
    expect(order).toEqual({ gatewayOrderId: 'order_R1', amountPaise: 5000, currency: 'INR', receipt: 'pay_1' });
    expect(calls[0].url).toBe('https://api.razorpay.com/v1/orders');
    expect(calls[0].init.headers.Authorization).toBe(`Basic ${Buffer.from('rzp_test_abc:sec').toString('base64')}`);
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ amount: 5000, currency: 'INR', receipt: 'pay_1' });
    expect(g.publicKeyId).toBe('rzp_test_abc');
  });

  test('razorpay gateway: lists the payments of an order with a GET and no body', async () => {
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ items: [{ id: 'pay_R1', status: 'captured', amount: 5000 }] }) };
    };
    const g = createRazorpayGateway({ keyId: 'rzp_test_abc', keySecret: 'sec', webhookSecret: 'wh' }, fakeFetch);
    const items = await g.listOrderPayments('order_R1');
    expect(items).toEqual([{ id: 'pay_R1', status: 'captured', amount: 5000 }]);
    expect(calls[0].url).toBe('https://api.razorpay.com/v1/orders/order_R1/payments');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].init.body).toBeUndefined();
  });

  test('razorpay gateway: a refused request and an unreachable gateway both become 502', async () => {
    const refused = createRazorpayGateway({ keyId: 'k', keySecret: 's', webhookSecret: 'w' }, async () => ({ ok: false, status: 400, json: async () => ({ error: { description: 'Bad amount' } }) }));
    await expect(refused.createOrder({ amountPaise: 1, receipt: 'r' })).rejects.toMatchObject({ statusCode: 502, code: 'GATEWAY_ERROR' });
    const down = createRazorpayGateway({ keyId: 'k', keySecret: 's', webhookSecret: 'w' }, async () => { throw new Error('offline'); });
    await expect(down.createOrder({ amountPaise: 1, receipt: 'r' })).rejects.toMatchObject({ statusCode: 502, code: 'GATEWAY_UNREACHABLE' });
  });

  test('razorpay gateway: payment signature uses the KEY secret, webhook signature uses the WEBHOOK secret', () => {
    const g = createRazorpayGateway({ keyId: 'k', keySecret: 'KEYSECRET', webhookSecret: 'HOOKSECRET' });
    const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');
    expect(g.verifyPaymentSignature({ orderId: 'o1', paymentId: 'p1', signature: hmac('KEYSECRET', 'o1|p1') })).toBe(true);
    expect(g.verifyPaymentSignature({ orderId: 'o1', paymentId: 'p1', signature: hmac('HOOKSECRET', 'o1|p1') })).toBe(false);
    expect(g.verifyWebhookSignature(Buffer.from('{"a":1}'), hmac('HOOKSECRET', '{"a":1}'))).toBe(true);
    expect(g.verifyWebhookSignature(Buffer.from('{"a":1}'), hmac('KEYSECRET', '{"a":1}'))).toBe(false);
    expect(g.verifyWebhookSignature(Buffer.from('{"a":2}'), hmac('HOOKSECRET', '{"a":1}'))).toBe(false);
  });

  test('buildGateway refuses a bad setup at start-up', () => {
    expect(() => buildGateway({ gateway: 'razorpay', keyId: '', keySecret: '', webhookSecret: '' }))
      .toThrow(/PAYMENT_KEY_ID, PAYMENT_KEY_SECRET, PAYMENT_WEBHOOK_SECRET/);
    expect(() => buildGateway({ gateway: 'razorpay', keyId: 'rzp_live_x', keySecret: 's', webhookSecret: 'w' }))
      .toThrow(/PAYMENT_KEY_ID must start with rzp_test_/);
    expect(() => buildGateway({ gateway: 'paypal' })).toThrow(/PAYMENT_GATEWAY must be one of: fake, razorpay/);
    expect(() => buildGateway({ gateway: 'fake' }, 'production'))
      .toThrow(/PAYMENT_GATEWAY=fake is not allowed when NODE_ENV=production/);
    expect(buildGateway({ gateway: 'razorpay', keyId: 'rzp_test_x', keySecret: 's', webhookSecret: 'w' }).name).toBe('razorpay');
    expect(buildGateway({ gateway: 'fake' }).name).toBe('fake');
  });
});

// =====================================================================================
describe('POST /payments/orders: who may call it and what is checked', () => {
  test('401 when nobody is signed in', async () => {
    expect((await request(appWith(null)).post('/payments/orders').send({ purpose: 'admission' })).status).toBe(401);
  });

  test.each([
    ['no purpose', 'applicant', {}],
    ['unknown purpose', 'applicant', { purpose: 'library' }],
    ['admission without applicationId', 'applicant', { purpose: 'admission' }],
    ['exam without examFormId', 'student', { purpose: 'exam' }],
    ['applicationId that is not an id', 'applicant', { purpose: 'admission', applicationId: '123' }],
    ['an amount sent by the browser', 'applicant', { purpose: 'admission', applicationId: String(id()), amountPaise: 1 }],
  ])('400 for %s', async (_n, role, body) => {
    const res = await request(as(role)).post('/payments/orders').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(payments)).toHaveLength(0);
  });

  test.each([
    ['teacher', 'admission'], ['hod', 'admission'], ['admissionAdmin', 'admission'], ['superAdmin', 'admission'],
    ['applicant', 'exam'], ['teacher', 'exam'], ['examAdmin', 'exam'], ['superAdmin', 'exam'],
  ])('403 for %s creating a %s order, and the attempt is logged', async (role, purpose) => {
    const res = await request(as(role)).post('/payments/orders').send({ purpose, [purpose === 'admission' ? 'applicationId' : 'examFormId']: String(id()) });
    expect(res.status).toBe(403);
    expect(lastAudit('permissionDenied')).toMatchObject({ outcome: 'denied' });
    expect(Object.keys(payments)).toHaveLength(0);
  });
});

describe('POST /payments/orders: admission fee', () => {
  const order = (app, applicationId) => request(app).post('/payments/orders').send({ purpose: 'admission', applicationId: String(applicationId) });

  test('creates the order; the amount is the fee on the server; an audit row is written', async () => {
    const fee = addFee({ amountPaise: 1200000 }); const a = addApp();
    const res = await order(as('applicant', applicantA), a._id);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ purpose: 'admission', status: 'created', amountPaise: 1200000, currency: 'INR', gateway: 'fake', keyId: null, isTestMode: true });
    expect(res.body.data.gatewayOrderId).toMatch(/^order_fake_/);
    expect(res.body.meta.reused).toBe(false);
    const saved = payments[res.body.data.paymentId];
    expect(saved).toMatchObject({ applicationId: a._id, feeStructureId: fee._id, payerUserId: String(applicantA) });
    expect(lastAudit('paymentOrderCreated')).toMatchObject({
      entityType: 'payment', outcome: 'success', actorUserId: String(applicantA),
      details: { purpose: 'admission', amountPaise: 1200000, gatewayOrderId: res.body.data.gatewayOrderId },
    });
  });

  test('a student (after admission) may pay too, and an approved application is payable', async () => {
    addFee(); const a = addApp();
    expect((await order(as('student', applicantA), a._id)).status).toBe(201);
  });

  test("someone else's application looks like it does not exist (404)", async () => {
    addFee(); const a = addApp();
    expect((await order(as('applicant', applicantB), a._id)).status).toBe(404);
    expect((await order(as('applicant', applicantA), id())).status).toBe(404);
  });

  test.each(['draft', 'submitted', 'returned', 'waitlisted', 'rejected', 'feePaid', 'admitted', 'cancelled'])('409 while the application is %s', async (status) => {
    addFee(); const a = addApp({ status });
    const res = await order(as('applicant', applicantA), a._id);
    expect(res.status).toBe(409);
    expect(Object.keys(payments)).toHaveLength(0);
  });

  test('409 when no fee is set, and when the fee is zero', async () => {
    const a = addApp();
    expect((await order(as('applicant', applicantA), a._id)).status).toBe(409);
    addFee({ amountPaise: 0 });
    const free = addApp();
    const res = await order(as('applicant', applicantA), free._id);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/zero/);
  });

  test('pressing Pay twice gives the SAME order, not a second one', async () => {
    addFee(); const a = addApp(); const app = as('applicant', applicantA);
    const first = await order(app, a._id);
    const second = await order(app, a._id);
    expect(second.status).toBe(200);
    expect(second.body.meta.reused).toBe(true);
    expect(second.body.data.gatewayOrderId).toBe(first.body.data.gatewayOrderId);
    expect(Object.keys(payments)).toHaveLength(1);
  });

  test('if the fixed fee changed, the old waiting order is closed and a new one is made', async () => {
    addFee({ amountPaise: 1000000 }); const a = addApp(); const app = as('applicant', applicantA);
    const first = await order(app, a._id);
    a.feeAmountPaise = 1500000;
    const second = await order(app, a._id);
    expect(second.status).toBe(201);
    expect(second.body.data.amountPaise).toBe(1500000);
    expect(payments[first.body.data.paymentId]).toMatchObject({ status: 'failed' });
  });

  test('409 when the fee is already paid', async () => {
    addFee(); const a = addApp(); paidPayment({ applicationId: a._id });
    const res = await order(as('applicant', applicantA), a._id);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already paid/);
  });

  test('if the gateway fails: 502, nothing is saved, and the failure is logged', async () => {
    addFee(); const a = addApp();
    gateway.createOrder = async () => { throw Object.assign(new Error('The payment gateway could not be reached'), { statusCode: 502 }); };
    const res = await order(as('applicant', applicantA), a._id);
    expect(res.status).toBe(502);
    expect(Object.keys(payments)).toHaveLength(0);
    expect(lastAudit('paymentOrderCreated')).toMatchObject({ outcome: 'failed' });
  });

  test('a failing audit write does not stop the order', async () => {
    addFee(); const a = addApp();
    AuditLog.record = async () => { throw new Error('db down'); };
    expect((await order(as('applicant', applicantA), a._id)).status).toBe(201);
    expect(errorSpy).toHaveBeenCalled(); // auditSafe printed the failure on the server
  });
});

describe('POST /payments/orders: exam fee', () => {
  const order = (app, examFormId) => request(app).post('/payments/orders').send({ purpose: 'exam', examFormId: String(examFormId) });

  test('uses the fee fixed on the exam form', async () => {
    const { form } = addExamSetup({ feeAmountPaise: 80000 });
    const res = await order(as('student', studentUser), form._id);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ purpose: 'exam', amountPaise: 80000, status: 'created' });
    expect(payments[res.body.data.paymentId]).toMatchObject({ examFormId: form._id, feeStructureId: form.feeStructureId });
  });

  test("another student's form is 404", async () => {
    const { form } = addExamSetup();
    expect((await order(as('student', otherStudentUser), form._id)).status).toBe(404);
  });

  test.each(['draft', 'submitted', 'approved'])('409 when the form is %s (not waiting for payment)', async (formStatus) => {
    const { form } = addExamSetup({ formStatus });
    expect((await order(as('student', studentUser), form._id)).status).toBe(409);
  });

  test('409 when the exam form window has closed', async () => {
    const { form } = addExamSetup({ open: false });
    const res = await order(as('student', studentUser), form._id);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/not open/);
  });
});

// =====================================================================================
describe('POST /payments/:id/verify (browser says "I paid")', () => {
  const makeOrder = async () => {
    addFee(); const a = addApp();
    const res = await request(as('applicant', applicantA)).post('/payments/orders').send({ purpose: 'admission', applicationId: String(a._id) });
    return res.body.data;
  };
  const verify = (app, paymentId, body) => request(app).post(`/payments/${paymentId}/verify`).send(body);
  const goodBody = (o, payId = 'pay_fake_1') => ({ gatewayPaymentId: payId, signature: gateway.sign(o.gatewayOrderId, payId) });

  test('a correct signature marks it paid and gives a receipt number; an audit row is written', async () => {
    const o = await makeOrder();
    const res = await verify(as('applicant', applicantA), o.paymentId, goodBody(o));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'paid', receiptNumber: 'RCT-2026-27-000001' });
    expect(res.body.meta.alreadyPaid).toBe(false);
    expect(payments[o.paymentId]).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_fake_1', confirmedVia: 'checkout' });
    expect(payments[o.paymentId].signatureVerifiedAt).toBeInstanceOf(Date);
    expect(lastAudit('paymentVerified')).toMatchObject({ outcome: 'success', details: { source: 'browser', amountPaise: 1200000 } });
  });

  test('verifying twice changes nothing and burns no receipt number', async () => {
    const o = await makeOrder(); const app = as('applicant', applicantA);
    await verify(app, o.paymentId, goodBody(o));
    const again = await verify(app, o.paymentId, goodBody(o));
    expect(again.status).toBe(200);
    expect(again.body.meta.alreadyPaid).toBe(true);
    expect(again.body.data.receiptNumber).toBe('RCT-2026-27-000001');
    expect(counter).toBe(1);
    expect(audits.filter((a) => a.action === 'paymentVerified')).toHaveLength(1);
  });

  test('a wrong signature is refused (400), the payment stays unpaid, and it is logged', async () => {
    const o = await makeOrder();
    const res = await verify(as('applicant', applicantA), o.paymentId, { gatewayPaymentId: 'pay_fake_1', signature: 'f'.repeat(64) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_SIGNATURE_INVALID');
    expect(payments[o.paymentId].status).toBe('created');
    expect(lastAudit('paymentVerificationFailed')).toMatchObject({ outcome: 'failed' });
  });

  test('a signature made for a different payment id does not work', async () => {
    const o = await makeOrder();
    const res = await verify(as('applicant', applicantA), o.paymentId, { gatewayPaymentId: 'pay_fake_2', signature: gateway.sign(o.gatewayOrderId, 'pay_fake_1') });
    expect(res.status).toBe(400);
    expect(payments[o.paymentId].status).toBe('created');
  });

  test('a valid signature of ANOTHER order cannot pay this one (the order id comes from our database)', async () => {
    const o = await makeOrder();
    const res = await verify(as('applicant', applicantA), o.paymentId, { gatewayPaymentId: 'pay_fake_1', signature: gateway.sign('order_fake_someone_else', 'pay_fake_1') });
    expect(res.status).toBe(400);
  });

  test("someone else's payment is 404, and missing fields are 400", async () => {
    const o = await makeOrder();
    expect((await verify(as('applicant', applicantB), o.paymentId, goodBody(o))).status).toBe(404);
    const bad = await verify(as('applicant', applicantA), o.paymentId, { signature: 'x' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.errors[0].field).toBe('gatewayPaymentId');
  });

  test('an admin who may only VIEW payments cannot verify one (403); unknown id is 404', async () => {
    const o = await makeOrder();
    expect((await verify(as('admissionAdmin'), o.paymentId, goodBody(o))).status).toBe(403);
    expect((await verify(as('applicant', applicantA), id(), goodBody(o))).status).toBe(404);
  });

  test('a failed payment cannot be completed (409)', async () => {
    const o = await makeOrder();
    payments[o.paymentId].status = 'failed';
    expect((await verify(as('applicant', applicantA), o.paymentId, goodBody(o))).status).toBe(409);
  });

  test('an already paid payment cannot be "paid again" with a different gateway payment (409)', async () => {
    const o = await makeOrder(); const app = as('applicant', applicantA);
    await verify(app, o.paymentId, goodBody(o, 'pay_fake_1'));
    expect((await verify(app, o.paymentId, goodBody(o, 'pay_fake_2'))).status).toBe(409);
  });

  test('admission payment: the application becomes "feePaid" and starts the hard copy window', async () => {
    addFee(); const a = addApp();
    const app = as('applicant', applicantA);
    const o = (await request(app).post('/payments/orders').send({ purpose: 'admission', applicationId: String(a._id) })).body.data;
    const res = await verify(app, o.paymentId, goodBody(o));
    expect(res.status).toBe(200);
    expect(apps[a._id]).toMatchObject({ status: 'feePaid', paymentId: expect.anything() });
    expect(String(apps[a._id].paymentId)).toBe(String(o.paymentId));
    expect(apps[a._id].feePaidAt).toBeInstanceOf(Date);
    expect(apps[a._id].hardCopyDueAt).toBeInstanceOf(Date);
  });

  test('admission payment: verifying twice does not move the application twice', async () => {
    addFee(); const a = addApp();
    const app = as('applicant', applicantA);
    const o = (await request(app).post('/payments/orders').send({ purpose: 'admission', applicationId: String(a._id) })).body.data;
    expect((await verify(app, o.paymentId, goodBody(o))).status).toBe(200);
    expect((await verify(app, o.paymentId, goodBody(o))).status).toBe(200);
    expect(apps[a._id].status).toBe('feePaid');
  });

  test('admission payment: if the application cannot be updated, the money stays recorded and the problem is logged', async () => {
    addFee(); const a = addApp();
    const app = as('applicant', applicantA);
    const o = (await request(app).post('/payments/orders').send({ purpose: 'admission', applicationId: String(a._id) })).body.data;
    a.status = 'cancelled';
    const res = await verify(app, o.paymentId, goodBody(o));
    expect(res.status).toBe(409);
    expect(payments[o.paymentId].status).toBe('paid');
    expect(lastAudit('paymentVerified')).toMatchObject({ outcome: 'failed' });
  });

  test('exam payment: the exam form becomes "submitted" and remembers the payment', async () => {
    const { form } = addExamSetup({ feeAmountPaise: 80000 });
    const app = as('student', studentUser);
    const o = (await request(app).post('/payments/orders').send({ purpose: 'exam', examFormId: String(form._id) })).body.data;
    const res = await verify(app, o.paymentId, goodBody(o));
    expect(res.status).toBe(200);
    expect(forms[form._id]).toMatchObject({ status: 'submitted', paymentId: expect.anything() });
    expect(String(forms[form._id].paymentId)).toBe(String(o.paymentId));
  });

  test('exam payment: if the form cannot be updated, the money stays recorded and the problem is logged', async () => {
    const { form } = addExamSetup();
    const app = as('student', studentUser);
    const o = (await request(app).post('/payments/orders').send({ purpose: 'exam', examFormId: String(form._id) })).body.data;
    forms[form._id].status = 'draft'; // something changed the form in between
    const res = await verify(app, o.paymentId, goodBody(o));
    expect(res.status).toBe(409);
    expect(payments[o.paymentId].status).toBe('paid');
    expect(lastAudit('paymentVerified')).toMatchObject({ outcome: 'failed' });
  });
});

// =====================================================================================
describe('viewing payments and receipts', () => {
  test('GET /payments/:id: the owner sees it; another applicant gets 404; the admission admin sees any', async () => {
    const p = addPayment();
    expect((await request(as('applicant', applicantA)).get(`/payments/${p._id}`)).status).toBe(200);
    expect((await request(as('applicant', applicantB)).get(`/payments/${p._id}`)).status).toBe(404);
    const admin = await request(as('admissionAdmin', adminUser)).get(`/payments/${p._id}`);
    expect(admin.status).toBe(200);
    expect(admin.body.data).toMatchObject({ _id: String(p._id), status: 'created' });
  });

  test('the exam admin cannot see an ADMISSION payment (403)', async () => {
    const p = addPayment();
    expect((await request(as('examAdmin', examAdminUser)).get(`/payments/${p._id}`)).status).toBe(403);
  });

  test('receipt: not before payment (409); after payment it has the number, amount, payer and year', async () => {
    const unpaid = addPayment();
    expect((await request(as('applicant', applicantA)).get(`/payments/${unpaid._id}/receipt`)).status).toBe(409);
    const paid = paidPayment({ receiptNumber: 'RCT-2026-27-000007' });
    const res = await request(as('applicant', applicantA)).get(`/payments/${paid._id}/receipt`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ receiptNumber: 'RCT-2026-27-000007', amountPaise: 1200000, currency: 'INR', academicYear: '2026-27', payerName: 'Riya Patil', purpose: 'admission' });
  });

  test('receipt: format=pdf returns a downloadable sample receipt', async () => {
    const paid = paidPayment({ receiptNumber: 'RCT-2026-27-000008' });
    const res = await request(as('applicant', applicantA)).get(`/payments/${paid._id}/receipt?format=pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/receipt-RCT-2026-27-000008-\d{4}-\d{2}-\d{2}\.pdf/);
    expect(res.body.toString('latin1')).toContain('RCT-2026-27-000008');
  });

  test('receipt: a paid payment that has no number yet gets one (repair)', async () => {
    const paid = paidPayment({ receiptNumber: undefined });
    const res = await request(as('applicant', applicantA)).get(`/payments/${paid._id}/receipt`);
    expect(res.status).toBe(200);
    expect(res.body.data.receiptNumber).toBe('RCT-2026-27-000001');
  });

  test('list: an applicant sees only their own, the admission admin sees all, purpose is required', async () => {
    addPayment({ payerUserId: applicantA }); addPayment({ payerUserId: applicantB }); addPayment({ payerUserId: applicantB, status: 'paid' });
    const mine = await request(as('applicant', applicantA)).get('/payments?purpose=admission');
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.meta).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    const all = await request(as('admissionAdmin', adminUser)).get('/payments?purpose=admission');
    expect(all.body.meta.total).toBe(3);
    const paidOnly = await request(as('admissionAdmin', adminUser)).get('/payments?purpose=admission&status=paid');
    expect(paidOnly.body.meta.total).toBe(1);
    expect((await request(as('applicant', applicantA)).get('/payments')).status).toBe(400);
    expect((await request(as('applicant', applicantA)).get('/payments?purpose=admission&limit=500')).status).toBe(400);
    expect((await request(as('examAdmin', examAdminUser)).get('/payments?purpose=admission')).status).toBe(403);
  });
});

// =====================================================================================
describe('POST /payments/webhook (the gateway calls us)', () => {
  const eventFor = (p, over = {}, name = 'payment.captured') => ({
    event: name, payload: { payment: { entity: { id: 'pay_fake_77', order_id: p.gatewayOrderId, amount: p.amountPaise, status: 'captured', ...over } } },
  });
  const hook = (event, { signature, raw } = {}) => {
    const body = raw !== undefined ? raw : JSON.stringify(event);
    const sig = signature !== undefined ? signature : gateway.signWebhook(body);
    const r = request(appWith(null)).post('/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-event-id', 'evt_1');
    return (sig === null ? r : r.set('x-razorpay-signature', sig)).send(body);
  };

  test('no sign-in is needed, but a wrong or missing signature is refused (400) and logged', async () => {
    const p = addPayment();
    const wrong = await hook(eventFor(p), { signature: 'e'.repeat(64) });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    expect((await hook(eventFor(p), { signature: null })).status).toBe(400);
    expect(payments[String(p._id)].status).toBe('created');
    expect(lastAudit('paymentWebhookRejected')).toMatchObject({ outcome: 'denied', actorUserId: null });
  });

  test('a valid "captured" event marks the payment paid and gives the receipt', async () => {
    const p = addPayment();
    const res = await hook(eventFor(p));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ received: true, handled: true, duplicate: false });
    expect(payments[String(p._id)]).toMatchObject({ status: 'paid', gatewayPaymentId: 'pay_fake_77', confirmedVia: 'webhook', receiptNumber: 'RCT-2026-27-000001' });
    expect(lastAudit('paymentVerified')).toMatchObject({ actorUserId: null, details: { source: 'webhook' } });
    expect(lastAudit('paymentWebhookReceived')).toMatchObject({ details: { event: 'payment.captured', gatewayEventId: 'evt_1', handled: true } });
  });

  test('the same event delivered twice is safe: one receipt, answered 200 both times', async () => {
    const p = addPayment();
    await hook(eventFor(p));
    const again = await hook(eventFor(p));
    expect(again.status).toBe(200);
    expect(again.body.data).toMatchObject({ handled: false, duplicate: true });
    expect(counter).toBe(1);
    expect(audits.filter((a) => a.action === 'paymentVerified')).toHaveLength(1);
  });

  test('webhook and browser verification arriving together still give ONE receipt number', async () => {
    addFee(); const a = addApp(); const user = as('applicant', applicantA);
    const o = (await request(user).post('/payments/orders').send({ purpose: 'admission', applicationId: String(a._id) })).body.data;
    const ev = eventFor({ gatewayOrderId: o.gatewayOrderId, amountPaise: o.amountPaise }, { id: 'pay_fake_5' });
    const [h, v] = await Promise.all([
      hook(ev),
      request(user).post(`/payments/${o.paymentId}/verify`).send({ gatewayPaymentId: 'pay_fake_5', signature: gateway.sign(o.gatewayOrderId, 'pay_fake_5') }),
    ]);
    expect([h.status, v.status]).toEqual([200, 200]);
    expect(payments[o.paymentId]).toMatchObject({ status: 'paid', receiptNumber: expect.stringMatching(/^RCT-2026-27-/) });
    expect(v.body.data.receiptNumber).toBe(payments[o.paymentId].receiptNumber);
    expect(apps[a._id].status).toBe('feePaid');
  });

  test('the "order.paid" event works too, and an exam payment submits the exam form', async () => {
    const { form } = addExamSetup({ feeAmountPaise: 80000 });
    const o = (await request(as('student', studentUser)).post('/payments/orders').send({ purpose: 'exam', examFormId: String(form._id) })).body.data;
    const res = await hook(eventFor({ gatewayOrderId: o.gatewayOrderId, amountPaise: 80000 }, {}, 'order.paid'));
    expect(res.status).toBe(200);
    expect(forms[form._id].status).toBe('submitted');
  });

  test('an amount that does not match the order is refused and nothing is paid', async () => {
    const p = addPayment();
    const res = await hook(eventFor(p, { amount: 100 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEBHOOK_AMOUNT_MISMATCH');
    expect(payments[String(p._id)].status).toBe('created');
    expect(lastAudit('paymentWebhookRejected')).toMatchObject({ details: { expectedPaise: 1200000, gotPaise: 100 } });
  });

  test('an order we do not know is answered 200 (so the gateway stops retrying) and logged', async () => {
    const res = await hook(eventFor({ gatewayOrderId: 'order_unknown', amountPaise: 1 }));
    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(false);
    expect(lastAudit('paymentWebhookReceived')).toMatchObject({ outcome: 'failed', details: { reason: 'unknown order' } });
  });

  test('a failed ATTEMPT is only recorded: the order stays open so the payer can try again', async () => {
    const p = addPayment();
    const res = await hook(eventFor(p, { error_description: 'Card declined', error_code: 'BAD_REQUEST_ERROR', method: 'upi' }, 'payment.failed'));
    expect(res.status).toBe(200);
    expect(payments[String(p._id)]).toMatchObject({ status: 'created', failedAttempts: 1, gatewayErrorCode: 'BAD_REQUEST_ERROR', gatewayMethod: 'upi' });
    expect(lastAudit('paymentWebhookReceived')).toMatchObject({ details: { attemptFailed: true, reason: 'Card declined' } });
  });

  test('money for a payment we had already closed is not hidden: logged as failed for a person to check', async () => {
    const p = addPayment({ status: 'failed' });
    const res = await hook(eventFor(p));
    expect(res.status).toBe(200);
    expect(payments[String(p._id)].status).toBe('failed');
    expect(lastAudit('paymentWebhookReceived')).toMatchObject({ outcome: 'failed' });
  });

  test('a signed body that is not JSON is 400; an event without a payment is ignored', async () => {
    expect((await hook(null, { raw: 'not json' })).status).toBe(400);
    const res = await hook({ event: 'refund.processed', payload: {} });
    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(false);
  });
});

describe('the real app keeps the raw body for the webhook', () => {
  let app;
  beforeAll(async () => { app = (await import('../src/app.js')).default; });

  test('a correctly signed webhook gets through /api/v1', async () => {
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_none', amount: 1 } } } });
    const res = await request(app).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', gateway.signWebhook(raw)).send(raw);
    expect(res.status).toBe(200);
    expect(res.body.data.received).toBe(true);
  });

  test('the same body with a wrong signature is refused', async () => {
    const res = await request(app).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', 'a'.repeat(64)).send('{"event":"x"}');
    expect(res.status).toBe(400);
  });

  test('the payment routes are mounted and protected', async () => {
    expect((await request(app).post('/api/v1/payments/orders').send({})).status).toBe(401);
    expect((await request(app).post('/api/v1/refunds').send({})).status).toBe(401);
  });
});

// =====================================================================================
describe('refunds', () => {
  const ask = (app, paymentId, over = {}) => request(app).post('/refunds').send({ paymentId: String(paymentId), amountPaise: 500000, reason: 'Withdrew admission', ...over });
  const decide = (app, refundId, body) => request(app).post(`/refunds/${refundId}/decision`).send(body);

  test('the admission admin raises a refund on a paid admission payment: the amount is reserved and logged', async () => {
    const p = paidPayment();
    const res = await ask(as('admissionAdmin', adminUser), p._id);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'requested', purpose: 'admission', amountPaise: 500000, requestedByUserId: String(adminUser) });
    expect(payments[String(p._id)].reservedRefundPaise).toBe(500000);
    expect(lastAudit('refundRequested')).toMatchObject({ entityType: 'refund', outcome: 'success', details: { amountPaise: 500000, purpose: 'admission' } });
  });

  test('the exam admin raises refunds for EXAM payments only, the admission admin for ADMISSION only', async () => {
    const adm = paidPayment(); const exm = paidPayment({ purpose: 'exam', applicationId: undefined, examFormId: id(), amountPaise: 80000 });
    expect((await ask(as('examAdmin', examAdminUser), exm._id, { amountPaise: 80000 })).status).toBe(201);
    expect((await ask(as('examAdmin', examAdminUser), adm._id)).status).toBe(403);
    expect((await ask(as('admissionAdmin', adminUser), exm._id)).status).toBe(403);
  });

  test.each(['applicant', 'student', 'teacher', 'superAdmin'])('403 for %s raising a refund (only the two admins may)', async (role) => {
    const p = paidPayment();
    expect((await ask(as(role), p._id)).status).toBe(403);
    expect(payments[String(p._id)].reservedRefundPaise).toBe(0);
  });

  test('409 for an unpaid payment or more than is refundable; 404 for an unknown payment', async () => {
    const app = as('admissionAdmin', adminUser);
    expect((await ask(app, addPayment()._id)).status).toBe(409);
    const p = paidPayment();
    expect((await ask(app, p._id, { amountPaise: 1200001 })).status).toBe(409);
    expect(lastAudit('refundRequested')).toMatchObject({ outcome: 'failed' });
    expect((await ask(app, id())).status).toBe(404);
  });

  test('two refunds can never add up to more than was paid', async () => {
    const p = paidPayment(); const app = as('admissionAdmin', adminUser);
    expect((await ask(app, p._id, { amountPaise: 700000 })).status).toBe(201);
    expect((await ask(app, p._id, { amountPaise: 600000 })).status).toBe(409);
    expect((await ask(app, p._id, { amountPaise: 500000 })).status).toBe(201);
    expect(payments[String(p._id)].reservedRefundPaise).toBe(1200000);
  });

  test.each([
    ['zero amount', { amountPaise: 0 }], ['fraction of a paisa', { amountPaise: 10.5 }], ['amount as text', { amountPaise: '500' }],
    ['no reason', { reason: '' }], ['payment id that is not an id', { paymentId: '12' }],
  ])('400 for %s', async (_n, over) => {
    const p = paidPayment();
    const res = await request(as('admissionAdmin', adminUser)).post('/refunds').send({ paymentId: String(p._id), amountPaise: 500000, reason: 'ok reason', ...over });
    expect(res.status).toBe(400);
    expect(payments[String(p._id)].reservedRefundPaise).toBe(0);
  });

  test('the super admin approves: the gateway refund runs and its id goes in the audit log', async () => {
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    const res = await decide(as('superAdmin', superUser), r._id, { approve: true, note: 'ok' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'approved', decidedByUserId: String(superUser) });
    expect(res.body.data.gatewayRefundId).toMatch(/^rfnd_fake_/);
    expect(lastAudit('refundDecided')).toMatchObject({ outcome: 'success', details: { approved: true, amountPaise: 500000, gatewayRefundId: res.body.data.gatewayRefundId } });
    expect(payments[String(p._id)].reservedRefundPaise).toBe(500000); // still counted
  });

  test('the admins who raise refunds cannot approve them (403)', async () => {
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    expect((await decide(as('admissionAdmin', adminUser), r._id, { approve: true })).status).toBe(403);
    expect((await decide(as('examAdmin', examAdminUser), r._id, { approve: true })).status).toBe(403);
    expect(refunds[r._id].status).toBe('requested');
  });

  test('the person who raised a refund can never approve it, even if they had the permission', async () => {
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    refunds[r._id].requestedByUserId = superUser; // pretend the super admin raised it
    const res = await decide(as('superAdmin', superUser), r._id, { approve: true });
    expect(res.status).toBe(403);
    expect(lastAudit('refundDecided')).toMatchObject({ outcome: 'failed' });
  });

  test('rejecting needs a reason and frees the reserved amount; no gateway call is made', async () => {
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    let gatewayCalled = false; gateway.refund = async () => { gatewayCalled = true; };
    expect((await decide(as('superAdmin', superUser), r._id, { approve: false })).status).toBe(400);
    const res = await decide(as('superAdmin', superUser), r._id, { approve: false, note: 'Not eligible' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'rejected', gatewayRefundId: null });
    expect(payments[String(p._id)].reservedRefundPaise).toBe(0);
    expect(gatewayCalled).toBe(false);
  });

  test('a refund is decided only once (409)', async () => {
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    await decide(as('superAdmin', superUser), r._id, { approve: true });
    expect((await decide(as('superAdmin', superUser), r._id, { approve: false, note: 'x' })).status).toBe(409);
  });

  test('if the gateway fails after approval: the refund stays approved and the failure is logged', async () => {
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    gateway.refund = async () => { throw Object.assign(new Error('gateway down'), { statusCode: 502 }); };
    const res = await decide(as('superAdmin', superUser), r._id, { approve: true });
    expect(res.status).toBe(502);
    expect(refunds[r._id].status).toBe('approved');
    expect(lastAudit('refundDecided')).toMatchObject({ outcome: 'failed', details: { approved: true } });
  });

  test('404 for an unknown refund; 400 for a bad decision body', async () => {
    expect((await decide(as('superAdmin', superUser), id(), { approve: true })).status).toBe(404);
    const p = paidPayment(); const r = (await ask(as('admissionAdmin', adminUser), p._id)).body.data;
    expect((await decide(as('superAdmin', superUser), r._id, { approve: 'yes' })).status).toBe(400);
  });

  test('list: purpose is required; each admin sees their own kind; the super admin sees both', async () => {
    const adm = paidPayment(); const exm = paidPayment({ purpose: 'exam', applicationId: undefined, examFormId: id(), amountPaise: 80000 });
    await ask(as('admissionAdmin', adminUser), adm._id); await ask(as('examAdmin', examAdminUser), exm._id, { amountPaise: 80000 });
    const list = await request(as('admissionAdmin', adminUser)).get('/refunds?purpose=admission');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toMatchObject({ total: 1, page: 1 });
    expect((await request(as('admissionAdmin', adminUser)).get('/refunds?purpose=exam')).status).toBe(403);
    expect((await request(as('superAdmin', superUser)).get('/refunds?purpose=exam')).body.meta.total).toBe(1);
    expect((await request(as('admissionAdmin', adminUser)).get('/refunds')).status).toBe(400);
    expect((await request(as('applicant')).get('/refunds?purpose=admission')).status).toBe(403);
  });
});

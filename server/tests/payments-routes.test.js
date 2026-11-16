import { readFileSync } from 'fs';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import Payment from '../src/models/Payment.js';
import Application from '../src/models/Application.js';
import ExamForm from '../src/models/ExamForm.js';
import Student from '../src/models/Student.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import Counter from '../src/models/Counter.js';
import AcademicYear from '../src/models/AcademicYear.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import buildRouter from '../src/modules/payments/payments.routes.js';
const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

const KEYS = { keyId: 'rzp_test_KEY', keySecret: 'key_secret', webhookSecret: 'wh_secret' };
const id = () => String(new mongoose.Types.ObjectId());
const sign = (o, p, secret = KEYS.keySecret) => crypto.createHmac('sha256', secret).update(`${o}|${p}`).digest('hex');
const USER = id();
const OTHER = id();
const ADMIN = id();
const who = {
  applicant: { id: USER, role: 'applicant' }, other: { id: OTHER, role: 'applicant' }, student: { id: USER, role: 'student' },
  teacher: { id: USER, role: 'teacher' }, admissionAdmin: { id: ADMIN, role: 'admissionAdmin' },
};

let payments; let apps; let forms; let students; let logs; let fetchCalls; let seq;
const copy = (o) => (o ? Object.assign(Object.create(null), JSON.parse(JSON.stringify(o), (k, v) => (k.endsWith('At') && v ? new Date(v) : v))) : null);

function wire() {
  payments = {}; apps = {}; forms = {}; students = {}; logs = []; fetchCalls = []; seq = 0;
  clearPermissionCache();
  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async () => {};
  Counter.next = async () => { seq += 1; return seq; };
  AcademicYear.findById = () => ({ session: async () => ({ label: '2026-27' }) });

  const run = (fn) => { const f = async () => fn(); return { session: f, then: (a, b) => f().then(a, b) }; };
  Payment.findById = (pid) => run(() => copy(payments[pid]));
  Payment.findOne = (filter) => run(() => copy(Object.values(payments).find((p) => Object.entries(filter).every(([k, v]) => String(p[k]) === String(v))) || null));
  Payment.create = async (doc) => {
    const open = Object.values(payments).find((p) => p.status === 'created' && ((doc.applicationId && String(p.applicationId) === String(doc.applicationId)) || (doc.examFormId && String(p.examFormId) === String(doc.examFormId))));
    if (open) throw Object.assign(new Error('dup'), { code: 11000 });
    const p = { _id: id(), status: 'created', gateway: 'razorpay', currency: 'INR', failedAttempts: 0, gatewayEventIds: [], reservedRefundPaise: 0, ...doc };
    payments[p._id] = p;
    return copy(p);
  };
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
  Application.findById = async (aid) => {
    const a = apps[aid];
    if (!a) return null;
    return { ...a, markFeePaid: async (arg) => { a.status = 'feePaid'; a.paidWith = String(arg.paymentId); } };
  };
  ExamForm.findById = async (fid) => {
    const f = forms[fid];
    if (!f) return null;
    return { ...f, constructor: { db: { model: () => ({ findById: async () => ({ academicYearId: f.academicYearId }) }) } }, markPaid: async (pid) => { f.status = 'submitted'; f.paidWith = String(pid); } };
  };
  Student.findById = async (sid) => students[sid] || null;
}
beforeEach(wire);

import AppError from '../src/utils/AppError.js';

function mkApp(over = {}) {
  const a = { _id: id(), applicantUserId: USER, status: 'approved', feeAmountPaise: 925000, feeStructureId: id(), academicYearId: id(), feeDueAt: new Date(Date.now() + 86400000), ...over };
  apps[a._id] = a;
  return a;
}

function appFor(user, { fetchImpl } = {}) {
  const app = express();
  app.use('/api/v1/payments/webhook/razorpay', express.raw({ type: '*/*' })); // same order as app.js
  app.use(express.json());
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  const log = { error: (m) => logs.push(m) };
  const fetchStub = fetchImpl || (async (url, opts) => { fetchCalls.push(JSON.parse(opts.body)); return { ok: true, status: 200, json: async () => ({ id: `order_N${fetchCalls.length}`, amount: JSON.parse(opts.body).amount, currency: 'INR' }) }; });
  app.use('/api/v1/payments', buildRouter({ razorpay: KEYS, fetchImpl: fetchStub, log }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message })); // eslint-disable-line no-unused-vars
  return app;
}
const base = '/api/v1/payments';

describe('POST /admission/:id/checkout', () => {
  test('creates one payment and one Razorpay order for an approved application', async () => {
    const a = mkApp();
    const res = await request(appFor(who.applicant)).post(`${base}/admission/${a._id}/checkout`);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ keyId: 'rzp_test_KEY', orderId: 'order_N1', amountPaise: 925000, currency: 'INR', isTestMode: true });
    expect(JSON.stringify(res.body)).not.toContain(KEYS.keySecret);
    const p = Object.values(payments)[0];
    expect(p).toMatchObject({ purpose: 'admission', payerUserId: USER, amountPaise: 925000, status: 'created', gatewayOrderId: 'order_N1', isTestMode: true });
    expect(fetchCalls[0]).toMatchObject({ amount: 925000, currency: 'INR' });
  });
  test('pressing Pay again reuses the same payment and order', async () => {
    const a = mkApp();
    const app = appFor(who.applicant);
    const r1 = await request(app).post(`${base}/admission/${a._id}/checkout`);
    const r2 = await request(app).post(`${base}/admission/${a._id}/checkout`);
    expect(r2.body.data.paymentId).toBe(r1.body.data.paymentId);
    expect(r2.body.data.orderId).toBe(r1.body.data.orderId);
    expect(Object.keys(payments)).toHaveLength(1);
    expect(fetchCalls).toHaveLength(1);
  });
  test('when the fee has changed, the old open payment is closed and a new one is made', async () => {
    const a = mkApp();
    const app = appFor(who.applicant);
    await request(app).post(`${base}/admission/${a._id}/checkout`);
    a.feeAmountPaise = 500000;
    const res = await request(app).post(`${base}/admission/${a._id}/checkout`);
    expect(res.status).toBe(201);
    expect(res.body.data.amountPaise).toBe(500000);
    expect(Object.values(payments).map((p) => p.status).sort()).toEqual(['created', 'failed']);
  });
  test.each([
    ['someone else\'s application', { applicantUserId: OTHER }, 404],
    ['an application not waiting for payment', { status: 'submitted' }, 409],
    ['an already paid application', { status: 'feePaid' }, 409],
    ['a zero fee', { feeAmountPaise: 0 }, 409],
    ['a missed due date', { feeDueAt: new Date(Date.now() - 1000) }, 409],
  ])('refuses %s', async (_n, over, status) => {
    const a = mkApp(over);
    const res = await request(appFor(who.applicant)).post(`${base}/admission/${a._id}/checkout`);
    expect(res.status).toBe(status);
    expect(Object.keys(payments)).toHaveLength(0);
    expect(fetchCalls).toHaveLength(0);
  });
  test('an unknown application is 404, nobody signed in is 401, a teacher is 403', async () => {
    const a = mkApp();
    expect((await request(appFor(who.applicant)).post(`${base}/admission/${id()}/checkout`)).status).toBe(404);
    expect((await request(appFor(null)).post(`${base}/admission/${a._id}/checkout`)).status).toBe(401);
    expect((await request(appFor(who.teacher)).post(`${base}/admission/${a._id}/checkout`)).status).toBe(403);
  });
  test('a Razorpay failure is a 502 and leaves no order saved', async () => {
    const a = mkApp();
    const res = await request(appFor(who.applicant, { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) })).post(`${base}/admission/${a._id}/checkout`);
    expect(res.status).toBe(502);
    expect(Object.values(payments)[0].gatewayOrderId).toBeUndefined();
  });
});

describe('POST /exam/:id/checkout', () => {
  test('a student can pay their own exam form; another student cannot', async () => {
    const sid = id();
    students[sid] = { _id: sid, userId: USER };
    const f = { _id: id(), studentId: sid, examId: id(), status: 'pendingPayment', feeAmountPaise: 80000, feeStructureId: id(), academicYearId: id() };
    forms[f._id] = f;
    const res = await request(appFor(who.student)).post(`${base}/exam/${f._id}/checkout`);
    expect(res.status).toBe(201);
    expect(Object.values(payments)[0]).toMatchObject({ purpose: 'exam', examFormId: f._id, amountPaise: 80000 });
    expect((await request(appFor({ id: OTHER, role: 'student' })).post(`${base}/exam/${f._id}/checkout`)).status).toBe(404);
  });
  test('a form that is not waiting for payment is refused', async () => {
    const sid = id();
    students[sid] = { _id: sid, userId: USER };
    const f = { _id: id(), studentId: sid, examId: id(), status: 'draft', feeAmountPaise: 80000, feeStructureId: id() };
    forms[f._id] = f;
    expect((await request(appFor(who.student)).post(`${base}/exam/${f._id}/checkout`)).status).toBe(409);
  });
  test('an applicant has no exam payment permission', async () => {
    expect((await request(appFor(who.applicant)).post(`${base}/exam/${id()}/checkout`)).status).toBe(403);
  });
});

async function startedAdmission() {
  const a = mkApp();
  const res = await request(appFor(who.applicant)).post(`${base}/admission/${a._id}/checkout`);
  return { a, paymentId: res.body.data.paymentId, orderId: res.body.data.orderId };
}

describe('POST /:id/confirm', () => {
  const body = (orderId, paymentId = 'pay_P1', over = {}) => ({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sign(orderId, paymentId), ...over });

  test('a valid signature marks it paid, gives a receipt and moves the application on', async () => {
    const { a, paymentId, orderId } = await startedAdmission();
    const res = await request(appFor(who.applicant)).post(`${base}/${paymentId}/confirm`).send(body(orderId));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ settled: true, payment: { status: 'paid', receiptNumber: 'RCT-2026-27-000001', amountPaise: 925000 } });
    expect(apps[a._id]).toMatchObject({ status: 'feePaid', paidWith: paymentId });
    expect(JSON.stringify(res.body)).not.toContain('gatewayEventIds');
  });
  test('confirming twice is fine and gives the same receipt', async () => {
    const { paymentId, orderId } = await startedAdmission();
    const app = appFor(who.applicant);
    await request(app).post(`${base}/${paymentId}/confirm`).send(body(orderId));
    const again = await request(app).post(`${base}/${paymentId}/confirm`).send(body(orderId));
    expect(again.status).toBe(200);
    expect(again.body.data.payment.receiptNumber).toBe('RCT-2026-27-000001');
    expect(seq).toBe(1);
  });
  test('a forged signature is 400 and nothing is paid', async () => {
    const { a, paymentId, orderId } = await startedAdmission();
    const res = await request(appFor(who.applicant)).post(`${base}/${paymentId}/confirm`).send(body(orderId, 'pay_P1', { razorpay_signature: sign(orderId, 'pay_P1', 'forged') }));
    expect(res.status).toBe(400);
    expect(payments[paymentId].status).toBe('created');
    expect(apps[a._id].status).toBe('approved');
  });
  test.each(['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'])('a missing %s is 400', async (field) => {
    const { paymentId, orderId } = await startedAdmission();
    const b = body(orderId);
    delete b[field];
    expect((await request(appFor(who.applicant)).post(`${base}/${paymentId}/confirm`).send(b)).status).toBe(400);
  });
  test('somebody else cannot confirm it (404), an admin has no permission to (403), a missing payment is 404', async () => {
    const { paymentId, orderId } = await startedAdmission();
    expect((await request(appFor(who.other)).post(`${base}/${paymentId}/confirm`).send(body(orderId))).status).toBe(404);
    expect((await request(appFor(who.admissionAdmin)).post(`${base}/${paymentId}/confirm`).send(body(orderId))).status).toBe(403);
    expect((await request(appFor(who.applicant)).post(`${base}/${id()}/confirm`).send(body(orderId))).status).toBe(404);
    expect(payments[paymentId].status).toBe('created');
  });
  test('nobody signed in is 401 even for an id that does not exist; a malformed id is 404', async () => {
    expect((await request(appFor(null)).post(`${base}/${id()}/confirm`).send({})).status).toBe(401);
    expect((await request(appFor(null)).post(`${base}/x/confirm`).send({})).status).toBe(401);
    expect((await request(appFor(who.applicant)).post(`${base}/x/confirm`).send({})).status).toBe(404);
  });
  test('money received but the application can no longer move: payment stays paid, settled false, office message', async () => {
    const { a, paymentId, orderId } = await startedAdmission();
    Application.findById = async () => ({ ...apps[a._id], markFeePaid: async () => { throw new AppError('Application is cancelled', 409); } });
    const res = await request(appFor(who.applicant)).post(`${base}/${paymentId}/confirm`).send(body(orderId));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ settled: false, payment: { status: 'paid' } });
    expect(res.body.data.message).toMatch(/college office/);
  });
});

describe('GET /:id', () => {
  test('the owner and an admission admin can see it; someone else gets 404', async () => {
    const { paymentId } = await startedAdmission();
    const own = await request(appFor(who.applicant)).get(`${base}/${paymentId}`);
    expect(own.status).toBe(200);
    expect(own.body.data).toMatchObject({ id: paymentId, status: 'created', purpose: 'admission' });
    expect(own.body.data.gatewayOrderId).toBeUndefined();
    expect((await request(appFor(who.admissionAdmin)).get(`${base}/${paymentId}`)).status).toBe(200);
    expect((await request(appFor(who.other)).get(`${base}/${paymentId}`)).status).toBe(404);
    expect((await request(appFor(null)).get(`${base}/${paymentId}`)).status).toBe(401);
  });
});

describe('POST /webhook/razorpay', () => {
  const send = (app, payload, { secret = KEYS.webhookSecret, eventId = 'evt_1', signature } = {}) => {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const sig = signature !== undefined ? signature : crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return request(app).post(`${base}/webhook/razorpay`).set('Content-Type', 'application/json').set('x-razorpay-signature', sig).set('x-razorpay-event-id', eventId).send(raw);
  };
  const ev = (name, orderId, over = {}) => ({ event: name, payload: { payment: { entity: { id: 'pay_W1', order_id: orderId, amount: 925000, currency: 'INR', method: 'upi', ...over } } } });

  test('payment.captured with a valid signature marks it paid and moves the application on (no login needed)', async () => {
    const { a, paymentId, orderId } = await startedAdmission();
    const res = await send(appFor(null), ev('payment.captured', orderId));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, received: true });
    expect(payments[paymentId]).toMatchObject({ status: 'paid', confirmedVia: 'webhook', gatewayPaymentId: 'pay_W1' });
    expect(apps[a._id].status).toBe('feePaid');
  });
  test('the same event twice changes nothing the second time', async () => {
    const { paymentId, orderId } = await startedAdmission();
    const app = appFor(null);
    await send(app, ev('payment.captured', orderId));
    const again = await send(app, ev('payment.captured', orderId));
    expect(again.status).toBe(200);
    expect(seq).toBe(1);
    expect(payments[paymentId].gatewayEventIds).toEqual(['evt_1']);
  });
  test.each([['wrong secret', { secret: 'nope' }], ['no signature', { signature: '' }]])('a bad signature is 401 and nothing happens: %s', async (_n, opt) => {
    const { paymentId, orderId } = await startedAdmission();
    const res = await send(appFor(null), ev('payment.captured', orderId), opt);
    expect(res.status).toBe(401);
    expect(payments[paymentId].status).toBe('created');
  });
  test('a body changed after signing is 401', async () => {
    const { orderId } = await startedAdmission();
    const raw = JSON.stringify(ev('payment.captured', orderId));
    const sig = crypto.createHmac('sha256', KEYS.webhookSecret).update(raw).digest('hex');
    const res = await send(appFor(null), raw.replace('925000', '1'), { signature: sig });
    expect(res.status).toBe(401);
  });
  test('a signed body that is not JSON is 400', async () => {
    expect((await send(appFor(null), 'not json')).status).toBe(400);
  });
  test('a wrong amount is answered 200 (so Razorpay stops retrying), logged, and the payment stays unpaid', async () => {
    const { paymentId, orderId } = await startedAdmission();
    const res = await send(appFor(null), ev('payment.captured', orderId, { amount: 100 }));
    expect(res.status).toBe(200);
    expect(res.body.needsAttention).toMatch(/amount/);
    expect(logs.join(' ')).toMatch(/needs attention/);
    expect(payments[paymentId].status).toBe('created');
  });
  test('paid at Razorpay but the application cannot move: payment stays paid, logged, answered 200', async () => {
    const { a, paymentId, orderId } = await startedAdmission();
    Application.findById = async () => ({ ...apps[a._id], markFeePaid: async () => { throw new AppError('Application is cancelled', 409); } });
    const res = await send(appFor(null), ev('payment.captured', orderId));
    expect(res.status).toBe(200);
    expect(res.body.needsAttention).toBeDefined();
    expect(payments[paymentId].status).toBe('paid');
    expect(logs.join(' ')).toMatch(/could not be settled/);
  });
  test('a failed attempt is counted and the payment stays open; a later capture still works', async () => {
    const { paymentId, orderId } = await startedAdmission();
    const app = appFor(null);
    await send(app, ev('payment.failed', orderId, { error_code: 'BAD_REQUEST_ERROR', error_description: 'Declined' }), { eventId: 'evt_f' });
    expect(payments[paymentId]).toMatchObject({ status: 'created', failedAttempts: 1 });
    await send(app, ev('payment.captured', orderId), { eventId: 'evt_c' });
    expect(payments[paymentId].status).toBe('paid');
  });
  test('unknown orders and unused events are answered 200 and ignored', async () => {
    await startedAdmission();
    expect((await send(appFor(null), ev('payment.captured', 'order_UNKNOWN'))).status).toBe(200);
    expect((await send(appFor(null), { event: 'refund.created', payload: {} })).status).toBe(200);
  });
  test('the real app order (raw before json) keeps the bytes exactly as sent', async () => {
    const { paymentId, orderId } = await startedAdmission();
    const spaced = `{ "event" : "payment.captured",\n "payload":{"payment":{"entity":{"id":"pay_W1","order_id":"${orderId}","amount":925000,"currency":"INR"}}} }`;
    const res = await send(appFor(null), spaced);
    expect(res.status).toBe(200);
    expect(payments[paymentId].status).toBe('paid');
  });
});

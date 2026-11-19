import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';
import refundsRoutes from '../src/modules/payments/refunds.routes.js';
import { setGatewayForTests } from '../src/services/payment/index.js';
import { wireRefundWorld, id } from './helpers/refundWorld.js';

// Retry: a Super Admin sends an APPROVED refund again after the gateway had failed the first time.
let w;
let errorSpy;
const superUser = id();

function appWith(user) {
  const app = express();
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.use(express.json());
  app.use('/refunds', refundsRoutes);
  app.use(errorHandler);
  return app;
}
const as = (role, uid) => appWith({ id: String(uid || id()), role, departmentId: null });
const asSuper = () => as('superAdmin', superUser);
const retry = (app, refundId) => request(app).post(`/refunds/${refundId}/retry`);

beforeEach(() => { w = wireRefundWorld(); errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); }); // 5xx tests log on purpose
afterEach(() => errorSpy.mockRestore());
afterAll(() => setGatewayForTests(null));

describe('POST /refunds/:id/retry', () => {
  test('sends an approved refund that was never sent, and saves the gateway id on the refund itself', async () => {
    const p = w.addPayment(); const r = w.addRefund({ paymentId: p._id });
    const res = await retry(asSuper(), r._id);
    expect(res.status).toBe(200);
    expect(res.body.data.gatewayRefundId).toMatch(/^rfnd_fake_/);
    expect(w.gatewayCalls).toHaveLength(1);
    expect(w.gatewayCalls[0]).toMatchObject({ gatewayPaymentId: p.gatewayPaymentId, amountPaise: 500000 });
    expect(w.refunds[r._id]).toMatchObject({ status: 'approved', gatewayRefundId: res.body.data.gatewayRefundId });
    expect(w.refunds[r._id].processedAt).toBeInstanceOf(Date);
    expect(w.refunds[r._id].processingAt).toBeUndefined(); // the lock is released
    expect(w.lastAudit('refundRetried')).toMatchObject({ outcome: 'success', details: { gatewayRefundId: res.body.data.gatewayRefundId } });
  });

  test('the whole story: approved while the gateway is down, then a retry that works', async () => {
    const p = w.addPayment(); const r = w.addRefund({ paymentId: p._id, status: 'requested', decidedByUserId: null });
    const working = w.gateway.refund;
    w.gateway.refund = async () => { throw Object.assign(new Error('gateway down'), { statusCode: 502 }); };
    const first = await request(asSuper()).post(`/refunds/${r._id}/decision`).send({ approve: true });
    expect(first.status).toBe(502);
    expect(w.refunds[r._id].status).toBe('approved');
    expect(w.refunds[r._id].gatewayRefundId).toBeUndefined();
    expect(w.refunds[r._id].processingAt).toBeUndefined(); // not stuck behind a lock

    w.gateway.refund = working; // the gateway is back
    const second = await retry(asSuper(), r._id);
    expect(second.status).toBe(200);
    expect(w.refunds[r._id].gatewayRefundId).toBe(second.body.data.gatewayRefundId);
  });

  test('approving normally now also saves the gateway refund id on the refund', async () => {
    const p = w.addPayment(); const r = w.addRefund({ paymentId: p._id, status: 'requested', decidedByUserId: null });
    const res = await request(asSuper()).post(`/refunds/${r._id}/decision`).send({ approve: true });
    expect(res.status).toBe(200);
    expect(w.refunds[r._id].gatewayRefundId).toBe(res.body.data.gatewayRefundId);
    expect((await retry(asSuper(), r._id)).status).toBe(409); // so a retry right after is refused
    expect(w.gatewayCalls).toHaveLength(1);
  });

  test('409 when the refund was already sent: the gateway is not called again', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id, gatewayRefundId: 'rfnd_1', processedAt: new Date() });
    const res = await retry(asSuper(), r._id);
    expect(res.status).toBe(409);
    expect(w.gatewayCalls).toHaveLength(0);
    expect(w.lastAudit('refundRetried')).toMatchObject({ outcome: 'failed' });
  });

  test('409 for an older refund that was sent before ids were saved on refunds: the audit log proves it', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id });
    w.audits.push({ action: 'refundDecided', entityType: 'refund', entityId: r._id, outcome: 'success', details: { gatewayRefundId: 'rfnd_old_1' }, createdAt: new Date('2026-11-10') });
    const res = await retry(asSuper(), r._id);
    expect(res.status).toBe(409);
    expect(w.gatewayCalls).toHaveLength(0);
    expect(w.refunds[r._id].gatewayRefundId).toBe('rfnd_old_1'); // now it is on the refund too
  });

  test.each(['requested', 'rejected'])('409 for a %s refund (only an approved one can be retried)', async (status) => {
    const r = w.addRefund({ paymentId: w.addPayment()._id, status });
    expect((await retry(asSuper(), r._id)).status).toBe(409);
    expect(w.gatewayCalls).toHaveLength(0);
  });

  test('409 while another request is sending it; a lock older than 2 minutes no longer blocks', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id, processingAt: new Date() });
    expect((await retry(asSuper(), r._id)).status).toBe(409);
    expect(w.gatewayCalls).toHaveLength(0);
    w.refunds[r._id].processingAt = new Date(Date.now() - 3 * 60 * 1000);
    expect((await retry(asSuper(), r._id)).status).toBe(200);
    expect(w.gatewayCalls).toHaveLength(1);
  });

  test('two retries at the same moment: the gateway is called only once', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id });
    const [a, b] = await Promise.all([retry(asSuper(), r._id), retry(asSuper(), r._id)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(w.gatewayCalls).toHaveLength(1);
  });

  test('if the gateway fails again: 502, the lock is released, the refund stays approved and can be retried again', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id });
    const working = w.gateway.refund;
    w.gateway.refund = async () => { throw Object.assign(new Error('gateway down'), { statusCode: 502 }); };
    const res = await retry(asSuper(), r._id);
    expect(res.status).toBe(502);
    expect(w.refunds[r._id].status).toBe('approved');
    expect(w.refunds[r._id].processingAt).toBeUndefined();
    expect(w.lastAudit('refundRetried')).toMatchObject({ outcome: 'failed', details: { reason: 'Retry failed: gateway down' } });
    w.gateway.refund = working;
    expect((await retry(asSuper(), r._id)).status).toBe(200);
  });

  test('the money was sent but saving the id failed: the id is kept in the audit log, and a later retry refuses to pay again', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id });
    w.failSaveOnce = true;
    const res = await retry(asSuper(), r._id);
    expect(res.status).toBe(500);
    expect(w.gatewayCalls).toHaveLength(1);
    const logged = w.lastAudit('refundRetried');
    expect(logged).toMatchObject({ outcome: 'failed', details: { gatewayRefundId: expect.stringMatching(/^rfnd_fake_/) } });
    expect(w.refunds[r._id].processingAt).toBeInstanceOf(Date); // the lock is kept

    w.refunds[r._id].processingAt = new Date(Date.now() - 3 * 60 * 1000); // time passes, the lock runs out
    const again = await retry(asSuper(), r._id);
    expect(again.status).toBe(409);
    expect(w.gatewayCalls).toHaveLength(1); // still only one payout
    expect(w.refunds[r._id].gatewayRefundId).toBe(logged.details.gatewayRefundId);
  });

  test('409 and the lock is released when the payment was made on another gateway', async () => {
    const r = w.addRefund({ paymentId: w.addPayment({ gateway: 'razorpay' })._id });
    expect((await retry(asSuper(), r._id)).status).toBe(409);
    expect(w.gatewayCalls).toHaveLength(0);
    expect(w.refunds[r._id].processingAt).toBeUndefined();
  });

  test.each(['applicant', 'student', 'teacher', 'hod', 'websiteAdmin', 'admissionAdmin', 'examAdmin'])('403 for %s: only the Super Admin may retry', async (role) => {
    const r = w.addRefund({ paymentId: w.addPayment()._id });
    expect((await retry(as(role), r._id)).status).toBe(403);
    expect(w.gatewayCalls).toHaveLength(0);
  });

  test('401 when nobody is signed in, 404 for an unknown refund, 400 for an id that is not an id', async () => {
    const r = w.addRefund({ paymentId: w.addPayment()._id });
    expect((await retry(appWith(null), r._id)).status).toBe(401);
    expect((await retry(asSuper(), id())).status).toBe(404);
    expect((await retry(asSuper(), '12')).status).toBe(400);
  });
});

import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import Permission from '../../src/models/Permission.js';
import AuditLog from '../../src/models/AuditLog.js';
import Payment from '../../src/models/Payment.js';
import Refund from '../../src/models/Refund.js';
import { clearPermissionCache } from '../../src/services/permissionService.js';
import { setGatewayForTests } from '../../src/services/payment/index.js';
import { createFakeGateway } from '../../src/services/payment/fakeGateway.js';

// A tiny in-memory stand-in for MongoDB, only for refund tests (the same idea as tests/paymentFlow.test.js).
// The REAL Refund.decide and the REAL refunds.service.js run on top of it.
const matrix = JSON.parse(readFileSync(new URL('../../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const id = () => new mongoose.Types.ObjectId();
const copy = (o) => (o ? { ...o } : null);
const q = (value) => ({ then: (a, b) => Promise.resolve(value).then(a, b), session: () => q(value), select: () => q(value), lean: () => q(value) });
const LOCK_MS = 2 * 60 * 1000;

function wireRefundWorld() {
  clearPermissionCache();
  const w = { audits: [], payments: {}, refunds: {}, gatewayCalls: [], failSaveOnce: false, gateway: createFakeGateway() };

  // Count every call that reaches the gateway.
  const realRefund = w.gateway.refund.bind(w.gateway);
  w.gateway.refund = async (args) => { w.gatewayCalls.push(args); return realRefund(args); };
  setGatewayForTests(w.gateway);

  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async (entry) => { w.audits.push({ ...entry, createdAt: new Date() }); return entry; };
  AuditLog.findOne = (filter) => ({
    lean: async () => w.audits.slice().reverse().find((a) => (
      a.entityType === filter.entityType && String(a.entityId) === String(filter.entityId)
      && filter.action.$in.includes(a.action) && typeof (a.details || {}).gatewayRefundId === 'string'
    )) || null,
  });

  Payment.findById = (pid) => q(copy(w.payments[pid]));
  Payment.updateOne = async () => {};
  Refund.findById = (rid) => q(copy(w.refunds[rid]));
  // Understands the same filters the service uses: status, "not sent yet" and the 2-minute lock.
  Refund.findOneAndUpdate = async (filter, update) => {
    const r = w.refunds[String(filter._id)];
    if (!r) return null;
    if (filter.status && r.status !== filter.status) return null;
    if (filter.gatewayRefundId && filter.gatewayRefundId.$exists === false && r.gatewayRefundId) return null;
    if (filter.$or && r.processingAt && r.processingAt > new Date(Date.now() - LOCK_MS)) return null;
    if (update.$set && update.$set.gatewayRefundId && w.failSaveOnce) { w.failSaveOnce = false; throw new Error('database hiccup'); }
    if (update.$set) Object.assign(r, update.$set);
    if (update.$unset) Object.keys(update.$unset).forEach((k) => { delete r[k]; });
    return copy(r);
  };

  w.addPayment = (over = {}) => {
    const p = {
      _id: id(), purpose: 'admission', payerUserId: id(), amountPaise: 1200000, reservedRefundPaise: 500000, status: 'paid',
      gateway: 'fake', gatewayOrderId: `order_fake_${id()}`, gatewayPaymentId: `pay_fake_${id()}`, ...over,
    };
    w.payments[String(p._id)] = p;
    return p;
  };
  // An APPROVED refund that has not been sent yet: exactly what is left behind when the gateway was down.
  w.addRefund = (over = {}) => {
    const r = {
      _id: id(), paymentId: id(), purpose: 'admission', amountPaise: 500000, reason: 'Withdrew admission', status: 'approved',
      requestedByUserId: id(), decidedByUserId: id(), decidedAt: new Date(), ...over,
    };
    w.refunds[String(r._id)] = r;
    return r;
  };
  w.lastAudit = (action) => w.audits.slice().reverse().find((a) => a.action === action);
  return w;
}

export { wireRefundWorld, id };

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import '../src/models/index.js';
import Application from '../src/models/Application.js';
import AcademicYear from '../src/models/AcademicYear.js';
import AuditLog from '../src/models/AuditLog.js';
import Payment from '../src/models/Payment.js';
import { runPaymentReconciliationJob } from '../src/jobs/paymentReconciliation.js';

jest.setTimeout(60000);

let mongod;
let year;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'reconciliation_test' });
  await Promise.all([Application.init(), AcademicYear.init(), AuditLog.init(), Payment.init()]);
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    Application.deleteMany({}),
    AcademicYear.deleteMany({}),
    AuditLog.collection.deleteMany({}),
    Payment.deleteMany({}),
  ]);
  year = await AcademicYear.create({ label: '2026-27', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), status: 'current' });
});

async function makePayment(over = {}) {
  const application = await Application.create({
    applicantUserId: new mongoose.Types.ObjectId(),
    academicYearId: year._id,
    programId: new mongoose.Types.ObjectId(),
    feesCategory: 'PAYING',
    divisionType: 'P.N.G.',
    status: 'approved',
    feeStructureId: new mongoose.Types.ObjectId(),
    feeAmountPaise: 120000,
  });
  const payment = await Payment.create({
    purpose: 'admission',
    payerUserId: application.applicantUserId,
    academicYearId: year._id,
    feeStructureId: application.feeStructureId,
    applicationId: application._id,
    amountPaise: 120000,
    gateway: 'fake',
    gatewayOrderId: `order_${new mongoose.Types.ObjectId()}`,
    orderCreatedAt: new Date(Date.now() - 60 * 60 * 1000),
    ...over,
  });
  return { application, payment };
}

describe('payment reconciliation job', () => {
  test('settles an old created payment when the gateway says it was captured', async () => {
    const { application, payment } = await makePayment();
    const gateway = {
      name: 'fake',
      listOrderPayments: jest.fn(async () => [{ id: 'pay_rec_1', status: 'captured', amount: 120000, method: 'upi' }]),
    };

    const result = await runPaymentReconciliationJob({ gateway, minAgeMs: 1 });
    expect(result).toMatchObject({ checked: 1, reconciled: 1, errors: 0 });

    expect(await Payment.findById(payment._id)).toMatchObject({
      status: 'paid',
      gatewayPaymentId: 'pay_rec_1',
      confirmedVia: 'reconciliation',
      gatewayMethod: 'upi',
    });
    expect((await Application.findById(application._id)).status).toBe('feePaid');
    expect(await AuditLog.countDocuments({ action: 'paymentVerified' })).toBe(1);
  });

  test('leaves a payment alone when the gateway has no captured attempt', async () => {
    const { payment } = await makePayment();
    const gateway = {
      name: 'fake',
      listOrderPayments: jest.fn(async () => [{ id: 'pay_failed_1', status: 'failed', amount: 120000 }]),
    };

    const result = await runPaymentReconciliationJob({ gateway, minAgeMs: 1 });
    expect(result).toMatchObject({ checked: 1, reconciled: 0, errors: 0 });
    expect((await Payment.findById(payment._id)).status).toBe('created');
  });

  test('does not settle a captured amount that does not match the order', async () => {
    const { payment } = await makePayment();
    const gateway = {
      name: 'fake',
      listOrderPayments: jest.fn(async () => [{ id: 'pay_wrong', status: 'captured', amount: 999, method: 'upi' }]),
    };

    const result = await runPaymentReconciliationJob({ gateway, minAgeMs: 1 });
    expect(result).toMatchObject({ checked: 1, reconciled: 0, errors: 0 });
    expect((await Payment.findById(payment._id)).status).toBe('created');
    expect(await AuditLog.countDocuments({ action: 'paymentReconciliationMismatch' })).toBe(1);
  });

  test('counts a gateway error and leaves the payment for the next run', async () => {
    const { payment } = await makePayment();
    const gateway = {
      name: 'fake',
      listOrderPayments: jest.fn(async () => { throw new Error('gateway down'); }),
    };

    const result = await runPaymentReconciliationJob({ gateway, minAgeMs: 1 });
    expect(result).toMatchObject({ checked: 1, reconciled: 0, errors: 1 });
    expect((await Payment.findById(payment._id)).status).toBe('created');
    expect(await AuditLog.countDocuments({ action: 'paymentReconciliationFailed' })).toBe(1);
  });
});

import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import Application from '../src/models/Application.js';
import AuditLog from '../src/models/AuditLog.js';
import { runAdmissionDeadlineJob } from '../src/jobs/admissionDeadlines.js';

let mongod;

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri());
}, 120000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const base = (overrides) => ({
  applicantUserId: new mongoose.Types.ObjectId(),
  academicYearId: new mongoose.Types.ObjectId(),
  programId: new mongoose.Types.ObjectId(),
  status: 'approved',
  feeDueAt: new Date(Date.now() - 86400000),
  ...overrides,
});

describe('admission deadline job', () => {
  test('cancels unpaid approved applications and leaves fee-paid ones for the office', async () => {
    const unpaid = await Application.create(base({ applicationNumber: 'APP-UNPAID' }));
    const paid = await Application.create(base({
      applicationNumber: 'APP-PAID',
      status: 'feePaid',
      feeDueAt: null,
      hardCopyDueAt: new Date(Date.now() - 86400000),
    }));
    const future = await Application.create(base({
      applicationNumber: 'APP-FUTURE',
      feeDueAt: new Date(Date.now() + 86400000),
    }));

    const result = await runAdmissionDeadlineJob();
    expect(result).toEqual({ cancelled: 1, overdueHardCopies: 1 });

    expect((await Application.findById(unpaid._id)).status).toBe('cancelled');
    expect((await Application.findById(paid._id)).status).toBe('feePaid');
    expect((await Application.findById(future._id)).status).toBe('approved');

    const audit = await AuditLog.findOne({ action: 'admissionDeadlinesProcessed' }).lean();
    expect(audit.details).toMatchObject({ cancelled: 1, overdueHardCopies: 1, feeApplications: ['APP-UNPAID'] });
  });
});

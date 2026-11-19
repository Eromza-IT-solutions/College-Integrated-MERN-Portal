import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AuditLog from '../src/models/AuditLog.js';
import Application from '../src/models/Application.js';
import Payment from '../src/models/Payment.js';
import Refund from '../src/models/Refund.js';
import reportsRoutes from '../src/modules/reports/reports.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { prepareDatabase, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
const id = () => new mongoose.Types.ObjectId();
const appFor = (user) => {
  const app = express();
  app.use((req, _res, next) => { if (user) req.user = { id: String(user.id), role: user.role, departmentId: user.departmentId ? String(user.departmentId) : null }; next(); });
  app.use('/reports', reportsRoutes);
  app.use(errorHandler);
  return app;
};
const admissionAdmin = () => appFor({ id: id(), role: 'admissionAdmin' });
const examAdmin = () => appFor({ id: id(), role: 'examAdmin' });
const superAdmin = () => appFor({ id: id(), role: 'superAdmin' });
const hod = (dept) => appFor({ id: id(), role: 'hod', departmentId: dept });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'reports_test' });
  await prepareDatabase();
  w = await buildWorld();
  // Raw insert: sirf wahi fields jo reports padhte hain (models ke flow rules yahan ka topic nahi).
  const app = (status) => ({
    applicantUserId: id(),
    academicYearId: w.year._id,
    programId: w.progA._id,
    status,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await Application.collection.insertMany([app('admitted'), app('admitted'), app('submitted')]);
  const pay = (purpose, status, paise, method) => ({ _id: id(), purpose, status, amountPaise: paise, gatewayMethod: method, academicYearId: w.year._id, payerUserId: id(), feeStructureId: id(), createdAt: new Date(), updatedAt: new Date() });
  const p1 = pay('admission', 'paid', 50000, 'upi');
  await Payment.collection.insertMany([p1, pay('admission', 'failed', 50000), pay('exam', 'paid', 20000, 'card')]);
  await Refund.collection.insertOne({ paymentId: p1._id, purpose: 'admission', amountPaise: 10000, status: 'approved', createdAt: new Date(), updatedAt: new Date() });
}, 180000);

afterAll(async () => { await mongoose.disconnect(); if (mongod) await mongod.stop(); });

describe('access', () => {
  test('401 when nobody is signed in; teacher and student get 403', async () => {
    expect((await request(appFor(null)).get('/reports/department')).status).toBe(401);
    expect((await request(appFor({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id })).get('/reports/department')).status).toBe(403);
    expect((await request(appFor({ id: w.stu1User._id, role: 'student' })).get('/reports/exam')).status).toBe(403);
  });
  test('bad filters are 400', async () => {
    const res = await request(superAdmin()).get('/reports/admission?from=nope');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('department report', () => {
  test('HOD sees only the own department; super admin sees all', async () => {
    const a = await request(hod(w.deptA._id)).get('/reports/department');
    expect(a.status).toBe(200);
    expect(a.body.data.rows).toHaveLength(1);
    expect(a.body.data.rows[0]).toMatchObject({ code: 'CS', programs: 1, activeStudents: 2 });
    const b = await request(hod(w.deptB._id)).get('/reports/department');
    expect(b.body.data.rows[0]).toMatchObject({ code: 'COM', activeStudents: 0 });
    expect((await request(superAdmin()).get('/reports/department')).body.data.rows).toHaveLength(2);
  });
});

describe('admission report', () => {
  test('counts by status; HOD of another department sees nothing', async () => {
    const res = await request(admissionAdmin()).get('/reports/admission');
    expect(res.body.data.summary).toMatchObject({ total: 3, byStatus: { admitted: 2, submitted: 1 } });
    expect(res.body.data.rows[0]).toMatchObject({ code: 'FYCS', total: 3, admitted: 2 });
    expect((await request(hod(w.deptB._id)).get('/reports/admission')).body.data.summary.total).toBe(0);
    expect((await request(hod(w.deptA._id)).get('/reports/admission')).body.data.summary.total).toBe(3);
  });
  test('a date range in the future finds nothing', async () => {
    const res = await request(admissionAdmin()).get('/reports/admission?from=2099-01-01');
    expect(res.body.data.summary.total).toBe(0);
  });
});

describe('exam report', () => {
  test('one row per exam with form counts', async () => {
    const res = await request(examAdmin()).get('/reports/exam');
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toHaveLength(1);
    expect(res.body.data.rows[0]).toMatchObject({ exam: 'End Sem Nov 2026', formsApproved: 1, resultSheets: 0 });
  });
});

describe('payment report', () => {
  test('each admin sees only their own money; refunds are subtracted', async () => {
    const adm = await request(admissionAdmin()).get('/reports/payment');
    expect(adm.body.data.rows).toHaveLength(1);
    expect(adm.body.data.rows[0]).toMatchObject({ purpose: 'admission', paidCount: 1, failedCount: 1, collectedPaise: 50000, refundedPaise: 10000, netPaise: 40000, netRupees: 400 });
    const ex = await request(examAdmin()).get('/reports/payment');
    expect(ex.body.data.rows).toHaveLength(1);
    expect(ex.body.data.rows[0]).toMatchObject({ purpose: 'exam', collectedPaise: 20000, netPaise: 20000 });
    const all = await request(superAdmin()).get('/reports/payment');
    expect(all.body.data.rows).toHaveLength(2);
    expect(all.body.data.summary.netPaise).toBe(60000);
  });
  test('HOD gets 403 for payment reports', async () => {
    expect((await request(hod(w.deptA._id)).get('/reports/payment')).status).toBe(403);
  });
});

describe('CSV export', () => {
  test('CSV download works, has a header row, and an audit row is written', async () => {
    const res = await request(superAdmin()).get('/reports/payment?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/payment-report-\d{4}-\d{2}-\d{2}\.csv/);
    expect(res.text).toContain('purpose,paidCount,collectedPaise');
    const row = await AuditLog.findOne({ action: 'reportExported' }).lean();
    expect(row.details).toMatchObject({ report: 'payment', rows: 2 });
  });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Application from '../src/models/Application.js';
import Result from '../src/models/Result.js';
import admissionRoutes from '../src/modules/admission/admission.routes.js';
import reportsRoutes from '../src/modules/reports/reports.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { buildPdf, pdfFilename } from '../src/utils/pdf.js';
import { receiptPdf, examFormPdf, resultPdf, applicationPdf, reportPdf } from '../src/utils/pdfDocuments.js';
import { prepareDatabase, appFor, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
let result;

const pdfText = (res) => (Buffer.isBuffer(res.body) ? res.body.toString('latin1') : String(res.text || ''));
const SAMPLE_NOTICE = 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT';

function mountedApp(user, path, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.user = { id: String(user.id || user._id), role: user.role, departmentId: user.departmentId ? String(user.departmentId) : null };
    next();
  });
  app.use(path, router);
  app.use(errorHandler);
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'pdf_test' });
  await prepareDatabase();
  w = await buildWorld();

  result = await Result.openForApprovedForm(w.examForm._id);
  await result.enterMarks(w.examForm.subjects.map((subject) => ({
    subjectId: subject.subjectId,
    internalMarks: 20,
    externalMarks: 50,
  })));
  await Result.publish(result._id, { byUserId: w.examAdmin._id });
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('PDF document builders', () => {
  test('builds a valid, paginated PDF buffer', () => {
    const buffer = buildPdf({
      title: 'Test document',
      subtitle: 'SAMPLE',
      lines: Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`),
    });
    const text = buffer.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('Test document');
    expect(text).toContain('Page 2 of 3');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  test('receipt, exam form, result and application builders include their data', () => {
    const receipt = receiptPdf({ receiptNumber: 'RCPT-1', amountPaise: 12345, payerName: 'Test Payer', purpose: 'admission' });
    expect(receipt.toString('latin1')).toContain('RCPT-1');
    expect(receipt.toString('latin1')).toContain('INR 123.45');
    expect(receipt.toString('latin1')).toContain(SAMPLE_NOTICE);

    const form = examFormPdf(w.examForm);
    expect(form.toString('latin1')).toContain('EN001');
    expect(form.toString('latin1')).toContain('CS101');
    expect(form.toString('latin1')).toContain(SAMPLE_NOTICE);

    const sheet = resultPdf(result);
    expect(sheet.toString('latin1')).toContain('EN001');
    expect(sheet.toString('latin1')).toContain('CS101');
    expect(sheet.toString('latin1')).toContain(SAMPLE_NOTICE);

    const application = applicationPdf({
      applicationNumber: 'APP-2026-0001',
      status: 'submitted',
      student: { fullName: 'Test Applicant' },
    });
    expect(application.toString('latin1')).toContain('APP-2026-0001');
    expect(application.toString('latin1')).toContain('Test Applicant');
    expect(application.toString('latin1')).toContain(SAMPLE_NOTICE);
  });

  test('report builder includes summary, rows and the sample notice', () => {
    const report = reportPdf({
      title: 'Payment report',
      summary: { netRupees: 400 },
      rows: [{ purpose: 'admission', netRupees: 400 }],
    });
    const text = report.toString('latin1');
    expect(text).toContain('Payment report');
    expect(text).toContain('netRupees = 400');
    expect(text).toContain('purpose=admission');
    expect(text).toContain(SAMPLE_NOTICE);
  });

  test('filenames are safe', () => {
    expect(pdfFilename('receipt/RCPT 1')).toMatch(/^receipt-RCPT-1-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});

describe('PDF routes', () => {
  test('an exam admin downloads an exam form PDF', async () => {
    const res = await request(appFor({ id: w.examAdmin._id, role: 'examAdmin' }))
      .get(`/exam-forms/${w.examForm._id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/exam-form-EN001-\d{4}-\d{2}-\d{2}\.pdf/);
    expect(pdfText(res)).toContain('Examination form');
  });

  test('a student downloads their published result PDF', async () => {
    const res = await request(appFor({ id: w.stu1User._id, role: 'student' }))
      .get(`/results/${result._id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdfText(res)).toContain('Examination result');
  });

  test('an admission application PDF can be downloaded', async () => {
    const application = await Application.create({
      applicantUserId: w.stu2User._id,
      academicYearId: w.year._id,
      programId: w.progA._id,
      feesCategory: 'PAYING',
      divisionType: 'P.N.G.',
      student: { fullName: 'PDF Applicant', mobile: '9876543210', email: 'pdf@test.edu' },
    });
    const res = await request(mountedApp({ id: w.superAdmin._id, role: 'superAdmin' }, '/admissions', admissionRoutes))
      .get(`/admissions/applications/${application._id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdfText(res)).toContain('Admission application');
  });

  test('reports can be downloaded as PDF', async () => {
    const res = await request(mountedApp({ id: w.superAdmin._id, role: 'superAdmin' }, '/reports', reportsRoutes))
      .get('/reports/payment?format=pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/payment-report-\d{4}-\d{2}-\d{2}\.pdf/);
    expect(pdfText(res)).toContain('Payment report');
  });
});

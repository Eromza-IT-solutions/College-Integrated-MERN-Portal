import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import '../src/models/index.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Application from '../src/models/Application.js';
import AuditLog from '../src/models/AuditLog.js';
import Counter from '../src/models/Counter.js';
import Enrollment from '../src/models/Enrollment.js';
import Exam from '../src/models/Exam.js';
import ExamForm from '../src/models/ExamForm.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';
import Program from '../src/models/Program.js';
import Student from '../src/models/Student.js';
import Subject from '../src/models/Subject.js';
import User from '../src/models/User.js';
import { createStudent } from '../src/modules/admission/admission.service.js';
import { settlePaid } from '../src/modules/payments/payments.service.js';
import {
  APPLICATION_STATUS,
  DEFAULT_DIVISION,
  EXAM_FORM_STATUS,
  EXAM_STATUS,
  PAYMENT_GATEWAY,
  PAYMENT_PURPOSE,
  PAYMENT_STATUS,
  ROLES,
} from '../src/utils/constants.js';

jest.setTimeout(120000);

let mongod;
const id = () => new mongoose.Types.ObjectId();

async function makeBase() {
  const year = await AcademicYear.create({
    label: '2026-27',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2027-05-31'),
    status: 'current',
  });
  await Counter.seedForYear(year.label);
  const marker = String(id());
  const program = await Program.create({
    name: `Transaction Program ${marker}`,
    code: `TP${marker.slice(0, 8).toUpperCase()}`,
    departmentId: id(),
    level: 'Undergraduate',
  });
  const user = await User.create({
    fullName: 'Transaction Person',
    email: `transaction.${marker}@test.edu`,
    passwordHash: 'x'.repeat(60),
    role: ROLES.APPLICANT,
    status: 'active',
  });
  return { year, program, user };
}

async function makeApplication({ year, program, user }, status, subjectIds = [], overrides = {}) {
  return Application.create({
    applicantUserId: user._id,
    academicYearId: year._id,
    programId: program._id,
    yearOfStudy: 1,
    status,
    divisionType: DEFAULT_DIVISION,
    feesCategory: 'PAYING',
    feeStructureId: id(),
    feeAmountPaise: 100000,
    aadhaarNumber: '123456789012',
    student: { fullName: 'Transaction Person', mobile: '9876543210' },
    subjects: { mainGroup: 'major', majorGroup: 'major', nep: { major: subjectIds } },
    ...overrides,
  });
}

async function makePayment(application, { user, year }) {
  return Payment.create({
    purpose: PAYMENT_PURPOSE.ADMISSION,
    payerUserId: user._id,
    academicYearId: year._id,
    feeStructureId: application.feeStructureId,
    applicationId: application._id,
    amountPaise: application.feeAmountPaise,
    gateway: PAYMENT_GATEWAY.FAKE,
    gatewayOrderId: `order_${id()}`,
  });
}

function requestFor(user) {
  return {
    user: { id: String(user._id), role: user.role },
    permission: { scope: 'own' },
  };
}

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri(), { dbName: 'transactions_test' });
  await Promise.all([
    Application.init(),
    AuditLog.init(),
    Counter.init(),
    Enrollment.init(),
    Payment.init(),
    Student.init(),
    User.init(),
  ]);
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    Application.deleteMany({}),
    Counter.deleteMany({}),
    Enrollment.deleteMany({}),
    Payment.deleteMany({}),
    Program.deleteMany({}),
    Student.deleteMany({}),
    Subject.deleteMany({}),
    User.deleteMany({}),
    AcademicYear.deleteMany({}),
  ]);
  await AuditLog.collection.deleteMany({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('admission settlement commits payment and application together on a replica set', async () => {
  const base = await makeBase();
  const application = await makeApplication(base, APPLICATION_STATUS.APPROVED);
  const payment = await makePayment(application, base);

  const result = await settlePaid(null, payment, 'pay_ok', { source: 'webhook', method: 'upi' });

  expect(result.alreadyPaid).toBe(false);
  expect(result.payment.status).toBe(PAYMENT_STATUS.PAID);
  expect((await Payment.findById(payment._id)).status).toBe(PAYMENT_STATUS.PAID);
  expect((await Application.findById(application._id)).status).toBe(APPLICATION_STATUS.FEE_PAID);
  expect(await AuditLog.countDocuments({ action: 'paymentVerified', outcome: 'success' })).toBe(1);
});

test('admission settlement rolls back payment and application when the application changed', async () => {
  const base = await makeBase();
  const application = await makeApplication(base, APPLICATION_STATUS.CANCELLED);
  const payment = await makePayment(application, base);

  await expect(settlePaid(null, payment, 'pay_bad', { source: 'webhook' })).rejects.toMatchObject({ statusCode: 409 });

  expect((await Payment.findById(payment._id)).status).toBe(PAYMENT_STATUS.CREATED);
  expect((await Application.findById(application._id)).status).toBe(APPLICATION_STATUS.CANCELLED);
  expect(await AuditLog.countDocuments({ action: 'paymentVerified', outcome: 'failed' })).toBe(1);
  expect(await AuditLog.countDocuments({ action: 'paymentVerified', outcome: 'success' })).toBe(0);
});

test('four concurrent settlements produce one receipt, one counter increment and one audit row', async () => {
  const base = await makeBase();
  const application = await makeApplication(base, APPLICATION_STATUS.APPROVED);
  const payment = await makePayment(application, base);

  const results = await Promise.all([
    settlePaid(null, payment, 'pay_race', { source: 'browser' }),
    settlePaid(null, payment, 'pay_race', { source: 'browser' }),
    settlePaid(null, payment, 'pay_race', { source: 'webhook', method: 'upi' }),
    settlePaid(null, payment, 'pay_race', { source: 'webhook', method: 'card' }),
  ]);

  expect(results).toHaveLength(4);
  expect(results.filter((result) => result.alreadyPaid === false)).toHaveLength(1);
  const settled = await Payment.findById(payment._id);
  expect(settled.status).toBe(PAYMENT_STATUS.PAID);
  expect(typeof settled.receiptNumber).toBe('string');
  expect((await Counter.findById('receipt:2026-27')).seq).toBe(1);
  expect(await AuditLog.countDocuments({ action: 'paymentVerified', outcome: 'success' })).toBe(1);
  expect((await Application.findById(application._id)).status).toBe(APPLICATION_STATUS.FEE_PAID);
});

test('an audit failure inside settlement rolls back the payment', async () => {
  const base = await makeBase();
  const application = await makeApplication(base, APPLICATION_STATUS.APPROVED);
  const payment = await makePayment(application, base);
  jest.spyOn(AuditLog, 'record').mockRejectedValueOnce(new Error('audit down'));

  await expect(settlePaid(null, payment, 'pay_audit', { source: 'webhook' })).rejects.toThrow('audit down');

  expect((await Payment.findById(payment._id)).status).toBe(PAYMENT_STATUS.CREATED);
  expect((await Application.findById(application._id)).status).toBe(APPLICATION_STATUS.APPROVED);
  expect(await AuditLog.countDocuments({ action: 'paymentVerified', outcome: 'failed' })).toBe(1);
  expect(await AuditLog.countDocuments({ action: 'paymentVerified', outcome: 'success' })).toBe(0);
});

test('student conversion commits user, student, enrollment and audit together', async () => {
  const base = await makeBase();
  const subject = await Subject.create({
    code: 'TX101',
    name: 'Transaction Subject',
    programId: base.program._id,
    semester: 1,
    category: 'major',
  });
  const application = await makeApplication(base, APPLICATION_STATUS.ADMITTED, [subject._id]);

  const result = await createStudent(requestFor(base.user), application._id);

  expect(result.enrolled).toBe(1);
  expect((await User.findById(base.user._id)).role).toBe(ROLES.STUDENT);
  expect((await Student.findOne({ applicationId: application._id })).enrollmentNumber).toBe(result.student.enrollmentNumber);
  expect(await Enrollment.countDocuments({ studentId: result.student._id })).toBe(1);
  expect(await AuditLog.countDocuments({ action: 'studentCreatedFromApplication', outcome: 'success' })).toBe(1);
});

test('student conversion rolls back the user role change if enrollment insertion fails', async () => {
  const base = await makeBase();
  const subject = await Subject.create({
    code: 'TX102',
    name: 'Transaction Subject Two',
    programId: base.program._id,
    semester: 1,
    category: 'major',
  });
  const application = await makeApplication(base, APPLICATION_STATUS.ADMITTED, [subject._id]);
  jest.spyOn(Enrollment, 'insertMany').mockRejectedValueOnce(new Error('insert failed'));

  await expect(createStudent(requestFor(base.user), application._id)).rejects.toThrow('insert failed');

  expect((await User.findById(base.user._id)).role).toBe(ROLES.APPLICANT);
  expect(await Student.countDocuments({ applicationId: application._id })).toBe(0);
  expect(await Enrollment.countDocuments({})).toBe(0);
  expect(await AuditLog.countDocuments({ action: 'studentCreatedFromApplication' })).toBe(0);
});

test('full admission and exam flow stays consistent', async () => {
  const base = await makeBase();
  const subject = await Subject.create({
    code: 'FL101',
    name: 'Full Flow Subject',
    programId: base.program._id,
    semester: 1,
    category: 'major',
  });
  const application = await makeApplication(base, 'submitted', [subject._id], {
    subjectsApprovedAt: new Date(),
    documentsApprovedAt: new Date(),
  });
  await FeeStructure.create({
    purpose: PAYMENT_PURPOSE.ADMISSION,
    academicYearId: base.year._id,
    programId: base.program._id,
    yearOfStudy: 1,
    divisionType: DEFAULT_DIVISION,
    feesCategory: 'PAYING',
    heads: [{ key: 'tuition', label: 'Tuition', amountPaise: 100000 }],
    amountPaise: 100000,
  });

  const approved = await application.approveForm({ byUserId: id() });
  expect(approved.status).toBe(APPLICATION_STATUS.APPROVED);
  const admissionPayment = await makePayment(approved, base);
  await settlePaid(null, admissionPayment, 'pay_full_admission', { source: 'browser' });

  const feePaid = await Application.findById(application._id);
  expect(feePaid.status).toBe(APPLICATION_STATUS.FEE_PAID);
  await feePaid.receiveHardCopy({ byUserId: id() });
  expect((await Application.findById(application._id)).status).toBe(APPLICATION_STATUS.ADMITTED);

  const conversion = await createStudent(requestFor(base.user), application._id);
  expect((await User.findById(base.user._id)).role).toBe(ROLES.STUDENT);

  await FeeStructure.create({
    purpose: PAYMENT_PURPOSE.EXAM,
    academicYearId: base.year._id,
    programId: base.program._id,
    yearOfStudy: 1,
    divisionType: DEFAULT_DIVISION,
    feesCategory: 'PAYING',
    heads: [{ key: 'exam', label: 'Exam Fee', amountPaise: 50000 }],
    amountPaise: 50000,
  });
  const exam = await Exam.create({
    name: 'Full Flow Exam',
    academicYearId: base.year._id,
    programId: base.program._id,
    semester: 1,
    formOpensAt: new Date(Date.now() - 86400000),
    formClosesAt: new Date(Date.now() + 86400000),
    status: EXAM_STATUS.OPEN,
  });
  const form = await ExamForm.start({ examId: exam._id, studentId: conversion.student._id });
  await form.selectSubjects([subject._id]);
  await form.continueToPayment();
  const pendingForm = await ExamForm.findById(form._id);
  expect(pendingForm.status).toBe(EXAM_FORM_STATUS.PENDING_PAYMENT);

  const examPayment = await Payment.create({
    purpose: PAYMENT_PURPOSE.EXAM,
    payerUserId: base.user._id,
    academicYearId: base.year._id,
    feeStructureId: pendingForm.feeStructureId,
    examFormId: pendingForm._id,
    amountPaise: pendingForm.feeAmountPaise,
    gateway: PAYMENT_GATEWAY.FAKE,
    gatewayOrderId: `order_${id()}`,
  });
  await settlePaid(null, examPayment, 'pay_full_exam', { source: 'webhook' });

  expect((await ExamForm.findById(form._id)).status).toBe(EXAM_FORM_STATUS.SUBMITTED);
  expect((await Payment.findById(examPayment._id)).status).toBe(PAYMENT_STATUS.PAID);
  expect((await Application.findById(application._id)).status).toBe(APPLICATION_STATUS.ADMITTED);
});

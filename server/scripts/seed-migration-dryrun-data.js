import mongoose from 'mongoose';
import env from '../src/config/env.js';
import {
  ACADEMIC_YEAR_STATUS,
  APPLICATION_STATUS,
  AUDIT_OUTCOME,
  ENROLLMENT_STATUS,
  EXAM_FORM_STATUS,
  PAYMENT_GATEWAY,
  PAYMENT_PURPOSE,
  PAYMENT_STATUS,
  REFUND_STATUS,
  ROLES,
  USER_STATUS,
} from '../src/utils/constants.js';

const COUNT = {
  applications: 220,
  users: 3,
  years: 2,
  payments: 220,
  admissionPayments: 175,
  examForms: 50,
  enrollments: 300,
  duplicateEnrollments: 6,
  droppedEnrollments: 20,
  refunds: 220,
  refundBackfills: 120,
  refundUnresolved: 60,
};

// The restore drill reuses this dataset but needs a conflict-free collection so indexes can be built before the dump.
const includeDuplicateEnrollments = process.env.MIGRATION_DRYRUN_NO_DUPLICATES !== 'yes';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const at = (daysAgo) => new Date(now - daysAgo * DAY);
const oid = () => new mongoose.Types.ObjectId();
const padded = (n, width = 6) => String(n).padStart(width, '0');

if (process.env.MIGRATION_DRYRUN_CONFIRMED !== 'yes') {
  throw new Error('Set MIGRATION_DRYRUN_CONFIRMED=yes before seeding the migration dry-run scratch database');
}

await mongoose.connect(env.mongodbUri, { autoIndex: false, serverSelectionTimeoutMS: 10000 });

if (!/^migration_dryrun/i.test(mongoose.connection.name)) {
  await mongoose.connection.close();
  throw new Error(`Refusing to seed a non-scratch database: ${mongoose.connection.name}`);
}

await mongoose.connection.dropDatabase();
const db = mongoose.connection.db;

const yearIds = [oid(), oid()];
const yearLabels = ['2025-26', '2026-27'];
const programId = oid();
const departmentId = oid();
const feeIds = { admission: oid(), exam: oid() };
const examId = oid();
const userIds = Array.from({ length: COUNT.users }, oid);
const applicantIds = Array.from({ length: COUNT.applications }, oid);
const applicationIds = Array.from({ length: COUNT.applications }, oid);
const paymentIds = Array.from({ length: COUNT.payments }, oid);
const examFormIds = Array.from({ length: COUNT.examForms }, oid);
const subjectIds = Array.from({ length: 12 }, oid);
const studentIds = Array.from({ length: 60 }, oid);
const refundIds = Array.from({ length: COUNT.refunds }, oid);

await db.collection('academicyears').insertMany(yearIds.map((id, index) => ({
  _id: id,
  label: yearLabels[index],
  startDate: at(500 - index * 365),
  endDate: at(135 - index * 365),
  status: index === 1 ? ACADEMIC_YEAR_STATUS.CURRENT : ACADEMIC_YEAR_STATUS.CLOSED,
  isCurrent: index === 1,
  createdAt: at(520 - index * 365),
  updatedAt: at(135 - index * 365),
})));

await db.collection('departments').insertOne({
  _id: departmentId,
  name: 'Dry Run Department',
  code: 'DRY',
  isActive: true,
  createdAt: at(600),
  updatedAt: at(600),
});

await db.collection('programs').insertOne({
  _id: programId,
  name: 'Dry Run Program',
  code: 'DRYRUN',
  departmentId,
  level: 'Undergraduate',
  faculty: 'Arts and Humanities',
  durationYears: 3,
  isActive: true,
  createdAt: at(600),
  updatedAt: at(600),
});

await db.collection('feestructures').insertMany([
  {
    _id: feeIds.admission,
    purpose: PAYMENT_PURPOSE.ADMISSION,
    academicYearId: yearIds[1],
    programId,
    yearOfStudy: 1,
    divisionType: 'P.N.G.',
    feesCategory: 'PAYING',
    heads: [{ key: 'tuition', label: 'Tuition', amountPaise: 100000 }],
    amountPaise: 100000,
    createdAt: at(500),
    updatedAt: at(500),
  },
  {
    _id: feeIds.exam,
    purpose: PAYMENT_PURPOSE.EXAM,
    academicYearId: yearIds[1],
    programId,
    yearOfStudy: 1,
    divisionType: 'P.N.G.',
    feesCategory: 'PAYING',
    heads: [{ key: 'exam', label: 'Exam fee', amountPaise: 50000 }],
    amountPaise: 50000,
    createdAt: at(500),
    updatedAt: at(500),
  },
]);

await db.collection('users').insertMany(userIds.map((id, index) => ({
  _id: id,
  fullName: `Dry Run User ${index + 1}`,
  email: `dryrun${index + 1}@example.invalid`,
  passwordHash: 'dryrun-not-a-real-hash',
  role: index === 0 ? ROLES.APPLICANT : ROLES.SUPER_ADMIN,
  status: USER_STATUS.ACTIVE,
  emailVerifiedAt: at(400),
  createdAt: at(400),
  updatedAt: at(400),
})));

await db.collection('subjects').insertMany(subjectIds.map((id, index) => ({
  _id: id,
  code: `DRY${padded(index + 1, 3)}`,
  name: `Dry Run Subject ${index + 1}`,
  programId,
  semester: (index % 5) + 1,
  category: 'major',
  createdAt: at(500),
  updatedAt: at(500),
})));

await db.collection('exams').insertOne({
  _id: examId,
  name: 'Dry Run Exam',
  academicYearId: yearIds[1],
  programId,
  semester: 1,
  formOpensAt: at(10),
  formClosesAt: at(-10),
  status: 'open',
  createdAt: at(20),
  updatedAt: at(20),
});

const applicationDocs = applicationIds.map((id, index) => ({
  _id: id,
  applicantUserId: applicantIds[index],
  academicYearId: index % 3 === 0 ? yearIds[0] : yearIds[1],
  programId,
  yearOfStudy: 1,
  admissionType: 'Provisional',
  divisionType: 'P.N.G.',
  feesCategory: 'PAYING',
  aadhaarNumber: String(100000000000 + index).slice(0, 12),
  student: {
    fullName: `Dry Run Applicant ${index + 1}`,
    mobile: String(9000000000 + index).slice(0, 10),
    email: `applicant${index + 1}@example.invalid`,
    birthDate: at(365 * 20),
  },
  status: index % 7 === 0 ? APPLICATION_STATUS.FEE_PAID : APPLICATION_STATUS.ADMITTED,
  applicationNumber: `APP-2026-27-${padded(index + 1)}`,
  feeStructureId: feeIds.admission,
  feeAmountPaise: 100000,
  feePaidAt: at(60),
  submittedAt: at(90),
  createdAt: at(100),
  updatedAt: at(60),
}));
await db.collection('applications').insertMany(applicationDocs);

const paymentDocs = paymentIds.map((id, index) => {
  const isExam = index >= COUNT.admissionPayments;
  const examIndex = index - COUNT.admissionPayments;
  let examFormId;
  if (isExam && examIndex < 25) examFormId = examFormIds[examIndex];
  if (isExam && examIndex >= 37 && examIndex < 40) examFormId = examFormIds[40 + (examIndex - 37)];
  if (isExam && examIndex >= 40 && examIndex < 43) examFormId = examFormIds[43 + (examIndex - 40)];

  return {
    _id: id,
    purpose: isExam ? PAYMENT_PURPOSE.EXAM : PAYMENT_PURPOSE.ADMISSION,
    payerUserId: userIds[0],
    academicYearId: yearIds[1],
    feeStructureId: isExam ? feeIds.exam : feeIds.admission,
    ...(isExam ? { examFormId } : { applicationId: applicationIds[index] }),
    amountPaise: isExam ? 50000 : 100000,
    status: PAYMENT_STATUS.PAID,
    gateway: PAYMENT_GATEWAY.FAKE,
    gatewayOrderId: `order_dryrun_${padded(index + 1)}`,
    gatewayPaymentId: `pay_dryrun_${padded(index + 1)}`,
    paidAt: at(50),
    receiptNumber: `RCT-2026-27-${padded(index + 1)}`,
    createdAt: at(55),
    updatedAt: at(50),
  };
});
await db.collection('payments').insertMany(paymentDocs);

const formDoc = (formIndex, paymentId = null) => ({
  _id: examFormIds[formIndex],
  examId,
  studentId: studentIds[formIndex % studentIds.length],
  details: {
    enrollmentNumber: `ENR-2026-27-${padded(formIndex + 1)}`,
    fullName: `Dry Run Student ${formIndex + 1}`,
    mobile: String(9000000000 + formIndex).slice(0, 10),
    semester: 1,
    feesCategory: 'PAYING',
    divisionType: 'P.N.G.',
  },
  subjects: [{ subjectId: subjectIds[formIndex % subjectIds.length], code: `DRY${padded((formIndex % 12) + 1, 3)}`, name: 'Dry Run Subject', category: 'major' }],
  status: EXAM_FORM_STATUS.SUBMITTED,
  feeStructureId: feeIds.exam,
  feeAmountPaise: 50000,
  ...(paymentId ? { paymentId } : {}),
  submittedAt: at(45),
  createdAt: at(60),
  updatedAt: at(45),
});

const formDocs = [];
for (let i = 0; i < 25; i += 1) formDocs.push(formDoc(i, paymentIds[COUNT.admissionPayments + i]));
for (let i = 25; i < 37; i += 1) formDocs.push(formDoc(i, paymentIds[COUNT.admissionPayments + i]));
for (let i = 37; i < 40; i += 1) formDocs.push(formDoc(i, paymentIds[COUNT.admissionPayments + i]));
for (let i = 40; i < 43; i += 1) formDocs.push(formDoc(i));
for (let i = 43; i < 46; i += 1) formDocs.push(formDoc(i));
for (let i = 46; i < 50; i += 1) {
  const paymentIndex = COUNT.admissionPayments + (i < 48 ? 43 : 44);
  formDocs.push(formDoc(i, paymentIds[paymentIndex]));
}
await db.collection('examforms').insertMany(formDocs);

const enrollmentDocs = [];
for (let i = 0; i < COUNT.enrollments; i += 1) {
  enrollmentDocs.push({
    _id: oid(),
    studentId: studentIds[i % studentIds.length],
    subjectId: subjectIds[i % subjectIds.length],
    semester: Math.floor(i / studentIds.length) + 1,
    academicYearId: yearIds[1],
    status: ENROLLMENT_STATUS.ENROLLED,
    createdAt: at(40 - Math.floor(i / studentIds.length)),
    updatedAt: at(40 - Math.floor(i / studentIds.length)),
  });
}
for (let i = 0; i < (includeDuplicateEnrollments ? COUNT.duplicateEnrollments : 0); i += 1) {
  const source = enrollmentDocs[i];
  enrollmentDocs.push({
    ...source,
    _id: oid(),
    createdAt: at(80 + i),
    updatedAt: at(80 + i),
  });
}
for (let i = 0; i < COUNT.droppedEnrollments; i += 1) {
  enrollmentDocs.push({
    _id: oid(),
    studentId: studentIds[i],
    subjectId: subjectIds[i],
    semester: 1,
    academicYearId: yearIds[1],
    status: ENROLLMENT_STATUS.DROPPED,
    createdAt: at(120),
    updatedAt: at(30),
  });
}
await db.collection('enrollments').insertMany(enrollmentDocs);

const refundDocs = refundIds.map((id, index) => {
  const alreadyProcessed = index >= COUNT.refundBackfills + COUNT.refundUnresolved;
  return {
    _id: id,
    paymentId: paymentIds[index % COUNT.admissionPayments],
    purpose: PAYMENT_PURPOSE.ADMISSION,
    amountPaise: 10000,
    reason: 'Duplicate or cancelled admission fee',
    status: REFUND_STATUS.APPROVED,
    requestedByUserId: userIds[1],
    decidedByUserId: userIds[2],
    decidedAt: at(20),
    ...(alreadyProcessed ? { gatewayRefundId: `rf_done_${padded(index + 1)}`, processedAt: at(19) } : {}),
    createdAt: at(30),
    updatedAt: at(20),
  };
});
await db.collection('refunds').insertMany(refundDocs);

const auditDocs = [];
for (let i = 0; i < COUNT.refundBackfills; i += 1) {
  auditDocs.push({
    _id: oid(),
    actorUserId: userIds[2],
    action: 'refundDecided',
    entityType: 'refund',
    entityId: refundIds[i],
    outcome: AUDIT_OUTCOME.SUCCESS,
    ip: '127.0.0.1',
    details: { gatewayRefundId: `rf_recovered_${padded(i + 1)}` },
    createdAt: at(19),
  });
}
for (let i = 0; i < 10; i += 1) {
  auditDocs.push({
    _id: oid(),
    actorUserId: userIds[1],
    action: 'permissionDenied',
    entityType: 'admissionPayments',
    entityId: oid(),
    outcome: AUDIT_OUTCOME.DENIED,
    ip: '127.0.0.1',
    details: { reason: 'dry run noise' },
    createdAt: at(18),
  });
}
await db.collection('auditlogs').insertMany(auditDocs);

await db.collection('counters').insertOne({
  _id: `application:${yearLabels[0]}`,
  seq: 120,
  createdAt: at(100),
  updatedAt: at(30),
});

console.log(`Scratch database: ${mongoose.connection.name}`);
console.log(`Seeded applications=${applicationDocs.length} payments=${paymentDocs.length} examForms=${formDocs.length} enrollments=${enrollmentDocs.length} refunds=${refundDocs.length} auditLogs=${auditDocs.length}`);
console.log('Expected findings: 6 duplicate active groups; 12 payment backfills; 8 payment/link mismatches; 120 refund backfills; 60 unresolved refunds; 2 years to seed');

await mongoose.connection.close();

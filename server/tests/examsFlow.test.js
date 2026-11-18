import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Application from '../src/models/Application.js';
import ExamForm from '../src/models/ExamForm.js';
import FeeStructure from '../src/models/FeeStructure.js';
import AuditLog from '../src/models/AuditLog.js';
import { prepareDatabase, appFor, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
const as = (user) => appFor(user);
const examAdmin = () => as({ id: w.examAdmin._id, role: 'examAdmin' });
const student = () => as({ id: w.stu2User._id, role: 'student' });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'exams_api_test' });
  await prepareDatabase();
  w = await buildWorld();

  await FeeStructure.create({
    purpose: 'exam',
    academicYearId: w.year._id,
    programId: w.progA._id,
    yearOfStudy: 1,
    divisionType: 'P.N.G.',
    feesCategory: 'PAYING',
    amountPaise: 80000,
  });

  const application = await Application.create({
    applicantUserId: w.stu2User._id,
    academicYearId: w.year._id,
    programId: w.progA._id,
    feesCategory: 'PAYING',
    divisionType: 'P.N.G.',
    student: { fullName: 'Student Two', mobile: '9876543210', email: 'stu2@test.edu' },
  });
  await mongoose.model('Student').updateOne({ _id: w.stu2._id }, { $set: { applicationId: application._id } });
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

function examBody(over = {}) {
  return {
    name: 'End Semester API Exam',
    academicYearId: String(w.year._id),
    programId: String(w.progA._id),
    semester: 1,
    formOpensAt: new Date(Date.now() - 3600000).toISOString(),
    formClosesAt: new Date(Date.now() + 86400000).toISOString(),
    ...over,
  };
}

describe('exam routes', () => {
  let examId;
  let formId;

  test('only an exam admin can create an exam', async () => {
    expect((await request(student()).post('/exams').send(examBody())).status).toBe(403);

    const res = await request(examAdmin()).post('/exams').send(examBody());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    examId = res.body.data._id;
    expect(await AuditLog.countDocuments({ action: 'examCreated' })).toBe(1);
  });

  test('bad dates are refused and the exam can be opened', async () => {
    const bad = await request(examAdmin()).post('/exams').send(examBody({
      name: 'Bad Exam',
      formClosesAt: new Date(Date.now() - 7200000).toISOString(),
    }));
    expect(bad.status).toBe(400);

    const opened = await request(examAdmin()).patch(`/exams/${examId}`).send({ status: 'open' });
    expect(opened.status).toBe(200);
    expect(opened.body.data.status).toBe('open');
  });

  test('a student sees the open exam and starts a form with the offered subjects', async () => {
    const available = await request(student()).get('/exams/available');
    expect(available.status).toBe(200);
    expect(available.body.data.map((exam) => exam._id)).toContain(examId);

    const started = await request(student()).post(`/exams/${examId}/form`);
    expect(started.status).toBe(201);
    expect(started.body.data.details).toMatchObject({ enrollmentNumber: 'EN002', semester: 1, feesCategory: 'PAYING' });
    expect(started.body.data.offered.map((subject) => subject.code).sort()).toEqual(['CS101', 'CS102']);
    formId = started.body.data._id;
  });

  test('the student ticks subjects and continues to payment', async () => {
    const ticked = await request(student()).put(`/exam-forms/${formId}/subjects`).send({ subjectIds: [String(w.subject1._id)] });
    expect(ticked.status).toBe(200);
    expect(ticked.body.data.subjects).toHaveLength(1);

    const continued = await request(student()).post(`/exam-forms/${formId}/continue`);
    expect(continued.status).toBe(200);
    expect(continued.body.data).toMatchObject({ status: 'pendingPayment', feeAmountPaise: 80000 });
  });

  test('an exam admin can list forms and decide a submitted form', async () => {
    const list = await request(examAdmin()).get(`/exams/${examId}/forms`);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);

    expect((await request(examAdmin()).post(`/exam-forms/${formId}/decision`).send({ approve: true })).status).toBe(409);

    await ExamForm.updateOne({ _id: formId }, { $set: { status: 'submitted' } });
    const rejected = await request(examAdmin()).post(`/exam-forms/${formId}/decision`).send({ approve: false });
    expect(rejected.status).toBe(400);

    const approved = await request(examAdmin()).post(`/exam-forms/${formId}/decision`).send({ approve: true });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('approved');
  });

  test("another student cannot read someone else's form", async () => {
    const other = as({ id: w.stu1User._id, role: 'student' });
    expect((await request(other).get(`/exam-forms/${formId}`)).status).toBe(404);
  });
});

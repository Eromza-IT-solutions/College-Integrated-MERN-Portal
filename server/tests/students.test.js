import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import Teacher from '../src/models/Teacher.js';
import Timetable from '../src/models/Timetable.js';
import Marks from '../src/models/Marks.js';
import TeachingPlan from '../src/models/TeachingPlan.js';
import AuditLog from '../src/models/AuditLog.js';
import { prepareDatabase, appFor, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
let stuBUser;
let stuB;
let subject3;
let deptBProgram;
let subject1Enrollment;
let marksId;
let planId;

const as = (user) => appFor(user);
const admin = () => as({ id: w.superAdmin._id, role: 'superAdmin' });
const examAdmin = () => as({ id: w.examAdmin._id, role: 'examAdmin' });
const hodA = () => as({ id: w.hodA._id, role: 'hod', departmentId: w.deptA._id });
const hodB = () => as({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id });
const teacher1 = () => as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id });
const student1 = () => as({ id: w.stu1User._id, role: 'student' });

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri(), { dbName: 'students_test' });
  await prepareDatabase();
  w = await buildWorld();

  await User.updateOne({ _id: w.stu1User._id }, { $set: { mobile: '9876543210', aadhaarLast4: '1234' } });

  deptBProgram = await Program.create({
    name: 'F.Y.B.Com.', code: 'FYCOM', departmentId: w.deptB._id, level: 'Undergraduate',
  });
  stuBUser = await User.create({
    fullName: 'Commerce Student', email: 'commerce.student@test.edu', passwordHash: 'x'.repeat(60),
    role: 'student', status: 'active',
  });
  stuB = await Student.create({
    userId: stuBUser._id, applicationId: new mongoose.Types.ObjectId(), programId: deptBProgram._id,
    admissionYearId: w.year._id, enrollmentNumber: 'EN009', currentSemester: 1, division: 'A',
  });

  subject3 = await Subject.create({
    code: 'CS201', name: 'Data Structures', programId: w.progA._id, semester: 2, category: 'major',
  });

  await Teacher.create([
    { userId: w.teacher1._id, employeeNumber: 'EMP-T1', departmentId: w.deptA._id, designation: 'Assistant Professor' },
    { userId: w.teacher2._id, employeeNumber: 'EMP-T2', departmentId: w.deptA._id, designation: 'Assistant Professor' },
    { userId: w.hodA._id, employeeNumber: 'EMP-HA', departmentId: w.deptA._id, designation: 'Head' },
    { userId: w.hodB._id, employeeNumber: 'EMP-HB', departmentId: w.deptB._id, designation: 'Head' },
  ]);

  subject1Enrollment = await Enrollment.findOne({ studentId: w.stu1._id, subjectId: w.subject1._id, semester: 1 });
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('students list and detail', () => {
  test('the list follows own, department and all scopes', async () => {
    expect((await request(hodA()).get('/students')).body.meta.total).toBe(2);
    expect((await request(teacher1()).get('/students')).body.meta.total).toBe(2);
    expect((await request(student1()).get('/students')).body.meta.total).toBe(1);

    const b = await request(hodB()).get('/students');
    expect(b.body.meta.total).toBe(1);
    expect(b.body.data[0].enrollmentNumber).toBe('EN009');

    expect((await request(admin()).get('/students')).body.meta.total).toBe(3);
  });

  test('search and filters are applied', async () => {
    const byName = await request(hodA()).get('/students?search=stu1');
    expect(byName.body.meta.total).toBe(1);
    expect(byName.body.data[0].enrollmentNumber).toBe('EN001');

    const byProgram = await request(admin()).get(`/students?programId=${w.progA._id}&division=A`);
    expect(byProgram.body.meta.total).toBe(2);
  });

  test('another department HOD gets 404 for a student', async () => {
    expect((await request(hodA()).get(`/students/${w.stu1._id}`)).status).toBe(200);
    expect((await request(hodB()).get(`/students/${w.stu1._id}`)).status).toBe(404);
    expect((await request(hodB()).get(`/students/${stuB._id}`)).status).toBe(200);
  });

  test('the list never returns a full mobile number or Aadhaar number', async () => {
    const res = await request(admin()).get('/students?search=EN001');
    expect(res.status).toBe(200);
    expect(res.body.data[0].user.mobile).toBeUndefined();
    expect(res.body.data[0].user.mobileLast4).toBe('3210');
    expect(res.body.data[0].user.aadhaarLast4).toBe('1234');
    expect(JSON.stringify(res.body)).not.toContain('9876543210');
  });

  test('contact details are hidden from a department HOD but shown to admission staff', async () => {
    const hod = await request(hodA()).get(`/students/${w.stu1._id}`);
    expect(hod.body.data.student.user.mobile).toBeUndefined();
    expect(hod.body.data.student.user.mobileLast4).toBe('3210');

    const adm = await request(admin()).get(`/students/${w.stu1._id}`);
    expect(adm.body.data.student.user.mobile).toBe('9876543210');
  });
});

describe('students update and deactivate', () => {
  test('a student may change a contact field but not division', async () => {
    const ok = await request(student1()).patch(`/students/${w.stu1._id}`).send({ mobile: '9123456789' });
    expect(ok.status).toBe(200);
    expect((await User.findById(w.stu1User._id)).mobile).toBe('9123456789');

    expect((await request(student1()).patch(`/students/${w.stu1._id}`).send({ division: 'B' })).status).toBe(403);
  });

  test('admission staff can change division, semester and status', async () => {
    const res = await request(admin()).patch(`/students/${w.stu1._id}`).send({ division: 'B', currentSemester: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.student).toMatchObject({ division: 'B', currentSemester: 3, yearOfStudy: 2 });

    const bad = await request(admin()).patch(`/students/${w.stu1._id}`).send({ currentSemester: 2, yearOfStudy: 2 });
    expect(bad.status).toBe(400);
  });

  test('a withdrawn or graduated status deactivates the login account', async () => {
    const res = await request(admin()).patch(`/students/${w.stu2._id}`).send({ status: 'graduated' });
    expect(res.status).toBe(200);
    expect((await Student.findById(w.stu2._id)).status).toBe('graduated');
    expect((await User.findById(w.stu2User._id)).status).toBe('deactivated');
  });

  test('delete is only for Super Admin and only deactivates', async () => {
    expect((await request(hodA()).delete(`/students/${stuB._id}`)).status).toBe(403);
    const res = await request(admin()).delete(`/students/${stuB._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.student.status).toBe('withdrawn');
    expect((await Student.findById(stuB._id)).status).toBe('withdrawn');
    expect((await User.findById(stuBUser._id)).status).toBe('deactivated');
    expect(await AuditLog.countDocuments({ action: 'studentDeactivated', entityId: stuB._id })).toBe(1);
  });
});

describe('enrollments', () => {
  test('a subject can be added once, and a student cannot add it to themselves', async () => {
    const list = await request(admin()).get(`/students/${w.stu1._id}/enrollments`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);

    const add = await request(admin()).post(`/students/${w.stu1._id}/enrollments`).send({ subjectId: String(subject3._id), semester: 2 });
    expect(add.status).toBe(201);
    expect(add.body.data.status).toBe('enrolled');

    const again = await request(admin()).post(`/students/${w.stu1._id}/enrollments`).send({ subjectId: String(subject3._id), semester: 2 });
    expect(again.status).toBe(409);

    expect((await request(student1()).post(`/students/${w.stu1._id}/enrollments`).send({ subjectId: String(subject3._id), semester: 2 })).status).toBe(403);
    expect((await request(hodA()).post(`/students/${w.stu1._id}/enrollments`).send({ subjectId: String(subject3._id), semester: 2 })).status).toBe(403);
  });

  test('a subject with no marks can be dropped; one with marks cannot', async () => {
    const added = await Enrollment.findOne({ studentId: w.stu1._id, subjectId: subject3._id, semester: 2 });
    const drop = await request(admin()).delete(`/students/${w.stu1._id}/enrollments/${added._id}`);
    expect(drop.status).toBe(200);
    expect(drop.body.data.status).toBe('dropped');

    const mark = await Marks.create({
      studentId: w.stu1._id, subjectId: w.subject1._id, programId: w.progA._id, departmentId: w.deptA._id,
      semester: 1, academicYearId: w.year._id, component: 'Unit Test', obtained: 10, outOf: 20, enteredByUserId: w.teacher1._id,
    });
    marksId = mark._id;

    const blocked = await request(admin()).delete(`/students/${w.stu1._id}/enrollments/${subject1Enrollment._id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('ENROLLMENT_IN_USE');
  });

  test('promotion moves the semester and enrolls the next semester subjects', async () => {
    await request(admin()).patch(`/students/${w.stu1._id}`).send({ currentSemester: 1 });
    const res = await request(admin()).post(`/students/${w.stu1._id}/promote`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.student).toMatchObject({ currentSemester: 2, yearOfStudy: 1 });
    expect(res.body.data.enrolled).toBe(1);

    const row = await Enrollment.findOne({ studentId: w.stu1._id, subjectId: subject3._id, semester: 2 });
    expect(row.status).toBe('enrolled');
  });
});

describe('cross-department reads are 404', () => {
  test('marks', async () => {
    expect((await request(hodA()).get(`/marks/${marksId}`)).status).toBe(200);
    expect((await request(hodB()).get(`/marks/${marksId}`)).status).toBe(404);
  });

  test('an HOD who teaches in another department cannot approve those marks', async () => {
    await Timetable.create({
      academicYearId: w.year._id, programId: w.progA._id, departmentId: w.deptA._id,
      semester: 1, division: 'B', subjectId: w.subject2._id, teacherUserId: w.hodB._id, dayOfWeek: 2, period: 5,
    });

    const entered = await request(hodB()).post('/marks').send({
      subjectId: String(w.subject2._id), semester: 1, academicYearId: String(w.year._id),
      component: 'Cross Dept', outOf: 20, entries: [{ studentId: String(w.stu1._id), obtained: 15 }],
    });
    expect(entered.status).toBe(200);
    const id = entered.body.data.saved[0].markId;

    expect((await request(hodB()).post('/marks/submit').send({ ids: [id] })).status).toBe(200);
    const decision = await request(hodB()).post('/marks/decision').send({ ids: [id], approve: true });
    expect(decision.status).toBe(200);
    expect(decision.body.data).toMatchObject({ decided: 0, skipped: 1 });
    expect((await Marks.findById(id)).status).toBe('submitted');
  });

  test('teaching plan', async () => {
    const plan = await TeachingPlan.start({
      teacherUserId: w.teacher1._id, subjectId: w.subject1._id, semester: 1, academicYearId: w.year._id,
    });
    planId = plan._id;
    expect((await request(hodA()).get(`/teaching-plans/${planId}`)).status).toBe(200);
    expect((await request(hodB()).get(`/teaching-plans/${planId}`)).status).toBe(404);
  });

  test('exam form', async () => {
    expect((await request(hodA()).get(`/exam-forms/${w.examForm._id}`)).status).toBe(200);
    expect((await request(hodB()).get(`/exam-forms/${w.examForm._id}`)).status).toBe(404);
  });

  test('result', async () => {
    const open = await request(examAdmin()).post('/results/open').send({ examFormId: String(w.examForm._id) });
    expect(open.status).toBe(201);
    const id = open.body.data._id;

    const put = await request(examAdmin()).put(`/results/${id}/marks`).send({
      entries: [
        { subjectId: String(w.subject1._id), internalMarks: 25, externalMarks: 50 },
        { subjectId: String(w.subject2._id), internalMarks: 25, externalMarks: 50 },
      ],
    });
    expect(put.status).toBe(200);
    expect((await request(examAdmin()).post(`/results/${id}/publish`)).status).toBe(200);

    expect((await request(hodA()).get(`/results/${id}`)).status).toBe(200);
    expect((await request(hodB()).get(`/results/${id}`)).status).toBe(404);
  });
});

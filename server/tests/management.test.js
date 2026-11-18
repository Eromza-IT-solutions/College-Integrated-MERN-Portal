import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import AcademicYear from '../src/models/AcademicYear.js';
import AuditLog from '../src/models/AuditLog.js';
import { prepareDatabase, appFor, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
const as = (user) => appFor(user);
const superAdmin = () => as({ id: w.superAdmin._id, role: 'superAdmin' });
const examAdmin = () => as({ id: w.examAdmin._id, role: 'examAdmin' });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'management_test' });
  await prepareDatabase();
  w = await buildWorld();
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Super Admin management routes', () => {
  let departmentId;
  let programId;
  let subjectId;
  let teacherId;
  let feeId;

  test('permissions are enforced and a department can be created', async () => {
    expect((await request(examAdmin()).get('/admin/programs')).status).toBe(403);
    expect((await request(superAdmin()).get('/admin/programs')).status).toBe(200);

    const created = await request(superAdmin()).post('/admin/departments').send({ code: 'phy', name: 'Physics' });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('PHY');
    departmentId = created.body.data._id;
  });

  test('a program, subject and fee structure can be created', async () => {
    const program = await request(superAdmin()).post('/admin/programs').send({
      name: 'F.Y.B.Sc. Physics', code: 'FYPH', departmentId, level: 'Undergraduate',
    });
    expect(program.status).toBe(201);
    expect(program.body.data.durationYears).toBe(3);
    programId = program.body.data._id;

    expect((await request(superAdmin()).post('/admin/programs').send({
      name: 'Another Physics', code: 'FYPH', departmentId, level: 'Undergraduate',
    })).status).toBe(409);

    const subject = await request(superAdmin()).post('/admin/subjects').send({
      code: 'PH101', name: 'Mechanics', programId, semester: 1, category: 'major',
    });
    expect(subject.status).toBe(201);
    subjectId = subject.body.data._id;

    const fee = await request(superAdmin()).post('/admin/fee-structures').send({
      purpose: 'admission',
      academicYearId: String(w.year._id),
      programId,
      yearOfStudy: 1,
      feesCategory: 'PAYING',
      heads: [{ key: 'tuitionFee', label: 'Tuition Fee', amountPaise: 500000 }],
    });
    expect(fee.status).toBe(201);
    expect(fee.body.data.amountPaise).toBe(500000);
    feeId = fee.body.data._id;
  });

  test('updates and deactivation work, and an in-use department is protected', async () => {
    const updated = await request(superAdmin()).patch(`/admin/subjects/${subjectId}`).send({ name: 'Classical Mechanics' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Classical Mechanics');

    const deactivated = await request(superAdmin()).delete(`/admin/fee-structures/${feeId}`);
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.isActive).toBe(false);

    expect((await request(superAdmin()).delete(`/admin/departments/${w.deptA._id}`)).status).toBe(409);
  });

  test('academic year creation makes the new current year the only current one', async () => {
    const created = await request(superAdmin()).post('/admin/academic-years').send({
      label: '2027-28', startDate: '2027-06-01', endDate: '2028-05-31', status: 'current',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.isCurrent).toBe(true);
    expect((await AcademicYear.findById(w.year._id)).status).toBe('closed');
    expect(await AcademicYear.countDocuments({ status: 'current' })).toBe(1);
  });

  test('staff users and teachers are created with a forced password change', async () => {
    const user = await request(superAdmin()).post('/admin/users').send({
      fullName: 'Website Person', email: 'web@test.edu', password: 'Correct-Horse-Battery-9', role: 'websiteAdmin',
    });
    expect(user.status).toBe(201);
    const saved = await User.findById(user.body.data._id);
    expect(saved.mustChangePassword).toBe(true);
    expect(saved.emailVerifiedAt).toBeInstanceOf(Date);

    const teacher = await request(superAdmin()).post('/admin/teachers').send({
      fullName: 'Physics Teacher', email: 'physics@test.edu', password: 'Correct-Horse-Battery-9',
      role: 'teacher', departmentId, employeeNumber: 'EMP-100', designation: 'Assistant Professor',
    });
    expect(teacher.status).toBe(201);
    teacherId = teacher.body.data._id;
    expect((await User.findOne({ email: 'physics@test.edu' })).mustChangePassword).toBe(true);

    const moved = await request(superAdmin()).patch(`/admin/teachers/${teacherId}`).send({ designation: 'Associate Professor' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.designation).toBe('Associate Professor');
  });

  test('a Super Admin cannot change their own role or deactivate the last Super Admin', async () => {
    expect((await request(superAdmin()).patch(`/admin/users/${w.superAdmin._id}`).send({ role: 'examAdmin' })).status).toBe(400);
    expect((await request(superAdmin()).delete(`/admin/users/${w.superAdmin._id}`)).status).toBe(400);
    expect(await User.countDocuments({ role: 'superAdmin', status: 'active' })).toBe(1);
    expect(await AuditLog.countDocuments({ action: 'departmentCreated' })).toBe(1);
  });

  test('bad ids and unknown references are refused', async () => {
    expect((await request(superAdmin()).patch('/admin/programs/not-an-id').send({ name: 'X' })).status).toBe(400);
    expect((await request(superAdmin()).post('/admin/subjects').send({
      code: 'X1', name: 'Missing program', programId: new mongoose.Types.ObjectId().toString(), semester: 1, category: 'major',
    })).status).toBe(400);
  });
});

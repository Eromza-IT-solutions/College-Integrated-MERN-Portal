import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import { prepareDatabase, appFor, buildWorld, shiftDate } from './helpers/academicsWorld.js';

// Endpoints added so the frontend pages can be connected:
//   GET /attendance/my-records   (student's lecture-by-lecture attendance)
//   GET /timetable/reference     (dropdown data for the timetable form)
jest.setTimeout(60000);

let mongod;
let w;
const as = (u) => appFor(u);

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri(), { dbName: 'frontend_connect_test' });
  await prepareDatabase();
  w = await buildWorld();
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('GET /attendance/my-records', () => {
  const teacher1 = () => as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id });
  const student1 = () => as({ id: w.stu1User._id, role: 'student' });
  const student2 = () => as({ id: w.stu2User._id, role: 'student' });

  test('401 without login; a teacher gets 403', async () => {
    expect((await request(as(null)).get('/attendance/my-records')).status).toBe(401);
    expect((await request(teacher1()).get('/attendance/my-records')).status).toBe(403);
  });

  test('a student with no lectures yet gets an empty list', async () => {
    const res = await request(student1()).get('/attendance/my-records');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test("each student sees only their own status for the lecture", async () => {
    const mark = await request(teacher1()).post('/attendance/mark').send({
      slotId: String(w.slot1._id), lectureDate: w.today,
      records: [{ studentId: String(w.stu1._id), status: 'present' }, { studentId: String(w.stu2._id), status: 'absent' }],
    });
    expect(mark.status).toBe(201);

    const one = await request(student1()).get('/attendance/my-records');
    expect(one.body.data).toHaveLength(1);
    expect(one.body.data[0]).toMatchObject({ lectureDate: w.today, status: 'present', period: 1 });
    expect(one.body.data[0].subject.code).toBeTruthy();

    const two = await request(student2()).get('/attendance/my-records');
    expect(two.body.data[0].status).toBe('absent');
  });

  test('from / to filter the dates; a bad date is 400', async () => {
    const none = await request(student1()).get(`/attendance/my-records?from=${shiftDate(w.today, 1)}`);
    expect(none.body.data).toEqual([]);
    const inside = await request(student1()).get(`/attendance/my-records?from=${w.today}&to=${w.today}`);
    expect(inside.body.data).toHaveLength(1);
    expect((await request(student1()).get('/attendance/my-records?from=yesterday')).status).toBe(400);
  });
});

describe('GET /timetable/reference', () => {
  const hodA = () => as({ id: w.hodA._id, role: 'hod', departmentId: w.deptA._id });
  const hodB = () => as({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id });
  const superAdmin = () => as({ id: w.superAdmin._id, role: 'superAdmin' });

  test('a student or a teacher cannot use it (403)', async () => {
    expect((await request(as({ id: w.stu1User._id, role: 'student' })).get('/timetable/reference')).status).toBe(403);
    expect((await request(as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id })).get('/timetable/reference')).status).toBe(403);
  });

  test('without a class only years and classes come back', async () => {
    const res = await request(hodA()).get('/timetable/reference');
    expect(res.status).toBe(200);
    expect(res.body.data.academicYears.length).toBeGreaterThan(0);
    expect(res.body.data.programs.map((p) => String(p._id))).toContain(String(w.progA._id));
    expect(res.body.data.subjects).toEqual([]);
    expect(res.body.data.teachers).toEqual([]);
  });

  test('with a class: its subjects and the department teachers', async () => {
    const res = await request(hodA()).get(`/timetable/reference?programId=${w.progA._id}&semester=1`);
    expect(res.status).toBe(200);
    expect(res.body.data.subjects.map((s) => String(s._id))).toEqual(expect.arrayContaining([String(w.subject1._id), String(w.subject2._id)]));
    expect(res.body.data.teachers.map((t) => String(t._id))).toContain(String(w.teacher1._id));
  });

  test("another department's HOD does not see this class; the Super Admin does", async () => {
    const other = await request(hodB()).get(`/timetable/reference?programId=${w.progA._id}`);
    expect(other.status).toBe(200);
    expect(other.body.data.programs.map((p) => String(p._id))).not.toContain(String(w.progA._id));
    expect(other.body.data.subjects).toEqual([]);
    const sa = await request(superAdmin()).get(`/timetable/reference?programId=${w.progA._id}`);
    expect(sa.body.data.subjects.length).toBeGreaterThan(0);
  });

  test('a bad programId is 400', async () => {
    expect((await request(hodA()).get('/timetable/reference?programId=abc')).status).toBe(400);
  });
});

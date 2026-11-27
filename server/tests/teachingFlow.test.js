import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import TeachingPlan from '../src/models/TeachingPlan.js';
import { prepareDatabase, appFor, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
const as = (user) => appFor(user);
const teacher = () => as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id });
const otherTeacher = () => as({ id: w.teacher2._id, role: 'teacher', departmentId: w.deptA._id });
const hod = () => as({ id: w.hodA._id, role: 'hod', departmentId: w.deptA._id });
const student = () => as({ id: w.stu1User._id, role: 'student' });

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri(), { dbName: 'teaching_api_test' });
  await prepareDatabase();
  w = await buildWorld();
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('teaching plan routes', () => {
  let planId;
  let topicId;

  test('a teacher starts a plan for a subject they teach', async () => {
    const res = await request(teacher()).post('/teaching-plans').send({
      subjectId: String(w.subject1._id),
      semester: 1,
      academicYearId: String(w.year._id),
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'draft', semester: 1, progressPercent: 0 });
    planId = res.body.data._id;
    expect(String(res.body.data.departmentId)).toBe(String(w.deptA._id));

    expect((await request(teacher()).post('/teaching-plans').send({
      subjectId: String(w.subject1._id), semester: 1, academicYearId: String(w.year._id),
    })).status).toBe(409);
  });

  test('another teacher cannot see the plan', async () => {
    expect((await request(otherTeacher()).get(`/teaching-plans/${planId}`)).status).toBe(404);
    expect((await request(teacher()).get(`/teaching-plans/${planId}`)).status).toBe(200);
  });

  test('topics are added, the plan is submitted and only a HOD decides it', async () => {
    const topics = await request(teacher()).put(`/teaching-plans/${planId}/topics`).send({
      topics: [
        { weekNo: 1, title: 'Introduction', plannedHours: 4 },
        { weekNo: 2, title: 'Data types', plannedHours: 3 },
      ],
    });
    expect(topics.status).toBe(200);
    expect(topics.body.data.topics).toHaveLength(2);
    topicId = topics.body.data.topics[0]._id;

    expect((await request(teacher()).post(`/teaching-plans/${planId}/submit`)).status).toBe(200);
    expect((await request(teacher()).post(`/teaching-plans/${planId}/decision`).send({ approve: true })).status).toBe(403);

    const returned = await request(hod()).post(`/teaching-plans/${planId}/decision`).send({ approve: false, note: 'Add practicals' });
    expect(returned.status).toBe(200);
    expect(returned.body.data.status).toBe('returned');

    const revised = await request(teacher()).put(`/teaching-plans/${planId}/topics`).send({
      topics: [{ weekNo: 1, title: 'Introduction', plannedHours: 4 }],
    });
    topicId = revised.body.data.topics[0]._id;
    await request(teacher()).post(`/teaching-plans/${planId}/submit`);
    const approved = await request(hod()).post(`/teaching-plans/${planId}/decision`).send({ approve: true });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('approved');
  });

  test('progress is recorded after approval and the HOD can list department plans', async () => {
    const progress = await request(teacher()).patch(`/teaching-plans/${planId}/topics/${topicId}`)
      .send({ status: 'done', completedOn: '2026-11-16' });
    expect(progress.status).toBe(200);
    expect(progress.body.data.progressPercent).toBe(100);

    const list = await request(hod()).get('/teaching-plans');
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].progressPercent).toBe(100);
  });

  test('the model computes progress', async () => {
    const plan = await TeachingPlan.findById(planId);
    expect(plan.progressPercent()).toBe(100);
  });
});

describe('GET /students/me', () => {
  test('a student sees their profile, program and enrolled subjects', async () => {
    const res = await request(student()).get('/students/me');
    expect(res.status).toBe(200);
    expect(res.body.data.student).toMatchObject({ enrollmentNumber: 'EN001', currentSemester: 1, division: 'A' });
    expect(res.body.data.program).toMatchObject({ code: 'FYCS' });
    expect(res.body.data.admissionYear).toMatchObject({ label: '2026-27' });
    expect(res.body.data.enrollments.map((e) => e.subjectId.code).sort()).toEqual(['CS101', 'CS102']);
  });

  test('a user without a student record gets 404', async () => {
    expect((await request(teacher()).get('/students/me')).status).toBe(404);
  });
});

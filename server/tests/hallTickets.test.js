import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import { prepareDatabase, appFor, buildWorld } from './helpers/academicsWorld.js';

jest.setTimeout(60000);

let mongod;
let w;
const as = (user) => appFor(user);
const examAdmin = () => as({ id: w.examAdmin._id, role: 'examAdmin' });
const student1 = () => as({ id: w.stu1User._id, role: 'student' });
const student2 = () => as({ id: w.stu2User._id, role: 'student' });

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri(), { dbName: 'hall_tickets_test' });
  await prepareDatabase();
  w = await buildWorld();
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('hall tickets', () => {
  let ticketId;

  test('only the exam office can generate tickets', async () => {
    expect((await request(student1()).post(`/exams/${w.exam._id}/hall-tickets/generate`).send({})).status).toBe(403);

    const generated = await request(examAdmin()).post(`/exams/${w.exam._id}/hall-tickets/generate`).send({});
    expect(generated.status).toBe(201);
    expect(generated.body.data).toMatchObject({ created: 1, updated: 0, skipped: 0 });
    expect(generated.body.data.rows).toHaveLength(1);

    const ticket = generated.body.data.rows[0];
    ticketId = ticket._id;
    expect(ticket).toMatchObject({
      enrollmentNumber: 'EN001',
      fullName: 'stu1 Name',
      semester: 1,
      seatNumber: 'S-001',
      status: 'issued',
    });
    expect(ticket.schedule.map((paper) => paper.code)).toEqual(['CS101', 'CS102']);
    expect(ticket.schedule[0]).toMatchObject({ startTime: '10:00', endTime: '12:00', room: '101' });
  });

  test('the exam office can list tickets and a student sees only their own', async () => {
    const list = await request(examAdmin()).get(`/exams/${w.exam._id}/hall-tickets`);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);

    const mine = await request(student1()).get('/exam-forms/hall-tickets/me');
    expect(mine.status).toBe(200);
    expect(mine.body.data.map((ticket) => ticket._id)).toEqual([ticketId]);

    const other = await request(student2()).get('/exam-forms/hall-tickets/me');
    expect(other.status).toBe(200);
    expect(other.body.data).toEqual([]);
  });

  test('a student can download their own ticket, but not another student ticket', async () => {
    const own = await request(student1()).get(`/exam-forms/hall-tickets/${ticketId}/pdf`);
    expect(own.status).toBe(200);
    expect(own.headers['content-type']).toMatch(/application\/pdf/);
    expect(own.body.subarray(0, 4).toString()).toBe('%PDF');

    const other = await request(student2()).get(`/exam-forms/hall-tickets/${ticketId}/pdf`);
    expect(other.status).toBe(404);
  });

  test('a blocked ticket cannot be downloaded', async () => {
    const blocked = await request(examAdmin()).patch(`/exam-forms/hall-tickets/${ticketId}`).send({ status: 'blocked' });
    expect(blocked.status).toBe(200);
    expect(blocked.body.data).toMatchObject({ status: 'blocked', blockedReason: 'Blocked by the exam office' });

    expect((await request(student1()).get(`/exam-forms/hall-tickets/${ticketId}/pdf`)).status).toBe(409);
  });

  test('regenerating with overwrite keeps the seat and issues the ticket again', async () => {
    const regenerated = await request(examAdmin())
      .post(`/exams/${w.exam._id}/hall-tickets/generate`)
      .send({ overwrite: true });
    expect(regenerated.status).toBe(201);
    expect(regenerated.body.data).toMatchObject({ created: 0, updated: 1, skipped: 0 });
    expect(regenerated.body.data.rows[0]).toMatchObject({ seatNumber: 'S-001', status: 'issued' });
  });
});

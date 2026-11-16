import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Attendance from '../src/models/Attendance.js';
import AuditLog from '../src/models/AuditLog.js';
import Marks from '../src/models/Marks.js';
import { prepareDatabase, appFor, buildWorld, shiftDate } from './helpers/academicsWorld.js';

// Asli MongoDB (memory me) par poora flow: timetable -> attendance -> marks -> result publish.
// Pehli baar mongodb-memory-server ek mongod binary download karta hai (internet chahiye), isliye timeout bada hai.
jest.setTimeout(60000);

let mongod;
let w; // world
const as = (u) => appFor(u);
const hodAOf = () => as({ id: w.hodA._id, role: 'hod', departmentId: w.deptA._id });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'academics_test' });
  await prepareDatabase();
  w = await buildWorld();
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// Tests upar se neeche order me chalte hain aur ek hi "college" share karte hain.

describe('timetable', () => {
  const newSlot = (over = {}) => ({
    academicYearId: String(w.year._id), programId: String(w.progA._id), semester: 1, division: 'A', subjectId: String(w.subject2._id),
    teacherUserId: String(w.teacher2._id), dayOfWeek: 2, period: 2, ...over,
  });

  test('401 when nobody is signed in', async () => {
    const res = await request(as(null)).get('/timetable');
    expect(res.status).toBe(401);
  });

  test('HOD of the department adds a slot (201); an audit row is written', async () => {
    const res = await request(hodAOf()).post('/timetable').send(newSlot());
    expect(res.status).toBe(201);
    expect(res.body.data.departmentId).toBe(String(w.deptA._id)); // department class se bhara gaya, client se nahi
    expect(await AuditLog.countDocuments({ action: 'timetableSlotCreated' })).toBe(1);
  });

  test("another department's HOD cannot add a slot to this class (403)", async () => {
    const res = await request(as({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id })).post('/timetable').send(newSlot({ dayOfWeek: 3 }));
    expect(res.status).toBe(403);
  });

  test('a teacher cannot add slots (403); bad input is 400', async () => {
    expect((await request(as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id })).post('/timetable').send(newSlot({ dayOfWeek: 4 }))).status).toBe(403);
    const bad = await request(hodAOf()).post('/timetable').send(newSlot({ dayOfWeek: 9 }));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('the same teacher in the same period twice is refused (409)', async () => {
    const res = await request(hodAOf()).post('/timetable').send(newSlot());
    expect(res.status).toBe(409);
  });

  test('a teacher sees only own slots; a student sees the class timetable', async () => {
    const t1 = await request(as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id })).get('/timetable');
    expect(t1.body.meta.total).toBe(1);
    const st = await request(as({ id: w.stu1User._id, role: 'student' })).get('/timetable');
    expect(st.status).toBe(200);
    expect(st.body.meta.total).toBe(2);
  });

  test('the HOD can switch a slot off (isActive false) and it disappears from lists', async () => {
    const created = await request(hodAOf()).post('/timetable').send(newSlot({ dayOfWeek: 5, period: 3 }));
    const off = await request(hodAOf()).patch(`/timetable/${created.body.data._id}`).send({ isActive: false });
    expect(off.status).toBe(200);
    const st = await request(as({ id: w.stu1User._id, role: 'student' })).get('/timetable');
    expect(st.body.meta.total).toBe(2);
  });
});

describe('attendance', () => {
  const teacher1 = () => as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id });

  test('the slot teacher gets the roster; another teacher gets 403', async () => {
    const ok = await request(teacher1()).get(`/attendance/roster?slotId=${w.slot1._id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.students).toHaveLength(2);
    const no = await request(as({ id: w.teacher2._id, role: 'teacher', departmentId: w.deptA._id })).get(`/attendance/roster?slotId=${w.slot1._id}`);
    expect(no.status).toBe(403);
  });

  test('marking: students left out of the list become absent', async () => {
    const res = await request(teacher1()).post('/attendance/mark').send({ slotId: String(w.slot1._id), lectureDate: w.today, records: [{ studentId: String(w.stu1._id), status: 'present' }] });
    expect(res.status).toBe(201);
    expect(res.body.data.counts).toMatchObject({ total: 2, present: 1, absent: 1 });
  });

  test('marking again corrects the same register (200, still ONE register)', async () => {
    const res = await request(teacher1()).post('/attendance/mark').send({
      slotId: String(w.slot1._id), lectureDate: w.today,
      records: [{ studentId: String(w.stu1._id), status: 'present' }, { studentId: String(w.stu2._id), status: 'present' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.corrected).toBe(true);
    expect(await Attendance.countDocuments({ slotId: w.slot1._id })).toBe(1);
    expect(await AuditLog.countDocuments({ action: 'attendanceCorrected' })).toBe(1);
  });

  test('future date and wrong weekday are refused (400)', async () => {
    const future = await request(teacher1()).post('/attendance/mark').send({ slotId: String(w.slot1._id), lectureDate: shiftDate(w.today, 7), records: [] });
    expect(future.status).toBe(400);
    const wrongDay = await request(teacher1()).post('/attendance/mark').send({ slotId: String(w.slot1._id), lectureDate: shiftDate(w.today, -1), records: [] });
    expect(wrongDay.status).toBe(400);
  });

  test('a student cannot mark attendance (403) but sees own summary', async () => {
    const student = as({ id: w.stu1User._id, role: 'student' });
    expect((await request(student).post('/attendance/mark').send({ slotId: String(w.slot1._id), lectureDate: w.today, records: [] })).status).toBe(403);
    const sum = await request(student).get('/attendance/summary');
    expect(sum.status).toBe(200);
    expect(sum.body.data.subjects[0]).toMatchObject({ held: 1, present: 1, percentage: 100 });
  });

  test('HOD sees a student of the own department; another HOD gets 404', async () => {
    expect((await request(hodAOf()).get(`/attendance/summary?studentId=${w.stu2._id}`)).status).toBe(200);
    expect((await request(as({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id })).get(`/attendance/summary?studentId=${w.stu2._id}`)).status).toBe(404);
  });

  test('the teacher lists own registers', async () => {
    const res = await request(teacher1()).get('/attendance');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].counts.present).toBe(2);
  });
});

describe('internal marks', () => {
  const teacher1 = () => as({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id });
  let markIds = [];
  const base = () => ({ subjectId: String(w.subject1._id), semester: 1, academicYearId: String(w.year._id), component: 'Test 1', outOf: 20 });

  test('a teacher cannot enter marks for a subject they do not teach (403)', async () => {
    const res = await request(as({ id: w.teacher2._id, role: 'teacher', departmentId: w.deptA._id })).post('/marks').send({ ...base(), entries: [{ studentId: String(w.stu1._id), obtained: 10 }] });
    expect(res.status).toBe(403);
  });

  test('a good entry is saved; one with obtained > outOf goes to "failed" and does not stop the rest', async () => {
    const res = await request(teacher1()).post('/marks').send({ ...base(), entries: [{ studentId: String(w.stu1._id), obtained: 18 }, { studentId: String(w.stu2._id), obtained: 25 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.saved).toHaveLength(1);
    expect(res.body.data.failed).toHaveLength(1);
    expect(res.body.data.failed[0].studentId).toBe(String(w.stu2._id));
    markIds = res.body.data.saved.map((s) => String(s.markId));
  });

  test('submitted marks are not visible to the student yet', async () => {
    const sub = await request(teacher1()).post('/marks/submit').send({ ids: markIds });
    expect(sub.body.data).toMatchObject({ submitted: 1, skipped: 0 });
    const res = await request(as({ id: w.stu1User._id, role: 'student' })).get('/marks');
    expect(res.body.meta.total).toBe(0);
  });

  test("another department's HOD cannot approve them (decided 0)", async () => {
    const res = await request(as({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id })).post('/marks/decision').send({ ids: markIds, approve: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ decided: 0, skipped: 1 });
    expect((await Marks.findById(markIds[0])).status).toBe('submitted');
  });

  test('returning needs a note (400); approving works for the own department', async () => {
    expect((await request(hodAOf()).post('/marks/decision').send({ ids: markIds, approve: false })).status).toBe(400);
    const res = await request(hodAOf()).post('/marks/decision').send({ ids: markIds, approve: true });
    expect(res.body.data).toMatchObject({ decided: 1, skipped: 0 });
    expect(await AuditLog.countDocuments({ action: 'marksApproved', outcome: 'success' })).toBe(1);
    expect(await AuditLog.countDocuments({ action: 'marksApproved', outcome: 'denied' })).toBe(1);
  });

  test('now the student sees the approved mark; an approved mark cannot be changed', async () => {
    const res = await request(as({ id: w.stu1User._id, role: 'student' })).get('/marks');
    expect(res.body.meta.total).toBe(1);
    const again = await request(teacher1()).post('/marks').send({ ...base(), entries: [{ studentId: String(w.stu1._id), obtained: 19 }] });
    expect(again.body.data.saved).toHaveLength(0);
    expect(again.body.data.failed).toHaveLength(1);
  });
});

describe('exam results and publishing', () => {
  const examAdmin = () => as({ id: w.examAdmin._id, role: 'examAdmin' });
  const student = () => as({ id: w.stu1User._id, role: 'student' });
  let sheetId;

  test('the exam admin opens the sheet (201), opening again returns the same one (200); a student cannot (403)', async () => {
    const first = await request(examAdmin()).post('/results/open').send({ examFormId: String(w.examForm._id) });
    expect(first.status).toBe(201);
    sheetId = first.body.data._id;
    expect(first.body.data.lines).toHaveLength(2);
    const second = await request(examAdmin()).post('/results/open').send({ examFormId: String(w.examForm._id) });
    expect(second.status).toBe(200);
    expect(second.body.data._id).toBe(sheetId);
    expect((await request(student()).post('/results/open').send({ examFormId: String(w.examForm._id) })).status).toBe(403);
  });

  test('half-filled result cannot be published (409)', async () => {
    const put = await request(examAdmin()).put(`/results/${sheetId}/marks`).send({ entries: [{ subjectId: String(w.subject1._id), internalMarks: 30, externalMarks: 45 }] });
    expect(put.status).toBe(200);
    expect(put.body.data.isComplete).toBe(false);
    expect((await request(examAdmin()).post(`/results/${sheetId}/publish`)).status).toBe(409);
  });

  test('the student sees nothing before publishing (list empty, by-id is 404)', async () => {
    expect((await request(student()).get('/results')).body.meta.total).toBe(0);
    expect((await request(student()).get(`/results/${sheetId}`)).status).toBe(404);
  });

  test('complete result: totals and class are worked out; publishing works; the student can now see it', async () => {
    const put = await request(examAdmin()).put(`/results/${sheetId}/marks`).send({ entries: [{ subjectId: String(w.subject2._id), internalMarks: 35, externalMarks: 50 }] });
    expect(put.body.data).toMatchObject({ isComplete: true, totalObtained: 160, totalMax: 200, percentage: 80 });
    expect((await request(student()).post(`/results/${sheetId}/publish`)).status).toBe(403);
    const pub = await request(examAdmin()).post(`/results/${sheetId}/publish`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.isPublished).toBe(true);
    expect((await request(student()).get('/results')).body.meta.total).toBe(1);
    expect((await request(student()).get(`/results/${sheetId}`)).status).toBe(200);
    expect(await AuditLog.countDocuments({ action: 'resultPublished' })).toBe(1);
  });

  test('the HOD of the department sees published results; another HOD sees none', async () => {
    expect((await request(hodAOf()).get('/results')).body.meta.total).toBe(1);
    expect((await request(as({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id })).get('/results')).body.meta.total).toBe(0);
  });

  test('a published result cannot be edited (409); unpublish needs a reason, then it hides again', async () => {
    const edit = await request(examAdmin()).put(`/results/${sheetId}/marks`).send({ entries: [{ subjectId: String(w.subject1._id), internalMarks: 31, externalMarks: 45 }] });
    expect(edit.status).toBe(409);
    expect((await request(examAdmin()).post(`/results/${sheetId}/unpublish`).send({})).status).toBe(400);
    const un = await request(examAdmin()).post(`/results/${sheetId}/unpublish`).send({ reason: 'Marks entry mistake' });
    expect(un.body.data.isPublished).toBe(false);
    expect((await request(student()).get('/results')).body.meta.total).toBe(0);
    const row = await AuditLog.findOne({ action: 'resultUnpublished' }).lean();
    expect(row.details.reason).toBe('Marks entry mistake');
  });

  test('publish-exam publishes all finished results of the exam at once', async () => {
    const res = await request(examAdmin()).post('/results/publish-exam').send({ examId: String(w.exam._id) });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ published: 1, incomplete: 0 });
  });
});

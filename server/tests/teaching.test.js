import mongoose from 'mongoose';
import Timetable from '../src/models/Timetable.js';
import Attendance from '../src/models/Attendance.js';
import TeachingPlan from '../src/models/TeachingPlan.js';
import Marks from '../src/models/Marks.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';
import { isValidDateString, todayAtCollege, weekdayOf, daysBetween } from '../src/utils/dates.js';

const id = () => new mongoose.Types.ObjectId();
const realRosterForSlot = Attendance.rosterForSlot; // the tests below replace it; the roster test needs the real one
const q = (value) => ({ session: async () => value });

describe('dates', () => {
  test('valid dates only', () => {
    expect(isValidDateString('2026-11-16')).toBe(true);
    ['2026-02-30', '2026-13-01', '16-11-2026', '', null, 20261116].forEach((x) => expect(isValidDateString(x)).toBe(false));
  });
  test('weekday: Monday is 1, Sunday is 7', () => {
    expect(weekdayOf('2026-11-16')).toBe(1);
    expect(weekdayOf('2026-11-15')).toBe(7);
  });
  test('"today" is in Indian time: 20:00 UTC is already tomorrow at the college', () => {
    expect(todayAtCollege(new Date('2026-11-14T20:00:00Z'))).toBe('2026-11-15');
    expect(todayAtCollege(new Date('2026-11-14T10:00:00Z'))).toBe('2026-11-14');
  });
  test('days between', () => { expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7); });
});

describe('Timetable', () => {
  const base = () => ({ academicYearId: id(), programId: id(), departmentId: id(), semester: 1, division: 'a', subjectId: id(), teacherUserId: id(), dayOfWeek: 1, period: 1 });
  test('valid slot; division upper-cased', async () => {
    const t = new Timetable(base());
    await expect(t.validate()).resolves.toBeUndefined();
    expect(t.division).toBe('A');
  });
  test.each([['day 0', { dayOfWeek: 0 }], ['day 8', { dayOfWeek: 8 }], ['period 13', { period: 13 }], ['half period', { period: 1.5 }], ['bad time', { startTime: '9:30' }]])('rejects %s', async (_n, patch) => {
    await expect(new Timetable({ ...base(), ...patch }).validate()).rejects.toThrow();
  });
  test('a lecture must end after it starts', async () => {
    await expect(new Timetable({ ...base(), startTime: '10:00', endTime: '09:00' }).validate()).rejects.toThrow(/end after/);
    await expect(new Timetable({ ...base(), startTime: '09:00', endTime: '10:00' }).validate()).resolves.toBeUndefined();
  });

  describe('addSlot', () => {
    let program; let subject; let teacher; let created;
    beforeEach(() => {
      program = { _id: id(), departmentId: id() };
      subject = { _id: id(), programId: program._id, semester: 1 };
      teacher = { _id: id(), role: 'teacher', departmentId: program.departmentId };
      created = null;
      Program.findById = () => q(program);
      Subject.findById = () => q(subject);
      User.findById = () => q(teacher);
      Timetable.create = async ([doc]) => { created = doc; return [doc]; };
    });
    const data = () => ({ academicYearId: id(), programId: program._id, semester: 1, division: 'A', subjectId: subject._id, teacherUserId: teacher._id, dayOfWeek: 2, period: 3 });
    test('fills the department from the class', async () => {
      await Timetable.addSlot(data());
      expect(String(created.departmentId)).toBe(String(program.departmentId));
    });
    test('refuses a subject of another class or semester, a non-teacher, or a teacher of another department', async () => {
      subject.semester = 2;
      await expect(Timetable.addSlot(data())).rejects.toMatchObject({ statusCode: 400 });
      subject.semester = 1;
      teacher.role = 'student';
      await expect(Timetable.addSlot(data())).rejects.toMatchObject({ statusCode: 404 });
      teacher.role = 'hod';
      await expect(Timetable.addSlot(data())).resolves.toBeDefined();
      teacher.departmentId = id();
      await expect(Timetable.addSlot(data())).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});

describe('Attendance.mark', () => {
  const teacher = id();
  let slot; let students; let upsert;
  // 2026-11-16 is a Monday; "now" is Wednesday 18 Nov 2026, 11:00 at the college
  const now = new Date('2026-11-18T05:30:00Z');
  beforeEach(() => {
    slot = { _id: id(), isActive: true, teacherUserId: teacher, dayOfWeek: 1, period: 2, subjectId: id(), semester: 1, academicYearId: id(), programId: id(), departmentId: id(), division: 'A' };
    students = [{ _id: id() }, { _id: id() }, { _id: id() }];
    upsert = null;
    Timetable.findById = () => q(slot);
    Attendance.rosterForSlot = async () => students;
    Attendance.findOneAndUpdate = async (filter, update, opts) => { upsert = { filter, update, opts }; return { ok: true }; };
  });
  const run = (over = {}) => Attendance.mark({ slotId: slot._id, lectureDate: '2026-11-16', records: [], byUserId: teacher, ...over }, { now });

  test('students not listed are recorded absent, so the register is complete', async () => {
    await run({ records: [{ studentId: students[0]._id, status: 'present' }, { studentId: students[1]._id, status: 'leave' }] });
    const rec = upsert.update.$set.records;
    expect(rec.map((r) => r.status)).toEqual(['present', 'leave', 'absent']);
    expect(upsert.filter).toEqual({ slotId: slot._id, lectureDate: '2026-11-16' });
    expect(upsert.opts.upsert).toBe(true);
    expect(upsert.update.$set).toMatchObject({ period: 2, division: 'A', markedByUserId: teacher });
  });
  test('only the teacher of the slot may take it', async () => {
    await expect(run({ byUserId: id() })).rejects.toMatchObject({ statusCode: 403 });
  });
  test('slot missing or inactive is 404', async () => {
    slot.isActive = false;
    await expect(run()).rejects.toMatchObject({ statusCode: 404 });
  });
  test('the date must be real, on the slot weekday, not in the future, and not too old', async () => {
    await expect(run({ lectureDate: '2026-02-30' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(run({ lectureDate: '2026-11-17' })).rejects.toMatchObject({ statusCode: 400 }); // Tuesday
    await expect(run({ lectureDate: '2026-11-23' })).rejects.toMatchObject({ statusCode: 400 }); // Monday, future
    await expect(run({ lectureDate: '2026-11-09' })).rejects.toMatchObject({ statusCode: 409 }); // Monday, 9 days ago
    await expect(run({ lectureDate: '2026-11-16' })).resolves.toBeDefined(); // 2 days ago
  });
  test('a student who does not attend this lecture, or a bad status, is refused', async () => {
    await expect(run({ records: [{ studentId: id(), status: 'present' }] })).rejects.toMatchObject({ statusCode: 400 });
    await expect(run({ records: [{ studentId: students[0]._id, status: 'late' }] })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Attendance model', () => {
  const doc = (records) => new Attendance({
    slotId: id(), lectureDate: '2026-11-16', academicYearId: id(), programId: id(), departmentId: id(), semester: 1, division: 'A',
    subjectId: id(), period: 1, teacherUserId: id(), markedByUserId: id(), records,
  });
  test('valid; the same student twice is refused; bad date is refused', async () => {
    const s = id();
    await expect(doc([{ studentId: s, status: 'present' }]).validate()).resolves.toBeUndefined();
    await expect(doc([{ studentId: s, status: 'present' }, { studentId: s, status: 'absent' }]).validate()).rejects.toThrow(/twice/);
    const d = doc([]); d.lectureDate = '16/11/2026';
    await expect(d.validate()).rejects.toThrow();
  });
  test('roster: active students of the slot division enrolled in the subject', async () => {
    let enrollmentFilter; let studentFilter;
    const slot = { subjectId: id(), semester: 1, academicYearId: id(), programId: id(), division: 'B' };
    Enrollment.find = (f) => { enrollmentFilter = f; return q([{ studentId: 'S1' }, { studentId: 'S2' }]); };
    Student.find = (f) => { studentFilter = f; return q([]); };
    Attendance.rosterForSlot = realRosterForSlot;
    await Attendance.rosterForSlot(slot);
    expect(enrollmentFilter).toMatchObject({ subjectId: slot.subjectId, semester: 1, status: 'enrolled' });
    expect(studentFilter).toMatchObject({ _id: { $in: ['S1', 'S2'] }, division: 'B', status: 'active', programId: slot.programId });
  });
});

describe('TeachingPlan', () => {
  const teacher = id(); const hod = id();
  let subject; let program; let plans;
  beforeEach(() => {
    subject = { _id: id(), programId: id(), semester: 1 };
    program = { _id: subject.programId, departmentId: id() };
    plans = [];
    Subject.findById = () => q(subject);
    Program.findById = () => q(program);
    Timetable.teaches = async () => true;
    TeachingPlan.create = async ([doc]) => { const p = new TeachingPlan(doc); p.save = async () => { await p.validate(); return p; }; plans.push(p); return [p]; };
  });
  const start = () => TeachingPlan.start({ teacherUserId: teacher, subjectId: subject._id, semester: 1, academicYearId: id() });
  const topics = [{ weekNo: 1, title: 'Introduction', plannedHours: 4 }, { weekNo: 2, title: 'Ledgers' }];

  test('only subjects the teacher teaches can be planned; the department comes from the class', async () => {
    const p = await start();
    expect(p.status).toBe('draft');
    expect(String(p.departmentId)).toBe(String(program.departmentId));
    Timetable.teaches = async () => false;
    await expect(start()).rejects.toMatchObject({ statusCode: 403 });
    Timetable.teaches = async () => true;
    subject.semester = 2;
    await expect(start()).rejects.toMatchObject({ statusCode: 400 });
  });
  test('submit needs topics; a submitted plan cannot be edited', async () => {
    const p = await start();
    await expect(p.submit()).rejects.toMatchObject({ statusCode: 400 });
    await p.setTopics(topics);
    await p.submit();
    expect(p.status).toBe('submitted');
    await expect(p.setTopics(topics)).rejects.toMatchObject({ statusCode: 409 });
    await expect(p.submit()).rejects.toMatchObject({ statusCode: 409 });
  });
  test('topic week must be a whole number from 1; a topic needs a title', async () => {
    const p = await start();
    await expect(p.setTopics([{ weekNo: 0, title: 'x' }])).rejects.toThrow();
    await expect(p.setTopics([{ weekNo: 1 }])).rejects.toThrow();
  });
  describe('decide', () => {
    let doc;
    beforeEach(() => {
      doc = { _id: id(), status: 'submitted' };
      TeachingPlan.findOneAndUpdate = async (filter, update) => { if (doc.status !== filter.status) return null; Object.assign(doc, update.$set); return { ...doc }; };
      TeachingPlan.findById = () => q(doc);
    });
    test('the HOD approves (also their own plan: no self-check); returning needs a note', async () => {
      await expect(TeachingPlan.decide(doc._id, { approve: false, byUserId: hod })).rejects.toMatchObject({ statusCode: 400 });
      const r = await TeachingPlan.decide(doc._id, { approve: true, byUserId: hod });
      expect(r.status).toBe('approved');
    });
    test('a returned plan can be changed and sent again', async () => {
      const r = await TeachingPlan.decide(doc._id, { approve: false, byUserId: hod, note: 'Add practicals' });
      expect(r).toMatchObject({ status: 'returned', reviewNote: 'Add practicals' });
    });
    test('only submitted plans are decided; missing plan is 404', async () => {
      doc.status = 'draft';
      await expect(TeachingPlan.decide(doc._id, { approve: true, byUserId: hod })).rejects.toMatchObject({ statusCode: 409 });
      TeachingPlan.findById = () => q(null);
      doc.status = 'x';
      await expect(TeachingPlan.decide(id(), { approve: true, byUserId: hod })).rejects.toMatchObject({ statusCode: 404 });
    });
  });
  test('progress: only after approval; tick topics; percentage', async () => {
    const p = await start();
    await p.setTopics(topics);
    await expect(p.updateProgress(p.topics[0]._id, 'done', '2026-11-16')).rejects.toMatchObject({ statusCode: 409 });
    p.status = 'approved';
    await p.updateProgress(p.topics[0]._id, 'done', '2026-11-16');
    expect(p.topics[0]).toMatchObject({ status: 'done', completedOn: '2026-11-16' });
    expect(p.progressPercent()).toBe(50);
    await p.updateProgress(p.topics[0]._id, 'inProgress');
    expect(p.topics[0].completedOn).toBeUndefined();
    await expect(p.updateProgress(id(), 'done')).rejects.toMatchObject({ statusCode: 404 });
    await expect(p.updateProgress(p.topics[0]._id, 'finished')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Marks', () => {
  const teacher = id();
  let created; let existing; let enrolled;
  beforeEach(() => {
    created = null; existing = null; enrolled = true;
    const subject = { _id: id(), programId: id() };
    Timetable.teaches = async () => true;
    Enrollment.findOne = () => q(enrolled ? {} : null);
    Subject.findById = () => q(subject);
    Program.findById = () => q({ departmentId: id() });
    Marks.findOne = () => q(existing);
    Marks.create = async ([doc]) => { created = doc; return [doc]; };
  });
  const entry = (over = {}) => ({ studentId: id(), subjectId: id(), semester: 1, academicYearId: id(), component: ' Internal Test 1 ', obtained: 18, outOf: 20, byUserId: teacher, ...over });

  test('creates a draft row with the department filled in and the component trimmed', async () => {
    await Marks.enter(entry());
    expect(created).toMatchObject({ component: 'Internal Test 1', obtained: 18, outOf: 20 });
    expect(created.departmentId).toBeDefined();
  });
  test('only for subjects the teacher teaches and students enrolled in them', async () => {
    Timetable.teaches = async () => false;
    await expect(Marks.enter(entry())).rejects.toMatchObject({ statusCode: 403 });
    Timetable.teaches = async () => true;
    enrolled = false;
    await expect(Marks.enter(entry())).rejects.toMatchObject({ statusCode: 400 });
  });
  test('an existing draft or returned mark is corrected; a submitted or approved one is not', async () => {
    existing = new Marks({ studentId: id(), subjectId: id(), programId: id(), departmentId: id(), semester: 1, academicYearId: id(), component: 'T', obtained: 5, outOf: 20, enteredByUserId: teacher, status: 'returned' });
    existing.save = async () => existing;
    const r = await Marks.enter(entry({ obtained: 19 }));
    expect(r.obtained).toBe(19);
    existing.status = 'submitted';
    await expect(Marks.enter(entry())).rejects.toMatchObject({ statusCode: 409 });
    existing.status = 'approved';
    await expect(Marks.enter(entry())).rejects.toMatchObject({ statusCode: 409 });
  });
  describe('model rules', () => {
    const row = (o) => new Marks({ studentId: id(), subjectId: id(), programId: id(), departmentId: id(), semester: 1, academicYearId: id(), component: 'T', obtained: 10, outOf: 20, enteredByUserId: id(), ...o });
    test('valid; draft by default', async () => {
      const m = row();
      await expect(m.validate()).resolves.toBeUndefined();
      expect(m.status).toBe('draft');
    });
    test.each([['more than max', { obtained: 21 }], ['negative', { obtained: -1 }], ['quarter mark', { obtained: 10.25 }], ['zero max', { outOf: 0 }]])('rejects %s', async (_n, o) => {
      await expect(row(o).validate()).rejects.toThrow();
    });
  });
  test('submitMany sends only the teacher\'s own draft or returned marks', async () => {
    let call;
    Marks.updateMany = async (f, u) => { call = { f, u }; return { modifiedCount: 3 }; };
    const ids = [id(), id(), id(), id()];
    expect(await Marks.submitMany(ids, { byUserId: teacher })).toEqual({ submitted: 3, skipped: 1 });
    expect(call.f).toMatchObject({ enteredByUserId: teacher, status: { $in: ['draft', 'returned'] } });
    expect(call.u.$set.status).toBe('submitted');
  });
  test('decideMany: only submitted marks; returning needs a note; the HOD may decide their own', async () => {
    let call;
    Marks.updateMany = async (f, u) => { call = { f, u }; return { modifiedCount: 2 }; };
    await expect(Marks.decideMany([id()], { approve: false, byUserId: id() })).rejects.toMatchObject({ statusCode: 400 });
    expect(await Marks.decideMany([id(), id()], { approve: true, byUserId: teacher })).toEqual({ decided: 2, skipped: 0 });
    expect(call.f.status).toBe('submitted');
    expect(call.f.enteredByUserId).toBeUndefined(); // no "not your own" restriction
    expect(call.u.$set.status).toBe('approved');
  });
});

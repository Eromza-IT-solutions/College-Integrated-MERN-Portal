// Real-database check for Step 3 (timetable, attendance, marks, results) through the real routes.
// Ye ek TEMPORARY database banata hai aur end me delete kar deta hai, isliye aapka dev data safe rehta hai.
// Needs MONGODB_URI in .env. Run: node scripts/check-academics-api.js
import request from 'supertest';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import AuditLog from '../src/models/AuditLog.js';
import { prepareDatabase, appFor, buildWorld } from '../tests/helpers/academicsWorld.js';

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); };

(async () => {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { dbName: `eromza_check_academics_${Date.now()}`, serverSelectionTimeoutMS: 10000 });
  try {
    await prepareDatabase();
    const w = await buildWorld();
    const teacher = appFor({ id: w.teacher1._id, role: 'teacher', departmentId: w.deptA._id });
    const hod = appFor({ id: w.hodA._id, role: 'hod', departmentId: w.deptA._id });
    const otherHod = appFor({ id: w.hodB._id, role: 'hod', departmentId: w.deptB._id });
    const student = appFor({ id: w.stu1User._id, role: 'student' });
    const examAdmin = appFor({ id: w.examAdmin._id, role: 'examAdmin' });

    // Timetable
    check('no login => 401', (await request(appFor(null)).get('/timetable')).status === 401);
    const slot = { academicYearId: String(w.year._id), programId: String(w.progA._id), semester: 1, division: 'A', subjectId: String(w.subject2._id), teacherUserId: String(w.teacher2._id), dayOfWeek: 2, period: 2 };
    check('HOD adds a slot (201)', (await request(hod).post('/timetable').send(slot)).status === 201);
    check("other department's HOD is refused (403)", (await request(otherHod).post('/timetable').send({ ...slot, dayOfWeek: 3 })).status === 403);
    check('same teacher + same period again => 409', (await request(hod).post('/timetable').send(slot)).status === 409);
    check('student sees the class timetable (2 slots)', (await request(student).get('/timetable')).body.meta.total === 2);

    // Attendance
    const mark = (records) => request(teacher).post('/attendance/mark').send({ slotId: String(w.slot1._id), lectureDate: w.today, records });
    const first = await mark([{ studentId: String(w.stu1._id), status: 'present' }]);
    check('attendance taken: 1 present, 1 absent (left out => absent)', first.status === 201 && first.body.data.counts.present === 1 && first.body.data.counts.absent === 1);
    const fix = await mark([{ studentId: String(w.stu1._id), status: 'present' }, { studentId: String(w.stu2._id), status: 'present' }]);
    check('correction => 200, corrected: true', fix.status === 200 && fix.body.data.corrected === true);
    const sum = await request(student).get('/attendance/summary');
    check('student summary: 100%', sum.status === 200 && sum.body.data.subjects[0].percentage === 100);
    check('student cannot mark attendance (403)', (await request(student).post('/attendance/mark').send({ slotId: String(w.slot1._id), lectureDate: w.today, records: [] })).status === 403);

    // Marks
    const entered = await request(teacher).post('/marks').send({ subjectId: String(w.subject1._id), semester: 1, academicYearId: String(w.year._id), component: 'Test 1', outOf: 20, entries: [{ studentId: String(w.stu1._id), obtained: 18 }, { studentId: String(w.stu2._id), obtained: 25 }] });
    check('marks: 1 saved, 1 failed (25 > 20)', entered.status === 200 && entered.body.data.saved.length === 1 && entered.body.data.failed.length === 1);
    const ids = entered.body.data.saved.map((s) => String(s.markId));
    check('submit for approval', (await request(teacher).post('/marks/submit').send({ ids })).body.data.submitted === 1);
    check('student cannot see unapproved marks', (await request(student).get('/marks')).body.meta.total === 0);
    check("other department's HOD decides nothing", (await request(otherHod).post('/marks/decision').send({ ids, approve: true })).body.data.decided === 0);
    check('own HOD approves', (await request(hod).post('/marks/decision').send({ ids, approve: true })).body.data.decided === 1);
    check('student now sees the approved mark', (await request(student).get('/marks')).body.meta.total === 1);

    // Results
    const opened = await request(examAdmin).post('/results/open').send({ examFormId: String(w.examForm._id) });
    check('result sheet opened (201)', opened.status === 201);
    const sheet = opened.body.data._id;
    await request(examAdmin).put(`/results/${sheet}/marks`).send({ entries: [{ subjectId: String(w.subject1._id), internalMarks: 30, externalMarks: 45 }] });
    check('half-filled result cannot be published (409)', (await request(examAdmin).post(`/results/${sheet}/publish`)).status === 409);
    await request(examAdmin).put(`/results/${sheet}/marks`).send({ entries: [{ subjectId: String(w.subject2._id), internalMarks: 35, externalMarks: 50 }] });
    check('student sees nothing before publish', (await request(student).get('/results')).body.meta.total === 0);
    check('publish works', (await request(examAdmin).post(`/results/${sheet}/publish`)).body.data.isPublished === true);
    check('student sees the result after publish', (await request(student).get('/results')).body.meta.total === 1);
    check('unpublish needs a reason (400)', (await request(examAdmin).post(`/results/${sheet}/unpublish`).send({})).status === 400);

    // Audit
    const actions = (await AuditLog.find({}).lean()).map((a) => a.action);
    const want = ['timetableSlotCreated', 'attendanceMarked', 'attendanceCorrected', 'marksEntered', 'marksSubmitted', 'marksApproved', 'resultSheetOpened', 'resultMarksEntered', 'resultPublished'];
    check(`audit log has: ${want.join(', ')}`, want.every((a) => actions.includes(a)));
  } finally {
    await mongoose.connection.dropDatabase().catch((e) => console.log('Could not delete the temporary database:', e.message));
    await mongoose.connection.close();
  }
  process.exitCode = results.every(Boolean) ? 0 : 1;
})().catch((err) => { console.error(err); process.exit(1); });

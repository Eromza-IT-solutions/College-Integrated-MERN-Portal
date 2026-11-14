import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Timetable from '../src/models/Timetable.js';
import Attendance from '../src/models/Attendance.js';
import TeachingPlan from '../src/models/TeachingPlan.js';
import Marks from '../src/models/Marks.js';
import { todayAtCollege, weekdayOf } from '../src/utils/dates.js';

// Checks the teaching models against the real DEV database: timetable clashes, attendance and its summary,
// teaching plan approval and internal marks approval. It creates a temporary class, teacher, subject and student named
// CHECK-... and removes everything again. No counters are used.
// Run:  npm run seed   then   node scripts/check-teaching-models.js
async function dup(fn) { try { await fn(); return false; } catch (e) { return e.code === 11000; } }
async function fails(fn, status) { try { await fn(); return false; } catch (e) { return e.statusCode === status; } }

async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const oid = () => new mongoose.Types.ObjectId();
  const stamp = Date.now();
  const made = {};
  try {
    await Promise.all([Timetable.init(), Attendance.init(), TeachingPlan.init(), Marks.init(), Student.init()]);
    const dept = await Department.findOne();
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!dept || !year) throw new Error('Run "npm run seed" first');

    made.teacher = await User.create({ fullName: 'Check Teacher', email: `check-t-${stamp}@demo.example`, passwordHash: 'x', role: 'teacher', departmentId: dept._id, status: 'active' });
    made.hod = await User.create({ fullName: 'Check HOD', email: `check-h-${stamp}@demo.example`, passwordHash: 'x', role: 'hod', departmentId: dept._id, status: 'active' });
    made.program = await Program.create({ name: `CHECK-PROGRAM-${stamp}`, code: `CHK-${stamp}`, departmentId: dept._id });
    made.subject = await Subject.create({ code: 'CHK-1', name: 'Check Subject', programId: made.program._id, semester: 1, category: 'major' });
    made.student = await Student.create({ userId: oid(), applicationId: oid(), programId: made.program._id, admissionYearId: year._id, enrollmentNumber: `CHECK-${stamp}` });
    made.enrollment = await Enrollment.create({ studentId: made.student._id, subjectId: made.subject._id, semester: 1, academicYearId: year._id });
    ok(made.student.division === 'A', 'a student starts in division A');

    // Monday 1 period 1
    const slotData = { academicYearId: year._id, programId: made.program._id, semester: 1, division: 'A', subjectId: made.subject._id, teacherUserId: made.teacher._id, dayOfWeek: 1, period: 1 };
    made.slot = await Timetable.addSlot(slotData);
    ok(String(made.slot.departmentId) === String(dept._id), 'the slot gets its department from the class');
    ok(await dup(() => Timetable.addSlot({ ...slotData, teacherUserId: made.hod._id })), 'a class division cannot have two lectures in one period');
    ok(await Timetable.teaches({ teacherUserId: made.teacher._id, subjectId: made.subject._id, semester: 1, academicYearId: year._id }), 'the teacher is recorded as teaching the subject');

    // attendance for the most recent Monday that is not older than the correction limit
    const today = todayAtCollege();
    let day = today;
    while (weekdayOf(day) !== 1) day = new Date(new Date(`${day}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
    const att = await Attendance.mark({ slotId: made.slot._id, lectureDate: day, records: [{ studentId: made.student._id, status: 'present' }], byUserId: made.teacher._id });
    ok(att.records.length === 1 && att.records[0].status === 'present', 'attendance is saved');
    await Attendance.mark({ slotId: made.slot._id, lectureDate: day, records: [{ studentId: made.student._id, status: 'absent' }], byUserId: made.teacher._id });
    ok((await Attendance.countDocuments({ slotId: made.slot._id })) === 1, 'taking the same lecture again corrects it, not duplicates it');
    ok(await fails(() => Attendance.mark({ slotId: made.slot._id, lectureDate: day, records: [], byUserId: made.hod._id }), 403), 'another teacher cannot take the lecture');
    await Attendance.mark({ slotId: made.slot._id, lectureDate: day, records: [{ studentId: made.student._id, status: 'present' }], byUserId: made.teacher._id });
    const [sum] = await Attendance.summaryForStudent(made.student._id, { subjectId: made.subject._id });
    ok(sum && sum.held === 1 && sum.present === 1 && sum.percentage === 100, 'the student attendance summary is correct');

    // teaching plan
    const plan = await TeachingPlan.start({ teacherUserId: made.teacher._id, subjectId: made.subject._id, semester: 1, academicYearId: year._id });
    ok(await dup(() => TeachingPlan.start({ teacherUserId: made.teacher._id, subjectId: made.subject._id, semester: 1, academicYearId: year._id })), 'one plan per teacher and subject');
    await plan.setTopics([{ weekNo: 1, title: 'Introduction' }]);
    await plan.submit();
    const approvedPlan = await TeachingPlan.decide(plan._id, { approve: true, byUserId: made.hod._id });
    ok(approvedPlan.status === 'approved', 'the HOD approves a plan');
    const reloaded = await TeachingPlan.findById(plan._id);
    await reloaded.updateProgress(reloaded.topics[0]._id, 'done', day);
    ok(reloaded.progressPercent() === 100, 'progress can be recorded after approval');

    // internal marks
    const entry = { studentId: made.student._id, subjectId: made.subject._id, semester: 1, academicYearId: year._id, component: 'Test 1', obtained: 18, outOf: 20, byUserId: made.teacher._id };
    const mark = await Marks.enter(entry);
    await Marks.enter({ ...entry, obtained: 19 });
    ok((await Marks.countDocuments({ studentId: made.student._id })) === 1 && (await Marks.findById(mark._id)).obtained === 19, 'a draft mark can be corrected');
    ok(await fails(() => Marks.enter({ ...entry, byUserId: made.hod._id }), 403), 'a teacher who does not teach the subject cannot enter marks');
    ok((await Marks.submitMany([mark._id], { byUserId: made.teacher._id })).submitted === 1, 'marks are sent for approval');
    ok(await fails(() => Marks.enter(entry), 409), 'submitted marks cannot be changed');
    ok((await Marks.decideMany([mark._id], { approve: true, byUserId: made.hod._id })).decided === 1, 'the HOD approves the marks');
  } finally {
    const studentId = made.student && made.student._id;
    if (studentId) await Marks.deleteMany({ studentId });
    if (made.slot) await Attendance.deleteMany({ slotId: made.slot._id });
    if (made.subject) await TeachingPlan.deleteMany({ subjectId: made.subject._id });
    if (made.slot) await Timetable.deleteOne({ _id: made.slot._id });
    if (made.enrollment) await Enrollment.deleteOne({ _id: made.enrollment._id });
    if (studentId) await Student.deleteOne({ _id: studentId });
    if (made.subject) await Subject.deleteOne({ _id: made.subject._id });
    if (made.program) await Program.deleteOne({ _id: made.program._id });
    if (made.teacher) await User.deleteOne({ _id: made.teacher._id });
    if (made.hod) await User.deleteOne({ _id: made.hod._id });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

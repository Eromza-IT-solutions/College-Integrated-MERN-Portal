import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Result from '../src/models/Result.js';
import ExamForm from '../src/models/ExamForm.js';

// Checks the result models against the real DEV database: one result per student per exam, marks, class,
// publishing and unpublishing. It adds records for one test student and removes them again.
// Run:  node scripts/check-result-models.js
async function dup(fn) { try { await fn(); return false; } catch (e) { return e.code === 11000; } }

async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const oid = () => new mongoose.Types.ObjectId();
  const examId = oid();
  const studentId = oid();
  const admin = oid();
  const made = {};
  try {
    await Promise.all([Result.init(), ExamForm.init()]);
    const [s1, s2] = [oid(), oid()];
    made.form = await ExamForm.create({
      examId, studentId, status: 'approved',
      details: { enrollmentNumber: 'CHECK-1', fullName: 'Check Student', semester: 1 },
      subjects: [{ subjectId: s1, code: 'C1', name: 'Check One', category: 'major' }, { subjectId: s2, code: 'C2', name: 'Check Two', category: 'aec' }],
    });

    const sheet = await Result.openForApprovedForm(made.form._id);
    ok(sheet.lines.length === 2 && !sheet.isComplete, 'a sheet opens with one empty line per ticked subject');
    ok(String((await Result.openForApprovedForm(made.form._id))._id) === String(sheet._id), 'opening again returns the same sheet');
    ok(await dup(() => Result.create({ examId, studentId, examFormId: made.form._id, lines: [{ subjectId: s1, maxInternal: 40, maxExternal: 60 }] })), 'only one result per student per exam');

    let early = false;
    try { await Result.publish(sheet._id, { byUserId: admin }); } catch (e) { early = e.statusCode === 409; }
    ok(early, 'an unfinished result cannot be published');

    await sheet.enterMarks([{ subjectId: s1, internalMarks: 35, externalMarks: 50 }, { subjectId: s2, internalMarks: 30, externalMarks: 40 }], { byUserId: admin });
    const saved = await Result.findById(sheet._id);
    ok(saved.isComplete && saved.totalObtained === 155 && saved.percentage === 77.5 && saved.resultClass === 'Distinction', 'totals and class are saved');

    ok((await Result.publishedFor(studentId)).length === 0, 'a student sees nothing before publishing');
    const published = await Result.publish(sheet._id, { byUserId: admin });
    ok(published.isPublished, 'a finished result publishes');
    ok((await Result.publishedFor(studentId)).length === 1, 'the student sees it after publishing');
    let locked = false;
    try { await (await Result.findById(sheet._id)).enterMarks([{ subjectId: s1, internalMarks: 1, externalMarks: 1 }]); } catch (e) { locked = e.statusCode === 409; }
    ok(locked, 'a published result cannot be edited');

    const back = await Result.unpublish(sheet._id, { reason: 'check' });
    ok(!back.isPublished && back.unpublishReason === 'check', 'unpublishing needs a reason and hides the result again');
    ok((await Result.publishedFor(studentId)).length === 0, 'the student no longer sees it');
    const bulk = await Result.publishExam(examId, { byUserId: admin });
    ok(bulk.published === 1 && bulk.incomplete === 0, 'publishing a whole exam publishes the finished results');
  } finally {
    await Result.deleteMany({ examId });
    if (made.form) await ExamForm.deleteOne({ _id: made.form._id });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

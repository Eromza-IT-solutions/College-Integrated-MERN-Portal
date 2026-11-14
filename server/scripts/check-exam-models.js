import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';
import Application from '../src/models/Application.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';
import Exam from '../src/models/Exam.js';
import ExamForm from '../src/models/ExamForm.js';

// Checks the exam models against the real DEV database with the whole flow: a student starts the exam form, ticks
// subjects, pays the fee, the form is submitted and the Examination Admin approves it. It creates a temporary applicant,
// class, subject, fee and exam named CHECK-... and removes everything again.
// It uses up one enrollment number and one receipt number.
// Run:  npm run seed   then   node scripts/check-exam-models.js      (needs LOGIN_ID_HASH_SECRET in .env)
async function dup(fn) { try { await fn(); return false; } catch (e) { return e.code === 11000; } }

async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const stamp = Date.now();
  const made = {};
  try {
    await Promise.all([Exam.init(), ExamForm.init(), Payment.init()]);
    const dept = await Department.findOne();
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!dept || !year) throw new Error('Run "npm run seed" first');

    made.user = await User.create({ fullName: 'Check Student', email: `check-${stamp}@demo.example`, passwordHash: 'x', role: 'applicant', status: 'active' });
    made.program = await Program.create({ name: `CHECK-PROGRAM-${stamp}`, code: `CHK-${stamp}`, departmentId: dept._id });
    made.subject = await Subject.create({ code: 'CHK-1', name: 'Check Subject', programId: made.program._id, semester: 1, category: 'major' });
    made.app = await Application.create({
      applicantUserId: made.user._id, academicYearId: year._id, programId: made.program._id, feesCategory: 'PAYING',
      aadhaarNumber: `2${String(stamp).slice(-11)}`, student: { fullName: 'Check Student', mobile: `9${String(stamp).slice(-9)}` },
      subjects: { nep: { major: ['check subject'] } },
    });
    await Application.updateOne({ _id: made.app._id }, { $set: { status: 'approved' } });
    made.student = (await Student.createFromApplication(made.app._id)).student;
    made.fee = await FeeStructure.create({ purpose: 'exam', academicYearId: year._id, programId: made.program._id, feesCategory: 'PAYING', amountPaise: 50000, label: 'CHECK' });
    made.exam = await Exam.create({ name: 'CHECK Exam', academicYearId: year._id, programId: made.program._id, semester: 1, formOpensAt: new Date(stamp - 3600000), formClosesAt: new Date(stamp + 3600000), status: 'open' });
    ok(await dup(() => Exam.create({ name: 'CHECK Exam', academicYearId: year._id, programId: made.program._id, semester: 1, formOpensAt: new Date(stamp - 1000), formClosesAt: new Date(stamp + 1000) })), 'the same exam cannot be created twice');

    const form = await ExamForm.start({ examId: made.exam._id, studentId: made.student._id });
    made.form = form;
    ok(form.details.fullName === 'Check Student' && form.details.feesCategory === 'PAYING', 'the form is filled in from the admission record');
    ok(String((await ExamForm.start({ examId: made.exam._id, studentId: made.student._id }))._id) === String(form._id), 'starting again returns the same form');
    ok(await dup(() => ExamForm.create({ examId: made.exam._id, studentId: made.student._id })), 'only one form per student per exam');

    await form.selectSubjects([made.subject._id]);
    ok(form.subjects.length === 1 && form.subjects[0].code === 'CHK-1', 'the enrolled subject can be ticked');
    await form.continueToPayment();
    ok(form.status === 'pendingPayment' && form.feeAmountPaise === 50000, 'continue fixes the fee and waits for payment');

    made.payment = await Payment.create({
      purpose: 'exam', payerUserId: made.user._id, academicYearId: year._id, feeStructureId: made.fee._id,
      examFormId: form._id, amountPaise: form.feeAmountPaise, gatewayOrderId: `check_${stamp}`,
    });
    await Payment.markPaid(made.payment._id);
    const submitted = await form.markPaid(made.payment._id);
    ok(submitted.status === 'submitted', 'after payment the form is submitted');
    const again = await (await ExamForm.findById(form._id)).markPaid(made.payment._id);
    ok(again.status === 'submitted', 'confirming the payment twice changes nothing');

    const approved = await ExamForm.decide(form._id, { approve: true, decidedByUserId: new mongoose.Types.ObjectId() });
    ok(approved.status === 'approved', 'the Examination Admin can approve a submitted form');
  } finally {
    if (made.form) await ExamForm.deleteOne({ _id: made.form._id });
    if (made.payment) await Payment.deleteOne({ _id: made.payment._id });
    if (made.fee) await FeeStructure.deleteOne({ _id: made.fee._id });
    if (made.exam) await Exam.deleteOne({ _id: made.exam._id });
    if (made.student) { await Enrollment.deleteMany({ studentId: made.student._id }); await Student.deleteOne({ _id: made.student._id }); }
    if (made.app) await Application.deleteOne({ _id: made.app._id });
    if (made.subject) await Subject.deleteOne({ _id: made.subject._id });
    if (made.program) await Program.deleteOne({ _id: made.program._id });
    if (made.user) await User.deleteOne({ _id: made.user._id });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

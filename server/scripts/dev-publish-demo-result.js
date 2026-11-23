// DEV ONLY - for testing the student Results screen from the browser.
// Takes the Demo Student's PAID exam form -> approved -> result sheet opened -> marks entered -> published.
// (In real use the Examination Admin does these steps.)
// Prerequisite: the student has paid the exam fee on the Fees page (status "submitted").
// Run: node scripts/dev-publish-demo-result.js     Safe to run again. Refused in production.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import ExamForm from '../src/models/ExamForm.js';
import Result from '../src/models/Result.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to run when NODE_ENV=production');
await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
try {
  const user = await User.findOne({ email: 'student@demo.example' });
  const student = user && await Student.findOne({ userId: user._id });
  if (!student) throw new Error('No demo student. Run: npm run seed:demo-student');
  const form = await ExamForm.findOne({ studentId: student._id }).sort({ createdAt: -1 });
  if (!form) throw new Error('No exam form. Run: node scripts/dev-prepare-student-exam-fee.js');
  const admin = await User.findOne({ email: 'superadmin@demo.example' }) || await User.findOne();

  if (form.status === 'pendingPayment' || form.status === 'draft') throw new Error(`Exam form is ${form.status}. Pay the exam fee on the student's Fees page first.`);
  if (form.status === 'submitted') await ExamForm.decide(form._id, { approve: true, decidedByUserId: admin._id });

  const sheet = await Result.openForApprovedForm(form._id);
  if (!sheet.isPublished) {
    await sheet.enterMarks(sheet.lines.map((l) => ({
      subjectId: l.subjectId,
      internalMarks: Math.floor((l.maxInternal * 0.8) * 2) / 2,
      externalMarks: Math.floor((l.maxExternal * 0.7) * 2) / 2,
    })), { byUserId: admin._id });
    await Result.publish(sheet._id, { byUserId: admin._id });
  }
  const r = await Result.findById(sheet._id);
  console.log(`Result published: SGPA=${r.sgpa}, outcome=${r.outcome}, ${r.lines.length} subjects`);
} finally {
  await mongoose.connection.close();
}

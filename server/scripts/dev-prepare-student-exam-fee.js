// DEV ONLY - for testing the student Fees screen from the browser.
// Takes the Demo Student's exam form for the open sample exam as far as "pending payment",
// the same steps the student would do on the exam form screen (start -> tick subjects -> Continue).
//
// Prerequisites: npm run seed, seed:programs, seed:fees, seed:subjects, seed:demo-student, seed:exam
// Run:  node scripts/dev-prepare-student-exam-fee.js
// Safe to run again. Refused in production.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Exam from '../src/models/Exam.js';
import ExamForm from '../src/models/ExamForm.js';
import Subject from '../src/models/Subject.js';
import Enrollment from '../src/models/Enrollment.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to run when NODE_ENV=production');

await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
try {
  const user = await User.findOne({ email: 'student@demo.example' });
  if (!user) throw new Error('Demo student user not found. Run: npm run seed');
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new Error('No student record yet. Run: npm run seed:demo-student');
  const exam = await Exam.findOne({ programId: student.programId, semester: student.currentSemester });
  if (!exam) throw new Error('No exam for this class. Run: npm run seed:exam');

  // The admission choices may not match the sample subjects, so enrol the student in the sample semester subjects.
  const enrolled = await Enrollment.countDocuments({ studentId: student._id, semester: exam.semester });
  if (!enrolled) {
    const subjects = await Subject.find({ programId: student.programId, semester: exam.semester, code: /^SMP-/ });
    if (!subjects.length) throw new Error('No sample subjects. Run: npm run seed:sample-subjects');
    await Enrollment.insertMany(subjects.map((sub) => ({
      studentId: student._id, subjectId: sub._id, semester: exam.semester, academicYearId: exam.academicYearId,
    })));
    console.log(`Enrolled the student in ${subjects.length} subject(s).`);
  }

  const form = await ExamForm.start({ examId: exam._id, studentId: student._id });
  if (form.status === 'draft') {
    const offered = await form.offeredSubjects();
    if (!offered.length) throw new Error('Student still has no enrolled subjects');
    await form.selectSubjects(offered.map((s) => String(s._id)));
    await form.continueToPayment();
  }
  const fresh = await ExamForm.findById(form._id);
  console.log(`Exam form ${fresh._id}: status=${fresh.status}, fee=Rs ${(fresh.feeAmountPaise || 0) / 100}`);
} finally {
  await mongoose.connection.close();
}

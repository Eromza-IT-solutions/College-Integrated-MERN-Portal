// DEV ONLY - gives a student enrolled subjects for their current semester, so the exam form has subjects to tick.
// Subjects come from the student's own program + current semester (the Academic Data list).
//
// Run:  node scripts/dev-enroll-student.js <student email> [how many subjects, default 5]
// Example: node scripts/dev-enroll-student.js student@demo.example 5
// Safe to run again (subjects already enrolled are skipped). Refused in production.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Exam from '../src/models/Exam.js';
import Subject from '../src/models/Subject.js';
import Enrollment from '../src/models/Enrollment.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to run when NODE_ENV=production');

const email = process.argv[2];
const count = Number(process.argv[3] || 5);
if (!email) throw new Error('Usage: node scripts/dev-enroll-student.js <student email> [count]');

await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
try {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error(`No user with email ${email}`);
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new Error('This user has no student record yet.');

  const { programId, currentSemester: semester } = student;
  const exam = await Exam.findOne({ programId, semester });
  const academicYearId = exam?.academicYearId || student.admissionYearId;

  const subjects = await Subject.find({ programId, semester, isActive: true }).sort({ code: 1 }).limit(count);
  if (!subjects.length) {
    throw new Error(`No active subjects for this student's course, semester ${semester}. Add some on Super Admin > Academic Data.`);
  }

  const have = new Set((await Enrollment.find({ studentId: student._id, semester, status: 'enrolled' }))
    .map((e) => String(e.subjectId)));
  const fresh = subjects.filter((s) => !have.has(String(s._id)));
  if (fresh.length) {
    await Enrollment.insertMany(fresh.map((s) => ({ studentId: student._id, subjectId: s._id, semester, academicYearId })));
  }
  console.log(`Semester ${semester}: enrolled ${fresh.length} new subject(s), ${have.size} already there.`);
  subjects.forEach((s) => console.log(`  ${s.code}  ${s.name}`));
} finally {
  await mongoose.connection.close();
}

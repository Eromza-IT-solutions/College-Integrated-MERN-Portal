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

// Checks the student models against the real DEV database: an approved application becomes a student, the account
// can sign in by email, mobile or Aadhaar, and duplicates are blocked. It creates a temporary applicant, class and
// application named CHECK-... and removes everything again. It uses up one enrollment number.
// Run:  npm run seed   then   npm run seed:fees   then   node scripts/check-student-models.js
// Needs LOGIN_ID_HASH_SECRET in .env.
async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const stamp = Date.now();
  const mobile = `9${String(stamp).slice(-9)}`;
  const aadhaar = `2${String(stamp).slice(-11)}`;
  const made = {};
  try {
    await Promise.all([User.init(), Subject.init(), Student.init(), Enrollment.init()]);
    const dept = await Department.findOne();
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!dept || !year) throw new Error('Run "npm run seed" first');

    made.user = await User.create({ fullName: 'Check Applicant', email: `check-${stamp}@demo.example`, passwordHash: 'x', role: 'applicant', status: 'active' });
    made.program = await Program.create({ name: `CHECK-PROGRAM-${stamp}`, code: `CHK-${stamp}`, departmentId: dept._id });
    made.subject = await Subject.create({ code: 'CHK-1', name: 'Check Subject', programId: made.program._id, semester: 1, category: 'major' });
    ok(await dup(() => Subject.create({ code: 'chk-1', name: 'Other', programId: made.program._id, semester: 1, category: 'minor' })), 'a subject code is unique within a class and semester');

    made.app = await Application.create({
      applicantUserId: made.user._id, academicYearId: year._id, programId: made.program._id, aadhaarNumber: aadhaar,
      student: { mobile }, subjects: { mainGroup: 'Check', nep: { major: ['check subject'] } },
    });
    let refused = false;
    try { await Student.createFromApplication(made.app._id); } catch (e) { refused = e.statusCode === 409; }
    ok(refused, 'a draft application cannot become a student');
    await Application.updateOne({ _id: made.app._id }, { $set: { status: 'approved' } });

    const out = await Student.createFromApplication(made.app._id);
    made.student = out.student;
    ok(/^ENR-/.test(out.student.enrollmentNumber), 'student gets an enrollment number');
    ok(out.enrolled === 1 && out.unmatched.length === 0, 'the admission subject choice is enrolled');

    const fresh = await User.findById(made.user._id);
    ok(fresh.role === 'student' && fresh.mobile === mobile && fresh.aadhaarLast4 === aadhaar.slice(-4), 'the account became a student account with mobile and Aadhaar');
    for (const [label, input] of [['email', `CHECK-${stamp}@demo.example`], ['mobile', mobile], ['Aadhaar', aadhaar]]) {
      const found = await User.findByLoginId(input);
      ok(found && String(found._id) === String(made.user._id) && found.passwordHash === 'x', `sign-in lookup works with ${label}`);
    }

    let again = false;
    try { await Student.createFromApplication(made.app._id); } catch (e) { again = e.statusCode === 409; }
    ok(again, 'the same application cannot become a student twice');
  } finally {
    if (made.student) await Enrollment.deleteMany({ studentId: made.student._id });
    if (made.student) await Student.deleteOne({ _id: made.student._id });
    if (made.app) await Application.deleteOne({ _id: made.app._id });
    if (made.subject) await Subject.deleteOne({ _id: made.subject._id });
    if (made.program) await Program.deleteOne({ _id: made.program._id });
    if (made.user) await User.deleteOne({ _id: made.user._id });
    await mongoose.connection.close();
  }
}
async function dup(fn) { try { await fn(); return false; } catch (e) { return e.code === 11000; } }
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

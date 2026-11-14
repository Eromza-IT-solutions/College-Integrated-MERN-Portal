import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';
import User from '../src/models/User.js';

// Checks the admission models against the real DEV database: indexes, duplicate protection and
// the submit rules. It adds a few records named CHECK-... and always removes them again.
// Run the demo seed first:  npm run seed
// Run:  node scripts/check-admission-models.js
async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const made = { program: null, application: null };
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const dup = async (fn) => { try { await fn(); return false; } catch (e) { return e.code === 11000; } };
  try {
    await Promise.all([Program.init(), Application.init(), AdmissionDocument.init()]);
    const dept = await Department.findOne();
    const applicant = await User.findOne({ email: 'applicant@demo.example' });
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!dept || !applicant || !year) throw new Error('Run "npm run seed" first (needs a department, the demo applicant and a current year)');

    made.program = await Program.create({ name: 'CHECK-PROGRAM', code: 'CHECK-PROG', departmentId: dept._id });
    ok(await dup(() => Program.create({ name: 'CHECK-PROGRAM-2', code: 'check-prog', departmentId: dept._id })), 'program code is unique');

    const data = { applicantUserId: applicant._id, academicYearId: year._id, programId: made.program._id };
    made.application = await Application.create(data);
    ok(made.application.status === 'draft', 'new application is a draft');
    ok(await dup(() => Application.create(data)), 'one application per applicant, year and class');
    const refetched = await Application.findById(made.application._id);
    ok(refetched.aadhaarNumber === undefined, 'Aadhaar is hidden from normal queries');
    let refused = false;
    try { await refetched.submit(); } catch (e) { refused = e.statusCode === 400; }
    ok(refused, 'submitting an incomplete application is refused');

    const file = { applicationId: made.application._id, type: 'originalLc', fileName: 'lc.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, storageKey: 'check/1' };
    await AdmissionDocument.create(file);
    ok(await dup(() => AdmissionDocument.create(file)), 'one file per kind per application');
    const missing = await AdmissionDocument.missingRequired(made.application._id);
    ok(missing.length === 2 && !missing.includes('originalLc'), 'missing required documents are listed');
  } finally {
    if (made.application) {
      await AdmissionDocument.deleteMany({ applicationId: made.application._id });
      await Application.deleteOne({ _id: made.application._id });
    }
    if (made.program) await Program.deleteOne({ _id: made.program._id });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

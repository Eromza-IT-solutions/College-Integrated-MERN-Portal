import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';
import { requiredDocuments } from '../src/utils/documentRules.js';

// Checks the college data and the admission workflow against the real DEV database.
//  Part 1 (needs the seeds): the 59 programs and the college fee sheets are loaded, and fee lookups give the printed totals.
//  Part 2: a temporary applicant goes through the whole admission process
//          submitted -> subjects -> documents -> form approved -> fee paid -> hard copy -> student.
//          It uses temporary records named CHECK-... and removes them again. It uses up one receipt and one enrollment number.
// Run:  npm run seed   then   npm run seed:programs   then   npm run seed:fees   then   node scripts/check-college-data.js
// Needs LOGIN_ID_HASH_SECRET in .env.
async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to run against production');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const ok = (cond, label) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) process.exitCode = 1; };
  const made = {};
  const stamp = Date.now();
  try {
    await Promise.all([Program.init(), FeeStructure.init(), Application.init(), AdmissionDocument.init(), Student.init()]);
    const dept = await Department.findOne();
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!dept || !year) throw new Error('Run "npm run seed" first');

    // ---- Part 1: seeded college data ----
    const byLevel = async (level) => Program.countDocuments({ level });
    ok((await Program.countDocuments({ code: { $not: /^CHK-/ } })) >= 59, 'at least the 59 college programs are loaded (npm run seed:programs)');
    ok((await byLevel('Undergraduate')) >= 22 && (await byLevel('Post Graduate')) >= 13 && (await byLevel('Ph.D.')) >= 7, 'the programs are spread over the levels as the college list says');
    const ba = await Program.findOne({ code: 'BDPAEN' });
    const phd = await Program.findOne({ code: 'DDPSCH' });
    ok(ba && ba.durationYears === 3 && phd && phd.durationYears === 5, 'programs have their duration (B.A. 3 years, Ph.D. 5 years)');
    const find = (program, yearOfStudy, divisionType) => FeeStructure.findFor({ purpose: 'admission', academicYearId: year._id, programId: program._id, yearOfStudy, divisionType, feesCategory: 'PAYING' });
    const baFy = ba && (await find(ba, 1, 'P.N.G.'));
    ok(baFy && baFy.amountPaise === 1308000, 'F.Y. B.A. P.N.G. costs Rs 13,080 as printed (npm run seed:fees)');
    ok(baFy && baFy.heads.length === 31 && baFy.heads.reduce((n, h) => n + h.amountPaise, 0) === baFy.amountPaise, 'its 31 fee lines add up to the total');
    const baGrant = ba && (await find(ba, 1, 'Grantable'));
    ok(baGrant && baGrant.amountPaise === 645000, 'F.Y. B.A. Grantable costs Rs 6,450 as printed');
    const phd3 = phd && (await find(phd, 3, 'P.N.G.'));
    ok(phd3 && phd3.amountPaise === 2694000, 'Ph.D. Chemistry year 3 costs Rs 26,940 (the II-V column)');
    const indexes = await FeeStructure.collection.indexes();
    ok(indexes.some((i) => i.unique && i.key.yearOfStudy === 1 && i.key.divisionType === 1), 'the fee index covers year of study and division');
    ok(!indexes.some((i) => i.unique && i.key.feesCategory === 1 && !('yearOfStudy' in i.key)), 'the old fee index (without year of study) is gone');
    let dupFee = false;
    try { await FeeStructure.create({ purpose: 'admission', academicYearId: year._id, programId: ba._id, yearOfStudy: 1, divisionType: 'P.N.G.', feesCategory: 'PAYING', amountPaise: 1 }); } catch (e) { dupFee = e.code === 11000; }
    ok(dupFee, 'the same class fee cannot be added twice');

    // ---- Part 2: a whole admission ----
    made.user = await User.create({ fullName: 'Check Applicant', email: `check-${stamp}@demo.example`, passwordHash: 'x', role: 'applicant', status: 'active' });
    made.admin = await User.create({ fullName: 'Check Admin', email: `check-admin-${stamp}@demo.example`, passwordHash: 'x', role: 'admissionAdmin', status: 'active' });
    made.program = await Program.create({ name: `CHECK-PROGRAM-${stamp}`, code: `CHK-${stamp}`, departmentId: dept._id, level: 'Undergraduate', faculty: 'Commerce and Management' });
    made.subjects = await Subject.create([
      { code: 'CHK-M', name: 'Check Major', programId: made.program._id, semester: 1, category: 'major' },
      { code: 'CHK-A', name: 'Check AEC', programId: made.program._id, semester: 1, category: 'aec' },
      { code: 'CHK-S3', name: 'Check Semester 3', programId: made.program._id, semester: 3, category: 'major' },
    ]);
    made.fee = await FeeStructure.create({
      purpose: 'admission', academicYearId: year._id, programId: made.program._id, yearOfStudy: 1, divisionType: 'P.N.G.', feesCategory: 'PAYING',
      heads: [{ key: 'tuitionFee', label: 'Tuition Fee', amountPaise: 900000 }, { key: 'gymkhana', label: 'Gymkhana', amountPaise: 25000 }], label: 'CHECK',
    });
    ok(made.fee.amountPaise === 925000, 'a fee made from lines gets the total automatically');

    made.app = await Application.create({
      applicantUserId: made.user._id, academicYearId: year._id, programId: made.program._id, divisionType: 'P.N.G.', feesCategory: 'PAYING',
      aadhaarNumber: `3${String(stamp).slice(-11)}`, student: { mobile: `8${String(stamp).slice(-9)}`, gender: 'Male', casteCategory: 'OPEN' },
    });
    const offered = await Application.offeredSubjects(made.program._id, 1);
    ok(offered.major && offered.major.length === 1 && offered.aec.length === 1 && !offered.major.some((x) => x.code === 'CHK-S3'), 'the form offers only the first semester subjects of the class, by group');
    let bad = false;
    try { await made.app.chooseSubjects({ minor: [made.subjects[0]._id] }); } catch (e) { bad = e.statusCode === 400; }
    ok(bad, 'a subject filed under the wrong group is refused');
    bad = false;
    try { await made.app.chooseSubjects({ major: [made.subjects[2]._id] }); } catch (e) { bad = e.statusCode === 400; }
    ok(bad, 'a subject of another semester is refused');
    await made.app.chooseSubjects({ major: [made.subjects[0]._id], aec: [made.subjects[1]._id] });
    ok(String((await Application.findById(made.app._id)).subjects.nep.major[0]) === String(made.subjects[0]._id), 'the picks are saved as subject ids');

    // the form is submitted: skip the 100 form fields here (submit() is covered by check-admission-models.js)
    await Application.updateOne({ _id: made.app._id }, { $set: { status: 'submitted', applicationNumber: `CHECK-${stamp}`, submittedAt: new Date() } });
    let app = await Application.findById(made.app._id);

    bad = false;
    try { await app.approveForm({ byUserId: made.admin._id }); } catch (e) { bad = e.statusCode === 409; }
    ok(bad, 'the form cannot be approved before subjects and documents');
    bad = false;
    try { await app.approveDocuments({ byUserId: made.admin._id }); } catch (e) { bad = e.statusCode === 409; }
    ok(bad, 'documents cannot be approved while required ones are missing');

    app = await app.approveSubjects({ byUserId: made.admin._id });
    ok(app.subjectsApprovedAt && String(app.subjectsApprovedByUserId) === String(made.admin._id), 'step 1: subjects approved by the admin');

    const required = requiredDocuments({ casteCategory: 'OPEN', feesCategory: 'PAYING', hasGap: false });
    made.docs = await AdmissionDocument.create(required.map((d) => ({
      applicationId: made.app._id, type: d.type, fileName: `${d.type}.jpg`, mimeType: 'image/jpeg', sizeBytes: 1000, storageKey: `check/${d.type}`,
      ...(d.type === 'photo' ? { width: 80, height: 100 } : {}),
    })));
    ok((await AdmissionDocument.missingRequired(made.app._id)).length === 0, 'all required documents are uploaded');
    bad = false;
    try { await app.approveDocuments({ byUserId: made.admin._id }); } catch (e) { bad = e.statusCode === 409; }
    ok(bad, 'documents cannot be approved until they are verified');
    await AdmissionDocument.updateMany({ applicationId: made.app._id }, { $set: { status: 'verified' } });
    app = await app.approveDocuments({ byUserId: made.admin._id });
    ok(!!app.documentsApprovedAt, 'step 2: documents approved');

    const now = new Date();
    app = await app.approveForm({ byUserId: made.admin._id, now });
    ok(app.status === 'approved' && app.feeAmountPaise === 925000, 'step 3: form approved and the fee fixed at Rs 9,250');
    ok(Math.abs(app.feeDueAt.getTime() - (now.getTime() + 3 * 86400000)) < 1000, 'the fee is due in 3 days');
    let second = false;
    try { await app.approveForm({ byUserId: made.admin._id }); } catch (e) { second = e.statusCode === 409; }
    ok(second, 'approving the same form twice is refused');

    made.payment = await Payment.create({
      purpose: 'admission', payerUserId: made.user._id, academicYearId: year._id, feeStructureId: made.fee._id,
      applicationId: made.app._id, amountPaise: 925000, gatewayOrderId: `check_${stamp}`,
    });
    bad = false;
    try { await app.markFeePaid({ paymentId: made.payment._id }); } catch (e) { bad = e.statusCode === 409; }
    ok(bad, 'an unpaid payment does not count');
    await Payment.markPaid(made.payment._id, { gatewayPaymentId: `pay_${stamp}` });
    app = await app.markFeePaid({ paymentId: made.payment._id });
    ok(app.status === 'feePaid' && !!app.hardCopyDueAt, 'fee paid: the 3-day hard copy window starts');
    app = await app.markFeePaid({ paymentId: made.payment._id });
    ok(app.status === 'feePaid', 'confirming the payment twice changes nothing');

    let early = false;
    try { await Student.createFromApplication(made.app._id); } catch (e) { early = e.statusCode === 409; }
    ok(early, 'no student record before the hard copy is received');
    app = await app.receiveHardCopy({ byUserId: made.admin._id });
    ok(app.status === 'admitted' && !!app.admittedAt, 'hard copy received: the admission is complete');

    const out = await Student.createFromApplication(made.app._id);
    made.student = out.student;
    ok(out.enrolled === 2 && out.unmatched.length === 0 && out.student.currentSemester === 1, 'the student is enrolled in the two subjects picked on the form');

    // deadlines
    made.late = await Application.create({ applicantUserId: made.admin._id, academicYearId: year._id, programId: made.program._id, status: 'approved', feeDueAt: new Date(Date.now() - 86400000) });
    const overdue = await Application.overdue();
    ok(overdue.fee.some((a) => String(a._id) === String(made.late._id)), 'an unpaid fee past its due date is listed as overdue');
    const cancelled = await Application.cancelUnpaid();
    ok(cancelled >= 1 && (await Application.findById(made.late._id)).status === 'cancelled', 'the daily job cancels admissions whose fee is late');
    ok((await Application.findById(made.app._id)).status === 'admitted', 'it leaves admitted applications alone');
  } finally {
    if (made.student) await Enrollment.deleteMany({ studentId: made.student._id });
    if (made.student) await Student.deleteOne({ _id: made.student._id });
    await AdmissionDocument.deleteMany({ applicationId: made.app && made.app._id });
    if (made.payment) await Payment.deleteOne({ _id: made.payment._id });
    if (made.late) await Application.deleteOne({ _id: made.late._id });
    if (made.app) await Application.deleteOne({ _id: made.app._id });
    if (made.fee) await FeeStructure.deleteOne({ _id: made.fee._id });
    if (made.subjects) await Subject.deleteMany({ _id: { $in: made.subjects.map((s) => s._id) } });
    if (made.program) await Program.deleteOne({ _id: made.program._id });
    if (made.user) await User.deleteOne({ _id: made.user._id });
    if (made.admin) await User.deleteOne({ _id: made.admin._id });
    await mongoose.connection.close();
  }
}
main().catch((err) => { console.error('Check failed:', err.message); process.exit(1); });

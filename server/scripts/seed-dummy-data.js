// Fills the DEV database with a realistic set of DUMMY data for the whole portal.
//
// Run (from the server folder):  node scripts/seed-dummy-data.js      (or add "seed:dummy" to package.json)
//
// What it does, in order:
//   0. Runs the existing seeds it depends on (roles/departments/year/demo users, permissions, 59 programs, fee sheets,
//      sample subjects, sample exams, sample timetable). All of them are safe to repeat.
//   1. Adds extra staff (teachers and HODs for Computer Science and Arts) with Teacher profiles.
//   2. 23 applicants: 15 go through the REAL admission workflow to become students (documents, three approvals, fee,
//      payment + receipt, hard copy, enrollment number, subject enrollment); 8 stay at other statuses
//      (draft, submitted, returned, waitlisted, approved, feePaid, rejected, admitted).
//   3. Exam forms (approved / rejected / submitted / waiting for payment) with exam fee payments.
//   4. Results (some published, some not), with grades worked out by the model.
//   5. Timetable slots, 4 weeks of attendance, internal marks (draft / submitted / approved), teaching plans.
//   6. Refunds, website content (notices, event, news, gallery, page) and some audit-log rows.
//
// Rules: refuses to run when NODE_ENV=production. Safe to run again: it looks for what exists and only adds what is missing.
// Needs MONGODB_URI and LOGIN_ID_HASH_SECRET (16+ characters) in .env. No Super Admin is created here; if one exists
// (npm run create-super-admin) the sample refund is also approved by it.
// All people, phone numbers, Aadhaar numbers and files are INVENTED. Uploaded-document records point to files that do not exist.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import User from '../src/models/User.js';
import Teacher from '../src/models/Teacher.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Program from '../src/models/Program.js';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import Student from '../src/models/Student.js';
import Payment from '../src/models/Payment.js';
import Refund from '../src/models/Refund.js';
import Exam from '../src/models/Exam.js';
import ExamForm from '../src/models/ExamForm.js';
import Result from '../src/models/Result.js';
import Timetable from '../src/models/Timetable.js';
import Attendance from '../src/models/Attendance.js';
import Marks from '../src/models/Marks.js';
import TeachingPlan from '../src/models/TeachingPlan.js';
import WebsiteContent from '../src/models/WebsiteContent.js';
import AuditLog from '../src/models/AuditLog.js';
import Subject from '../src/models/Subject.js';
import { hashPassword } from '../src/utils/password.js';
import { requiredDocuments } from '../src/utils/documentRules.js';
import { todayAtCollege, weekdayOf } from '../src/utils/dates.js';
import { seed, pickPassword } from './seed-demo-data.js';
import { seedPermissions } from './seed-permissions.js';
import { seedPrograms } from './seed-college-programs.js';
import { seedFees } from './seed-college-fees.js';
import { seedSubjects } from './seed-sample-subjects.js';
import { seedExams } from './seed-sample-exam.js';
import { seedTimetable } from './seed-sample-timetable.js';

const log = (m) => console.log(m);
const DAY = 24 * 60 * 60 * 1000;
const PROGS = ['BDPCCA', 'BDPSCS', 'BDPAEN']; // B.Com. Cost & Mgmt Accounting (COM), B.Sc. Computer Science (CSC), B.A. English (ART)
const PROG_GROUPS = {
  BDPCCA: { mainGroup: 'Commerce', majorGroup: 'Cost and Management Accounting', minorGroup: 'Business Mathematics' },
  BDPSCS: { mainGroup: 'Science', majorGroup: 'Computer Science', minorGroup: 'Mathematics' },
  BDPAEN: { mainGroup: 'Arts', majorGroup: 'English', minorGroup: 'Sociology' },
};
const addDays = (text, n) => new Date(new Date(`${text}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);
const ignore409 = (err) => { if (!(err && err.statusCode === 409)) throw err; };

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------
const EXTRA_STAFF = [
  { key: 'teacherCSC', email: 'teacher.csc@demo.example', fullName: 'Demo Teacher (Computer Science)', role: 'teacher', dept: 'CSC', emp: 'DEMO-T-003', designation: 'Assistant Professor', phone: '9876500003', joined: '2019-06-17' },
  { key: 'teacherART', email: 'teacher.art@demo.example', fullName: 'Demo Teacher (Arts)', role: 'teacher', dept: 'ART', emp: 'DEMO-T-004', designation: 'Assistant Professor', phone: '9876500004', joined: '2020-07-01' },
  { key: 'hodCSC', email: 'hod.csc@demo.example', fullName: 'Demo HOD (Computer Science)', role: 'hod', dept: 'CSC', emp: 'DEMO-H-002', designation: 'Head of Department', phone: '9876500005', joined: '2012-06-15' },
  { key: 'hodART', email: 'hod.art@demo.example', fullName: 'Demo HOD (Arts)', role: 'hod', dept: 'ART', emp: 'DEMO-H-003', designation: 'Head of Department', phone: '9876500006', joined: '2011-06-20' },
];

// [surname, first name, father's name (middle name), gender]
const PEOPLE = [
  ['Shaikh', 'Aman', 'Rafiq', 'Male'], ['Khan', 'Zoya', 'Iqbal', 'Female'], ['Patil', 'Riya', 'Suresh', 'Female'], ['Deshmukh', 'Omkar', 'Anil', 'Male'],
  ['Sayyed', 'Faiz', 'Nasir', 'Male'], ['Pathan', 'Sana', 'Yusuf', 'Female'], ['Kulkarni', 'Aarav', 'Mohan', 'Male'], ['Inamdar', 'Alina', 'Aslam', 'Female'],
  ['Shinde', 'Pratik', 'Ganesh', 'Male'], ['Ansari', 'Hamza', 'Salim', 'Male'], ['Jadhav', 'Neha', 'Vijay', 'Female'], ['Mulla', 'Rehan', 'Arif', 'Male'],
  ['Bagwan', 'Mariyam', 'Farooq', 'Female'], ['More', 'Tejas', 'Sachin', 'Male'], ['Tamboli', 'Ayesha', 'Imran', 'Female'], ['Chavan', 'Sakshi', 'Prakash', 'Female'],
  ['Attar', 'Danish', 'Latif', 'Male'], ['Gaikwad', 'Isha', 'Rahul', 'Female'], ['Shaikh', 'Junaid', 'Kareem', 'Male'], ['Naik', 'Pooja', 'Dilip', 'Female'],
  ['Sheikh', 'Bilal', 'Majid', 'Male'], ['Kamble', 'Rutuja', 'Santosh', 'Female'], ['Qureshi', 'Yasir', 'Hanif', 'Male'],
];
const MUSLIM_SURNAMES = new Set(['Shaikh', 'Khan', 'Sayyed', 'Pathan', 'Inamdar', 'Ansari', 'Mulla', 'Bagwan', 'Tamboli', 'Attar', 'Sheikh', 'Qureshi']);
const CATEGORY_OVERRIDE = { 5: 'EWS', 9: 'OBC', 21: 'SC' }; // everyone else is OPEN
const MOTHERS = ['Shabana', 'Sunita', 'Farheen', 'Mangal', 'Nusrat', 'Anita', 'Rukhsana', 'Sarika'];
const BLOOD = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

// Which admission status each extra applicant stays at (index 15 onward in PEOPLE).
const EXTRA_APPLICANTS = [
  ['BDPCCA', 'draft'], ['BDPSCS', 'submitted'], ['BDPAEN', 'returned'], ['BDPCCA', 'waitlisted'],
  ['BDPSCS', 'approved'], ['BDPAEN', 'feePaid'], ['BDPCCA', 'rejected'], ['BDPSCS', 'admitted'],
];
// What happens to each of the 5 students of a program in the exam flow.
const EXAM_MODES = [
  ['approved', 'approved', 'submitted', 'pendingPayment', null],
  ['approved', 'approved', 'submitted', 'rejected', null],
  ['approved', 'approved', 'submitted', 'pendingPayment', null],
];
// Per program: [teaching plan state of subject 1, of subject 2]
const PLAN_STATES = [['approved', 'submitted'], ['approved', 'returned'], ['submitted', 'draft']];

// ---------------------------------------------------------------------------------------------
// Admission
// ---------------------------------------------------------------------------------------------
function categoryOf(idx) { return CATEGORY_OVERRIDE[idx] || 'OPEN'; }

function formData({ idx, userId, year, prog, code, partial }) {
  const [surname, firstName, middleName, gender] = PEOPLE[idx];
  const muslim = MUSLIM_SURNAMES.has(surname);
  const casteCategory = categoryOf(idx);
  const address = {
    line1: `${10 + idx}, Sample Nagar`, line2: 'Camp Area', country: 'INDIA', pincode: `4110${String(10 + idx).padStart(2, '0')}`,
    state: 'Maharashtra', district: 'Pune', taluka: 'Pune City', location: 'Pune',
  };
  const obtained = 330 + ((idx * 37) % 240);
  const percentage = Math.round((obtained / 600) * 10000) / 100;
  const data = {
    applicantUserId: userId, academicYearId: year._id, programId: prog._id, yearOfStudy: 1,
    admissionType: 'Provisional', divisionType: 'P.N.G.', feesCategory: 'PAYING',
    abcId: `ABC${100000000000 + idx}`, aadhaarNumber: `2345${10000000 + idx}`,
    student: {
      surname, firstName, middleName, noMiddleName: false, nameCombination: 'Surname First Middle',
      fullName: `${surname} ${firstName} ${middleName}`, gender, address,
      mobile: `98${10000000 + idx}`, email: `dummy.${firstName}.${surname}@demo.example`.toLowerCase(),
      birthDate: new Date(Date.UTC(2007, idx % 12, 1 + ((idx * 3) % 27))), birthPlace: 'Pune', birthPlaceCountry: 'INDIA',
      nationality: 'INDIAN', motherTongue: muslim ? 'Urdu' : 'Marathi', maritalStatus: 'Single', bloodGroup: BLOOD[idx % BLOOD.length], handicap: 'No',
      religion: idx === 21 ? 'BUDDHIST' : muslim ? 'ISLAM' : 'HINDU',
      caste: casteCategory === 'OPEN' ? (muslim ? 'MUSLIM' : 'MARATHA') : 'SAMPLE CASTE', casteCategory,
      ...(casteCategory === 'SC' || casteCategory === 'OBC' ? { casteValidityNo: `CV/2026/${1000 + idx}` } : {}),
      isMinority: muslim ? 'Religious' : 'No', ...(muslim ? { minorityDetail: 'Muslim' } : {}),
    },
  };
  if (partial) return data; // a draft: only the first part is filled
  Object.assign(data, {
    parent: {
      fatherFullName: `${middleName} ${surname}`, motherFirstName: MOTHERS[idx % MOTHERS.length], sameAddressAsStudent: true, address,
      fatherMobile: `97${10000000 + idx}`, motherMobile: `96${10000000 + idx}`, email: `dummy.parent${idx}@demo.example`, isAlumni: false,
    },
    lastExam: {
      lastClass: 'XII', instituteName: 'Sample Junior College, Pune', boardName: 'Maharashtra State Board', eligibility: 'Same Institute/College',
      stateOfResidence: 'Maharashtra', qualifiedExam: 'HSC', passingMonth: 'Mar', passingYear: '2026', obtainedMarks: obtained, outOfMarks: 600, percentage,
      result: percentage >= 75 ? 'Distinction' : percentage >= 60 ? 'I Class' : 'II Class', attempt: '1st', seatNo: `H${100000 + idx}`,
      tcLcNo: `TC/2026/${idx}`, tcLcIssueDate: new Date(Date.UTC(2026, 5, 10)), hasGap: false,
    },
    passport: { notApplicable: true },
    subjects: { ...PROG_GROUPS[code] },
  });
  return data;
}

async function uploadDocs(app, mode, adminId) {
  const required = requiredDocuments({ casteCategory: app.student.casteCategory, feesCategory: app.feesCategory, hasGap: !!(app.lastExam && app.lastExam.hasGap) });
  let list = required.map((d) => d.type);
  if (mode === 'verified') list = [...list, 'signature'];
  else list = list.slice(0, 3);
  for (const [i, type] of list.entries()) {
    const rejected = mode === 'returned' && i === 0;
    const verified = mode === 'verified';
    const size = type === 'photo' ? { width: 80, height: 100 } : type === 'signature' ? { width: 80, height: 50 } : {};
    await AdmissionDocument.updateOne(
      { applicationId: app._id, type },
      {
        $setOnInsert: {
          fileName: `${type}.jpg`, mimeType: 'image/jpeg', sizeBytes: 90000 + type.length * 1000, ...size, storageKey: `dummy/${app._id}/${type}.jpg`,
          status: verified ? 'verified' : rejected ? 'rejected' : 'pending',
          ...(verified || rejected ? { reviewedByUserId: adminId, reviewedAt: new Date() } : {}),
          ...(rejected ? { reviewNote: 'The scan is blurred. Please upload a clear copy.' } : {}),
        },
      },
      { upsert: true }
    );
  }
}

const tagOf = (app) => String(app.applicationNumber || app._id).replace(/\W/g, '');

/** A paid admission payment for the application (created and settled with the model's own rules). */
async function ensureAdmissionPayment(app, payerId, { paid }) {
  let pay = await Payment.findOne({ applicationId: app._id, purpose: 'admission' });
  if (!pay) {
    pay = await Payment.create({
      purpose: 'admission', payerUserId: payerId, academicYearId: app.academicYearId, feeStructureId: app.feeStructureId, applicationId: app._id,
      amountPaise: app.feeAmountPaise, gatewayOrderId: `order_DM${tagOf(app)}`, orderCreatedAt: new Date(),
    });
  }
  if (paid && pay.status === 'created') {
    pay = await Payment.markPaid(pay._id, {
      gatewayPaymentId: `pay_DM${tagOf(app)}`,
      fields: { confirmedVia: 'checkout', signatureVerifiedAt: new Date(), gatewayMethod: 'upi' },
    });
  }
  return pay;
}

async function buildApplicant(spec, ctx) {
  const { idx, code, target } = spec;
  const prog = ctx.programs[code];
  const [surname, firstName] = PEOPLE[idx];
  const email = `dummy.${firstName}.${surname}@demo.example`.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ fullName: `${firstName} ${surname}`, email, passwordHash: ctx.hash, role: 'applicant', status: 'active', emailVerifiedAt: new Date() });
  }
  const admin = ctx.admissionAdmin;
  const load = () => Application.findOne({ applicantUserId: user._id, academicYearId: ctx.year._id, programId: prog._id }).select('+aadhaarNumber');
  let app = await load();
  if (!app) app = await Application.create(formData({ idx, userId: user._id, year: ctx.year, prog, code, partial: target === 'draft' }));
  if (target === 'draft') return { user, app };

  if (app.status === 'draft') {
    const offered = await Application.offeredSubjects(prog._id, 1);
    const picks = Object.fromEntries(Object.entries(offered).map(([cat, list]) => [cat, list.map((s) => s._id)]));
    await app.chooseSubjects(picks);
    await app.submit();
    app = await load();
  }
  const note = { waitlisted: 'Seats are full in this division. The form stays on the waiting list.', returned: 'Some documents need to be uploaded again.', rejected: 'Not eligible for this class.' };

  if (target === 'submitted') { if (app.status === 'submitted') await uploadDocs(app, 'pending', admin._id); return { user, app }; }
  if (target === 'waitlisted') {
    if (app.status === 'submitted') { await uploadDocs(app, 'pending', admin._id); await app.waitlist({ byUserId: admin._id, note: note.waitlisted }); }
    return { user, app: await load() };
  }
  if (target === 'returned') {
    if (app.status === 'submitted') { await uploadDocs(app, 'returned', admin._id); await app.returnForCorrection({ byUserId: admin._id, note: note.returned }); }
    return { user, app: await load() };
  }
  if (target === 'rejected') {
    if (app.status === 'submitted') await app.reject({ byUserId: admin._id, note: note.rejected });
    return { user, app: await load() };
  }

  // approved and beyond: the three approvals
  if (['submitted', 'waitlisted'].includes(app.status)) {
    await app.approveSubjects({ byUserId: admin._id });
    await uploadDocs(await load(), 'verified', admin._id);
    app = await load();
    await app.approveDocuments({ byUserId: admin._id });
    app = await load();
    await app.approveForm({ byUserId: admin._id });
    app = await load();
  }
  if (target === 'approved') { if (app.status === 'approved') await ensureAdmissionPayment(app, user._id, { paid: false }); return { user, app }; }

  if (app.status === 'approved') {
    const pay = await ensureAdmissionPayment(app, user._id, { paid: true });
    await app.markFeePaid({ paymentId: pay._id });
    app = await load();
  }
  if (target === 'feePaid') return { user, app };
  if (app.status === 'feePaid') { await app.receiveHardCopy({ byUserId: admin._id }); app = await load(); }
  if (target === 'admitted') return { user, app };

  let student = await Student.findOne({ applicationId: app._id });
  if (!student) student = (await Student.createFromApplication(app._id)).student;
  return { user, app, student };
}

// ---------------------------------------------------------------------------------------------
// Exams and results
// ---------------------------------------------------------------------------------------------
async function ensureExamPayment(form, payerId, exam) {
  let pay = await Payment.findOne({ examFormId: form._id, purpose: 'exam' });
  if (!pay) {
    pay = await Payment.create({
      purpose: 'exam', payerUserId: payerId, academicYearId: exam.academicYearId, feeStructureId: form.feeStructureId, examFormId: form._id,
      amountPaise: form.feeAmountPaise, gatewayOrderId: `order_DX${form._id}`, orderCreatedAt: new Date(),
    });
  }
  if (pay.status === 'created') {
    pay = await Payment.markPaid(pay._id, { gatewayPaymentId: `pay_DX${form._id}`, fields: { confirmedVia: 'webhook', gatewayMethod: 'card' } });
  }
  return pay;
}

async function examFlow(student, user, exam, mode, examAdminId) {
  let form = await ExamForm.start({ examId: exam._id, studentId: student._id });
  if (form.status === 'draft') {
    const offered = await form.offeredSubjects();
    await form.selectSubjects(offered.map((s) => s._id));
    await form.continueToPayment();
    form = await ExamForm.findById(form._id);
  }
  if (mode === 'pendingPayment') return form;
  if (form.status === 'pendingPayment') {
    const pay = await ensureExamPayment(form, user._id, exam);
    form = await form.markPaid(pay._id);
  }
  if (mode === 'submitted') return form;
  if (form.status === 'submitted') {
    const approve = mode !== 'rejected';
    form = await ExamForm.decide(form._id, { approve, decidedByUserId: examAdminId, note: approve ? undefined : 'Selected subjects do not match the enrollment record.' });
  }
  return form;
}

async function resultFlow(form, position, publish, examAdminId) {
  const sheet = await Result.openForApprovedForm(form._id);
  if (!sheet.isPublished && !sheet.isComplete) {
    const entries = sheet.lines.map((l, k) => ({
      subjectId: l.subjectId,
      // the second student of each class fails the first subject (internal marks below 40% of 40)
      internalMarks: position === 1 && k === 0 ? 10 : 28 + ((position * 5 + k * 3) % 12),
      externalMarks: 40 + ((position * 7 + k * 5) % 20),
    }));
    await sheet.enterMarks(entries, { byUserId: examAdminId });
  }
  if (publish) await Result.publish(sheet._id, { byUserId: examAdminId });
}

// ---------------------------------------------------------------------------------------------
// Website content
// ---------------------------------------------------------------------------------------------
async function seedWebsite(ctx) {
  const web = ctx.websiteAdmin._id;
  const now = Date.now();
  const comDept = ctx.deptByCode.COM._id;
  const ITEMS = [
    { type: 'notice', title: 'Admission Process for A.Y. 2026-27', summary: 'Online admission forms are open.', body: 'The online admission process for A.Y. 2026-27 is open. Fill the form, upload the documents and pay the fee after approval. Hard copies are due within 3 days of payment.', isPinned: true, state: 'published' },
    { type: 'notice', title: 'Semester I Examination Form Dates', summary: 'Exam forms open for 30 days.', body: 'Students of semester I may fill the examination form online. Tick your subjects and pay the exam fee before the closing date.', state: 'published' },
    { type: 'notice', title: 'Holiday on Account of Eid-e-Milad', body: 'The college will remain closed on the day of Eid-e-Milad. Regular lectures resume the next working day.', state: 'published', expiresAt: new Date(now + 20 * DAY) },
    { type: 'notice', title: 'Staff Meeting Schedule', body: 'Monthly staff meeting in the conference room. This notice is for signed-in members only.', isPublic: false, state: 'published' },
    { type: 'notice', title: 'Commerce Department Seminar', body: 'A seminar on cost accounting practices is arranged by the Commerce department for all F.Y. B.Com. students.', departmentId: comDept, author: ctx.staff.COM.hod._id, state: 'published' },
    { type: 'notice', title: 'Scholarship Application Reminder', body: 'Eligible students should submit scholarship forms to the office. (Draft: not yet published.)', state: 'draft' },
    { type: 'notice', title: 'Fee Payment Deadline Extended', body: 'The earlier fee deadline has passed and this notice is no longer shown.', state: 'expired' },
    { type: 'event', title: 'Annual Cultural Fest 2027', summary: 'Three days of music, drama and art.', body: 'Join the annual cultural fest. Registrations are open at the student office.', startsAt: new Date(now + 20 * DAY), endsAt: new Date(now + 22 * DAY), venue: 'College Auditorium', imageUrl: '/uploads/sample-fest-banner.jpg', state: 'published' },
    { type: 'news', title: 'Students Win Inter-College Quiz', summary: 'Our team took first place.', body: 'A team of three students won the inter-college general knowledge quiz held in Pune.', state: 'published' },
    { type: 'news', title: 'Old Result Announcement', body: 'An old announcement kept for the record.', state: 'archived' },
    { type: 'gallery', title: 'Independence Day Celebration', summary: 'Photos from the flag hoisting.', images: [1, 2, 3].map((n) => ({ url: `/uploads/sample-independence-${n}.jpg`, caption: `Independence Day, photo ${n}` })), state: 'published' },
    { type: 'page', title: 'About the College', summary: 'A short introduction.', body: 'This is a sample college profile page. Replace it with the real text of the college: history, vision, mission and contact details.', state: 'published' },
  ];
  let added = 0;
  for (const it of ITEMS) {
    if (await WebsiteContent.findOne({ type: it.type, title: it.title })) continue;
    const { state, author, expiresAt, ...rest } = it;
    const authorUserId = author || web;
    const doc = await WebsiteContent.createWithSlug({ ...rest, authorUserId, lastEditedByUserId: authorUserId });
    if (state === 'published') await WebsiteContent.publish(doc._id, { byUserId: authorUserId, expiresAt });
    if (state === 'archived') await WebsiteContent.archive(doc._id, { byUserId: authorUserId });
    if (state === 'expired') await WebsiteContent.publish(doc._id, { byUserId: authorUserId, publishAt: new Date(now - 10 * DAY), expiresAt: new Date(now - DAY) });
    added += 1;
  }
  return added;
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------
async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to add dummy data when NODE_ENV=production');
  if (!process.env.LOGIN_ID_HASH_SECRET || process.env.LOGIN_ID_HASH_SECRET.length < 16) throw new Error('Set LOGIN_ID_HASH_SECRET in .env (16+ characters)');
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });

  log('0. Running the seeds this script depends on ...');
  const base = await seed();
  await seedPermissions();
  await seedPrograms();
  await seedFees();
  await seedSubjects();
  await seedExams();
  await seedTimetable();
  const password = base.password ? base.password.value : pickPassword().password;
  const hash = await hashPassword(password);
    // Only this script's applicants/students (dummy.<name>@demo.example) that have never signed in.
  if (process.env.DEMO_PASSWORD) {
    await User.updateMany(
      { email: /^dummy\..+@demo\.example$/, lastLoginAt: null },
      { $set: { passwordHash: hash } }
    );
  }

  const year = await AcademicYear.findOne({ isCurrent: true });
  const depts = await Department.find({});
  const deptByCode = Object.fromEntries(depts.map((d) => [d.code, d]));
  const programs = Object.fromEntries((await Program.find({ code: { $in: PROGS } })).map((p) => [p.code, p]));
  const byEmail = async (e) => { const u = await User.findOne({ email: e }); if (!u) throw new Error(`Demo user ${e} not found. Run "npm run seed" first.`); return u; };
  const admissionAdmin = await byEmail('admission.admin@demo.example');
  const examAdmin = await byEmail('exam.admin@demo.example');
  const websiteAdmin = await byEmail('website.admin@demo.example');
  const superAdmin = await User.findOne({ role: 'superAdmin' });

  log('1. Extra staff ...');
  const extra = {};
  for (const s of EXTRA_STAFF) {
    let user = await User.findOne({ email: s.email });
    if (!user) user = await User.create({ fullName: s.fullName, email: s.email, passwordHash: hash, role: s.role, departmentId: deptByCode[s.dept]._id, status: 'active', emailVerifiedAt: new Date() });
    if (!(await Teacher.findOne({ userId: user._id }))) {
      await Teacher.create({ userId: user._id, employeeNumber: s.emp, departmentId: user.departmentId, designation: s.designation, phone: s.phone, joiningDate: new Date(s.joined), status: 'active' });
    }
    if (s.role === 'hod') await Department.updateOne({ _id: user.departmentId, hodUserId: null }, { $set: { hodUserId: user._id } });
    extra[s.key] = user;
  }
  const staff = {
    COM: { teacher: await byEmail('teacher.com@demo.example'), hod: await byEmail('hod.com@demo.example') },
    CSC: { teacher: extra.teacherCSC, hod: extra.hodCSC },
    ART: { teacher: extra.teacherART, hod: extra.hodART },
  };
  const deptCodeOf = { BDPCCA: 'COM', BDPSCS: 'CSC', BDPAEN: 'ART' };
  const ctx = { year, hash, programs, admissionAdmin, examAdmin, websiteAdmin, deptByCode, staff };

  log('2. Applicants and students (real admission workflow) ...');
  const specs = [];
  PROGS.forEach((code, p) => { for (let j = 0; j < 5; j += 1) specs.push({ idx: p * 5 + j, code, target: 'student', p, j }); });
  EXTRA_APPLICANTS.forEach(([code, target], k) => specs.push({ idx: 15 + k, code, target }));
  const students = {}; // code -> [{ student, user }]
  for (const spec of specs) {
    const out = await buildApplicant(spec, ctx);
    if (out.student) (students[spec.code] ||= []).push({ student: out.student, user: out.user });
  }

  log('3. Exam forms and exam fee payments ...');
  const exams = {};
  for (const code of PROGS) {
    exams[code] = await Exam.findOne({ academicYearId: year._id, programId: programs[code]._id, semester: 1, name: 'SAMPLE End Semester Exam' });
    if (!exams[code]) throw new Error('Sample exam not found');
    await Exam.updateOne({ _id: exams[code]._id }, { $set: { status: 'open', formOpensAt: new Date(Date.now() - DAY), formClosesAt: new Date(Date.now() + 30 * DAY) } });
    exams[code] = await Exam.findById(exams[code]._id);
  }
  const approvedForms = {}; // code -> [{ form, position }]
  for (const [p, code] of PROGS.entries()) {
    approvedForms[code] = [];
    for (const [j, { student, user }] of (students[code] || []).entries()) {
      const mode = EXAM_MODES[p][j];
      if (!mode) continue;
      const form = await examFlow(student, user, exams[code], mode, examAdmin._id);
      if (form.status === 'approved') approvedForms[code].push({ form, position: j });
    }
  }

  log('4. Results ...');
  for (const [p, code] of PROGS.entries()) {
    for (const { form, position } of approvedForms[code]) await resultFlow(form, position, p < 2, examAdmin._id); // classes 1 and 2 published, class 3 not
  }

  log('5. Timetable, attendance, internal marks, teaching plans ...');
  const subjectsOf = {};
  for (const code of PROGS) subjectsOf[code] = await Subject.find({ programId: programs[code]._id, semester: 1, code: /^SMP-/ }).sort({ code: 1 });
  for (const code of PROGS) {
    const prog = programs[code];
    const { teacher, hod } = staff[deptCodeOf[code]];
    const slotsWanted = [
      ...subjectsOf[code].slice(0, 5).map((s, i) => ({ subject: s, teacher, dayOfWeek: i + 1, period: 1, startTime: '09:00', endTime: '10:00' })),
      { subject: subjectsOf[code][0], teacher: hod, dayOfWeek: 1, period: 2, startTime: '10:00', endTime: '11:00' }, // the HOD also teaches
    ];
    for (const w of slotsWanted) {
      const key = { academicYearId: year._id, programId: prog._id, semester: 1, division: 'A', dayOfWeek: w.dayOfWeek, period: w.period };
      if (await Timetable.findOne({ ...key, isActive: true })) continue;
      await Timetable.addSlot({ ...key, subjectId: w.subject._id, teacherUserId: w.teacher._id, startTime: w.startTime, endTime: w.endTime, room: 'SAMPLE-102' });
    }
  }
  // attendance: the last 4 occurrences of every lecture (written directly, so dates older than the 7-day correction limit are possible)
  const today = todayAtCollege();
  const slots = await Timetable.find({ academicYearId: year._id, isActive: true });
  for (const [si, slot] of slots.entries()) {
    const roster = await Attendance.rosterForSlot(slot);
    if (!roster.length) continue;
    const delta = (weekdayOf(today) - slot.dayOfWeek + 7) % 7;
    for (let k = 0; k < 4; k += 1) {
      const lectureDate = addDays(today, -(delta + 7 * k));
      const records = roster.map((st, i) => {
        const n = (i * 7 + k * 3 + si) % 10;
        return { studentId: st._id, status: n < 7 ? 'present' : n === 7 ? 'leave' : 'absent' };
      });
      await Attendance.updateOne(
        { slotId: slot._id, lectureDate },
        { $set: { academicYearId: slot.academicYearId, programId: slot.programId, departmentId: slot.departmentId, semester: slot.semester, division: slot.division, subjectId: slot.subjectId, period: slot.period, teacherUserId: slot.teacherUserId, records, markedByUserId: slot.teacherUserId } },
        { upsert: true }
      );
    }
  }  // Use the intended teacher if they have a slot, otherwise whoever the timetable says teaches it.
  const teacherFor = async (subject, preferred) => {
    const base = { subjectId: subject._id, semester: 1, academicYearId: year._id, isActive: true };
    const slot = (await Timetable.findOne({ ...base, teacherUserId: preferred._id })) || (await Timetable.findOne(base));
    if (!slot) { log(`   ${subject.code}: no active timetable slot, skipped`); return null; }
    if (String(slot.teacherUserId) !== String(preferred._id)) log(`   ${subject.code}: slot belongs to another teacher (${slot.teacherUserId}), using them`);
    return slot.teacherUserId;
  };

  // internal marks: class 1 approved by the HOD, class 2 submitted, class 3 still draft
  for (const [p, code] of PROGS.entries()) {
    const { teacher, hod } = staff[deptCodeOf[code]];
    for (const [s, subject] of subjectsOf[code].slice(0, 2).entries()) {
      const teacherId = await teacherFor(subject, teacher);
      if (!teacherId) continue;
      for (const [i, { student }] of (students[code] || []).entries()) {
        try {
          await Marks.enter({ studentId: student._id, subjectId: subject._id, semester: 1, academicYearId: year._id, component: 'Internal Test 1', obtained: 10 + ((i * 7 + s * 3) % 21) / 2, outOf: 20, byUserId: teacherId });
        } catch (err) { ignore409(err); }
      }
      const key = { subjectId: subject._id, academicYearId: year._id, component: 'Internal Test 1' };
      if (p <= 1) {``
        const ids = await Marks.distinct('_id', { ...key, enteredByUserId: teacherId, status: { $in: ['draft', 'returned'] } });
        if (ids.length) await Marks.submitMany(ids, { byUserId: teacherId });
      }
      if (p === 0) {
        const ids = await Marks.distinct('_id', { ...key, status: 'submitted' });
        if (ids.length) await Marks.decideMany(ids, { approve: true, byUserId: hod._id, departmentId: hod.departmentId });      }
    }
  }
  // teaching plans
  for (const [p, code] of PROGS.entries()) {
    const { teacher, hod } = staff[deptCodeOf[code]];
    for (const [s, subject] of subjectsOf[code].slice(0, 2).entries()) {
      const target = PLAN_STATES[p][s];
      const teacherId = await teacherFor(subject, teacher);
      if (!teacherId) continue;
      const key = { teacherUserId: teacherId, subjectId: subject._id, semester: 1, academicYearId: year._id };      let plan = await TeachingPlan.findOne(key);
      if (!plan) plan = await TeachingPlan.start(key);
      if (plan.status === 'draft' && plan.topics.length === 0) {
        await plan.setTopics([1, 2, 3, 4, 5].map((n) => ({ weekNo: n, title: `${subject.name}: Unit ${n}`, plannedHours: 4 })));
        if (target !== 'draft') await plan.submit();
        plan = await TeachingPlan.findById(plan._id);
      }
      if (plan.status === 'submitted' && target === 'approved') plan = await TeachingPlan.decide(plan._id, { approve: true, byUserId: hod._id });
      if (plan.status === 'submitted' && target === 'returned') await TeachingPlan.decide(plan._id, { approve: false, byUserId: hod._id, note: 'Please add practical sessions and revision weeks.' });
      plan = await TeachingPlan.findById(plan._id);
      if (plan.status === 'approved') {
        await plan.updateProgress(plan.topics[0]._id, 'done', addDays(today, -14));
        await plan.updateProgress(plan.topics[1]._id, 'done', addDays(today, -7));
        await plan.updateProgress(plan.topics[2]._id, 'inProgress');
      }
    }
  }

  log('6. Refunds, website content, audit log ...');
  const admissionPaid = await Payment.find({ purpose: 'admission', status: 'paid' }).sort({ createdAt: 1 });
  const examPaid = await Payment.find({ purpose: 'exam', status: 'paid' }).sort({ createdAt: 1 });
  if (admissionPaid[0] && !(await Refund.exists({ paymentId: admissionPaid[0]._id }))) {
    await Refund.request({ paymentId: admissionPaid[0]._id, amountPaise: 50000, reason: 'Excess caution money collected', requestedByUserId: admissionAdmin._id });
  }
  if (admissionPaid[1] && !(await Refund.exists({ paymentId: admissionPaid[1]._id }))) {
    const r = await Refund.request({ paymentId: admissionPaid[1]._id, amountPaise: 200000, reason: 'Student withdrew admission', requestedByUserId: admissionAdmin._id });
    if (superAdmin) await Refund.decide(r._id, { approve: true, decidedByUserId: superAdmin._id, note: 'Approved as per the refund policy' });
  }
  if (examPaid[0] && !(await Refund.exists({ paymentId: examPaid[0]._id }))) {
    await Refund.request({ paymentId: examPaid[0]._id, amountPaise: 80000, reason: 'Exam fee paid twice', requestedByUserId: examAdmin._id });
  }
  const websiteAdded = await seedWebsite(ctx);

  if (!(await AuditLog.exists({ 'details.dummy': true }))) {
    const rows = [];
    const allStudents = PROGS.flatMap((c) => students[c] || []);
    allStudents.slice(0, 6).forEach(({ user }, i) => rows.push({ actorUserId: user._id, action: 'loginSuccess', entityType: 'user', entityId: user._id, outcome: 'success', ip: `10.0.0.${10 + i}`, details: { role: 'student', identifierType: 'email', dummy: true } }));
    for (const u of [admissionAdmin, examAdmin, websiteAdmin, staff.COM.teacher, staff.COM.hod]) rows.push({ actorUserId: u._id, action: 'loginSuccess', entityType: 'user', entityId: u._id, outcome: 'success', ip: '10.0.0.50', details: { role: u.role, identifierType: 'email', dummy: true } });
    rows.push({ action: 'loginFailed', entityType: 'user', outcome: 'failed', ip: '203.0.113.7', details: { reason: 'wrongPassword', identifierType: 'email', dummy: true } });
    rows.push({ actorUserId: staff.COM.teacher._id, action: 'permissionDenied', entityType: 'admissionRefunds', outcome: 'denied', ip: '10.0.0.51', details: { role: 'teacher', attempted: 'approve', method: 'POST', dummy: true } });
    for (const p of [...admissionPaid, ...examPaid]) {
      rows.push({ actorUserId: p.payerUserId, action: 'paymentOrderCreated', entityType: 'payment', entityId: p._id, outcome: 'success', ip: '10.0.0.20', details: { purpose: p.purpose, amountPaise: p.amountPaise, gatewayOrderId: p.gatewayOrderId, dummy: true } });
      rows.push({ actorUserId: null, action: 'paymentVerified', entityType: 'payment', entityId: p._id, outcome: 'success', details: { source: p.confirmedVia === 'webhook' ? 'webhook' : 'browser', amountPaise: p.amountPaise, receiptNumber: p.receiptNumber, dummy: true } });
    }
    for (const r of await Result.find({ isPublished: true })) rows.push({ actorUserId: examAdmin._id, action: 'resultPublished', entityType: 'result', entityId: r._id, outcome: 'success', ip: '10.0.0.30', details: { examId: String(r.examId), studentId: String(r.studentId), dummy: true } });
    for (const r of rows) await AuditLog.record(r);
  }

  // ---- summary ----
  const count = async (M, f = {}) => M.countDocuments(f);
  log('\nDone. Totals in the database now:');
  log(`  users ${await count(User)} | students ${await count(Student)} | applications ${await count(Application)} | documents ${await count(AdmissionDocument)}`);
  log(`  payments ${await count(Payment)} (paid ${await count(Payment, { status: 'paid' })}) | refunds ${await count(Refund)} | exam forms ${await count(ExamForm)} | results ${await count(Result)} (published ${await count(Result, { isPublished: true })})`);
  log(`  timetable slots ${await count(Timetable)} | attendance registers ${await count(Attendance)} | internal marks ${await count(Marks)} | teaching plans ${await count(TeachingPlan)}`);
  log(`  website items ${await count(WebsiteContent)} (${websiteAdded} added now) | audit rows ${await count(AuditLog)}`);
  log(`\nStudent / applicant logins look like dummy.aman.shaikh@demo.example (email, or the 10-digit mobile 9810000000, or Aadhaar 234510000000).`);
  log(`Staff logins: teacher.com / teacher.csc / teacher.art / hod.com / hod.csc / hod.art / admission.admin / exam.admin / website.admin @demo.example`);
  log(`Password for the new dummy users (applicants, students, extra staff): ${password}`);
  if (base.password && base.password.generated) log('  (generated for this run; the older demo users got the same one on this run, save it)');
  if (!superAdmin) log('Note: no Super Admin exists, so the sample refund stays "requested". Run "npm run create-super-admin", then run this script again to approve it.');
  log('Note: uploaded-document and gallery records point to files that do not exist (dummy keys).');
}

main()
  .catch((err) => { console.error('Dummy seed failed:', err.message); if (err.errors) console.error(JSON.stringify(err.errors)); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());
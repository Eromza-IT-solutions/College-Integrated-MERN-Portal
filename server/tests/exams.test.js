import mongoose from 'mongoose';
import Exam from '../src/models/Exam.js';
import ExamForm from '../src/models/ExamForm.js';
import Student from '../src/models/Student.js';
import Application from '../src/models/Application.js';
import Enrollment from '../src/models/Enrollment.js';
import Subject from '../src/models/Subject.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Payment from '../src/models/Payment.js';

const id = () => new mongoose.Types.ObjectId();
const hours = (h) => new Date(Date.now() + h * 3600 * 1000);
const q = (value) => ({ session: async () => value });

describe('Exam model', () => {
  const exam = (over = {}) => new Exam({
    name: 'End Semester Nov 2026', academicYearId: id(), programId: id(), semester: 1,
    formOpensAt: hours(-24), formClosesAt: hours(24), status: 'open', ...over,
  });
  test('valid exam; draft by default', async () => {
    const e = exam({ status: undefined });
    await expect(e.validate()).resolves.toBeUndefined();
    expect(e.status).toBe('draft');
  });
  test('closing date must be after the opening date', async () => {
    await expect(exam({ formClosesAt: hours(-48) }).validate()).rejects.toThrow(/close after/);
  });
  test('bad semester is rejected', async () => {
    await expect(exam({ semester: 0 }).validate()).rejects.toThrow();
    await expect(exam({ semester: 2.5 }).validate()).rejects.toThrow();
  });
  test('isOpen needs status open AND today inside the dates', () => {
    expect(exam().isOpen()).toBe(true);
    expect(exam({ status: 'draft' }).isOpen()).toBe(false);
    expect(exam({ status: 'closed' }).isOpen()).toBe(false);
    expect(exam({ formOpensAt: hours(1), formClosesAt: hours(5) }).isOpen()).toBe(false);
    expect(exam({ formOpensAt: hours(-5), formClosesAt: hours(-1) }).isOpen()).toBe(false);
  });
});

// ---- the exam form flow, with an in-memory stand-in for the database ----
const programId = id();
const yearId = id();
let exam; let student; let application; let subjects; let enrolledRows; let fee; let payments; let forms;

function wire() {
  exam = new Exam({ name: 'End Sem', academicYearId: yearId, programId, semester: 1, formOpensAt: hours(-24), formClosesAt: hours(24), status: 'open' });
  student = new Student({ userId: id(), applicationId: id(), programId, admissionYearId: yearId, enrollmentNumber: 'ENR-2026-27-000001', currentSemester: 1 });
  application = new Application({
    applicantUserId: student.userId, academicYearId: yearId, programId, feesCategory: 'PAYING',
    student: { fullName: 'Shaikh Aman R', mobile: '9876543210', email: 'aman@demo.example' },
  });
  subjects = [
    { _id: id(), code: 'FA-101', name: 'Financial Accounting', category: 'major' },
    { _id: id(), code: 'BE-102', name: 'Business Economics', category: 'major' },
    { _id: id(), code: 'EN-AEC', name: 'English Communication', category: 'aec' },
  ];
  enrolledRows = subjects.map((s) => ({ studentId: student._id, subjectId: s._id, semester: 1 }));
  fee = { _id: id(), amountPaise: 80000 };
  payments = {};
  forms = [];
  Exam.findById = () => q(exam);
  Student.findById = () => q(student);
  Application.findById = () => q(application);
  Enrollment.find = () => q(enrolledRows);
  Subject.find = () => q(subjects);
  FeeStructure.findOne = () => q(fee);
  Payment.findById = () => q(payments.current || null);
  ExamForm.findOne = () => q(forms[0] || null);
  ExamForm.create = async ([doc]) => { const f = new ExamForm(doc); f.save = async () => f; forms.push(f); return [f]; };
  ExamForm.findById = () => q(forms[0]);
  ExamForm.findOneAndUpdate = async (filter, update) => {
    const f = forms[0];
    if (!f || (filter.status && f.status !== filter.status)) return null;
    Object.assign(f, update.$set);
    return f;
  };
}
beforeEach(wire);

async function startForm() {
  const f = await ExamForm.start({ examId: exam._id, studentId: student._id });
  f.save = async () => f;
  return f;
}

describe('ExamForm.start', () => {
  test('fills the details from the admission record', async () => {
    const f = await startForm();
    expect(f.status).toBe('draft');
    expect(f.details).toMatchObject({ enrollmentNumber: 'ENR-2026-27-000001', fullName: 'Shaikh Aman R', mobile: '9876543210', semester: 1, feesCategory: 'PAYING' });
    expect(f.subjects).toHaveLength(0);
  });
  test('starting again returns the same form', async () => {
    const a = await startForm();
    const b = await ExamForm.start({ examId: exam._id, studentId: student._id });
    expect(b).toBe(a);
    expect(forms).toHaveLength(1);
  });
  test('refused when the exam is closed, the student is not active, or the exam is for another class or semester', async () => {
    exam.status = 'closed';
    await expect(ExamForm.start({ examId: exam._id, studentId: student._id })).rejects.toMatchObject({ statusCode: 409 });
    exam.status = 'open';
    student.status = 'withdrawn';
    await expect(ExamForm.start({ examId: exam._id, studentId: student._id })).rejects.toMatchObject({ statusCode: 409 });
    student.status = 'active';
    student.currentSemester = 2;
    await expect(ExamForm.start({ examId: exam._id, studentId: student._id })).rejects.toMatchObject({ statusCode: 409 });
    student.currentSemester = 1;
    student.programId = id();
    await expect(ExamForm.start({ examId: exam._id, studentId: student._id })).rejects.toMatchObject({ statusCode: 409 });
  });
  test('missing exam or student is 404', async () => {
    Exam.findById = () => q(null);
    await expect(ExamForm.start({ examId: id(), studentId: student._id })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ticking subjects', () => {
  test('only enrolled subjects can be ticked, at least one', async () => {
    const f = await startForm();
    await f.selectSubjects([subjects[0]._id, subjects[2]._id]);
    expect(f.subjects.map((x) => x.code)).toEqual(['FA-101', 'EN-AEC']);
    await expect(f.selectSubjects([])).rejects.toMatchObject({ statusCode: 400 });
    await expect(f.selectSubjects([id()])).rejects.toMatchObject({ statusCode: 400 });
  });
  test('ticking the same subject twice counts once; a new choice replaces the old', async () => {
    const f = await startForm();
    await f.selectSubjects([subjects[0]._id, subjects[0]._id]);
    expect(f.subjects).toHaveLength(1);
    await f.selectSubjects([subjects[1]._id]);
    expect(f.subjects.map((x) => x.code)).toEqual(['BE-102']);
  });
  test('a submitted form cannot be changed', async () => {
    const f = await startForm();
    f.status = 'submitted';
    await expect(f.selectSubjects([subjects[0]._id])).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('continue to payment', () => {
  test('fixes the flat fee and waits for payment', async () => {
    const f = await startForm();
    await f.selectSubjects([subjects[0]._id]);
    await f.continueToPayment();
    expect(f).toMatchObject({ status: 'pendingPayment', feeAmountPaise: 80000 });
    expect(f.feeStructureId).toEqual(fee._id);
  });
  test('needs a subject, an open exam and a fee', async () => {
    const f = await startForm();
    await expect(f.continueToPayment()).rejects.toMatchObject({ statusCode: 400 });
    await f.selectSubjects([subjects[0]._id]);
    FeeStructure.findOne = () => q(null);
    await expect(f.continueToPayment()).rejects.toMatchObject({ statusCode: 409 });
    FeeStructure.findOne = () => q(fee);
    exam.status = 'closed';
    await expect(f.continueToPayment()).rejects.toMatchObject({ statusCode: 409 });
  });
  test('a zero fee submits the form without a payment', async () => {
    fee.amountPaise = 0;
    const f = await startForm();
    await f.selectSubjects([subjects[0]._id]);
    await f.continueToPayment();
    expect(f.status).toBe('submitted');
    expect(f.submittedAt).toBeInstanceOf(Date);
  });
});

describe('payment and approval', () => {
  async function pending() {
    const f = await startForm();
    await f.selectSubjects([subjects[0]._id]);
    await f.continueToPayment();
    payments.current = { _id: id(), status: 'paid', purpose: 'exam', examFormId: f._id, amountPaise: 80000 };
    return f;
  }
  test('a matching paid payment submits the form; calling again changes nothing', async () => {
    const f = await pending();
    const done = await f.markPaid(payments.current._id);
    expect(done.status).toBe('submitted');
    expect(String(done.paymentId)).toBe(String(payments.current._id));
    const again = await done.markPaid(payments.current._id);
    expect(again.status).toBe('submitted');
  });
  test.each([
    ['unpaid', { status: 'created' }],
    ['admission payment', { purpose: 'admission' }],
    ['other form', { examFormId: id() }],
    ['wrong amount', { amountPaise: 1 }],
  ])('refuses a payment that is %s', async (_n, patch) => {
    const f = await pending();
    Object.assign(payments.current, patch);
    await expect(f.markPaid(payments.current._id)).rejects.toMatchObject({ statusCode: 409 });
    expect(f.status).toBe('pendingPayment');
  });
  test('a draft form is not waiting for payment', async () => {
    const f = await startForm();
    await expect(f.markPaid(id())).rejects.toMatchObject({ statusCode: 409 });
  });
  test('Examination Admin approves or rejects only submitted forms; rejecting needs a reason', async () => {
    const f = await pending();
    const admin = id();
    await expect(ExamForm.decide(f._id, { approve: true, decidedByUserId: admin })).rejects.toMatchObject({ statusCode: 409 }); // not submitted yet
    await f.markPaid(payments.current._id);
    await expect(ExamForm.decide(f._id, { approve: false, decidedByUserId: admin })).rejects.toMatchObject({ statusCode: 400 });
    const done = await ExamForm.decide(f._id, { approve: true, decidedByUserId: admin });
    expect(done).toMatchObject({ status: 'approved', decidedByUserId: admin });
    await expect(ExamForm.decide(f._id, { approve: false, decidedByUserId: admin, note: 'x' })).rejects.toMatchObject({ statusCode: 409 });
  });
});

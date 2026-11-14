import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import {
  EXAM_FORM_STATUS, EXAM_FORM_STATUS_VALUES, STUDENT_STATUS, ENROLLMENT_STATUS, PAYMENT_STATUS, PAYMENT_PURPOSE, SUBJECT_CATEGORIES,
} from '../utils/constants.js';

const { Schema } = mongoose;

// A student's exam form. The details are filled in automatically from the admission record; the student only ticks
// the subjects they are appearing for, and then pays the fee.
//   draft -> (tick subjects, press Continue) -> pendingPayment -> (payment succeeds) -> submitted -> approved or rejected
const examFormSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    // Copied when the form is started, so a later change to the student record does not change a filed form.
    details: {
      enrollmentNumber: String, fullName: String, mobile: String, email: String,
      semester: Number, feesCategory: String,
    },
    subjects: [
      new Schema(
        { subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true }, code: String, name: String, category: { type: String, enum: SUBJECT_CATEGORIES } },
        { _id: false }
      ),
    ],
    status: { type: String, enum: EXAM_FORM_STATUS_VALUES, default: EXAM_FORM_STATUS.DRAFT, index: true },
    // The fee, fixed when the student presses Continue (one flat fee per form).
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure' },
    feeAmountPaise: { type: Number, min: 0, validate: { validator: Number.isInteger, message: 'Fee must be a whole number of paise' } },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    submittedAt: Date,
    decidedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: Date,
    decisionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// One form per student per exam.
examFormSchema.index({ examId: 1, studentId: 1 }, { unique: true });

const EDITABLE = [EXAM_FORM_STATUS.DRAFT, EXAM_FORM_STATUS.PENDING_PAYMENT];

/**
 * Start (or continue) the student's form for an exam. Checks the exam is open and the student belongs to it.
 * If the student already has a form for this exam, that form is returned.
 */
examFormSchema.statics.start = async function start({ examId, studentId }, { session } = {}) {
  const db = this.db;
  const s = session || null;
  const exam = await db.model('Exam').findById(examId).session(s);
  if (!exam) throw new AppError('Exam not found', 404);
  if (!exam.isOpen()) throw new AppError('The exam form is not open', 409);
  const student = await db.model('Student').findById(studentId).session(s);
  if (!student) throw new AppError('Student not found', 404);
  if (student.status !== STUDENT_STATUS.ACTIVE) throw new AppError('Only an active student can fill the exam form', 409);
  if (String(student.programId) !== String(exam.programId) || student.currentSemester !== exam.semester) {
    throw new AppError('This exam is not for your class and semester', 409);
  }
  const existing = await this.findOne({ examId, studentId }).session(s);
  if (existing) return existing;

  const application = await db.model('Application').findById(student.applicationId).session(s);
  if (!application) throw new AppError('Admission record not found', 404);
  const a = application.student || {};
  const [form] = await this.create(
    [{
      examId, studentId,
      details: {
        enrollmentNumber: student.enrollmentNumber, fullName: a.fullName, mobile: a.mobile, email: a.email,
        semester: exam.semester, feesCategory: application.feesCategory,
      },
    }],
    { session }
  );
  return form;
};

/** The subjects the student may tick: the ones they are enrolled in for the exam's semester. */
examFormSchema.methods.offeredSubjects = async function offeredSubjects({ session } = {}) {
  const s = session || null;
  const exam = await this.constructor.db.model('Exam').findById(this.examId).session(s);
  const rows = await this.constructor.db.model('Enrollment')
    .find({ studentId: this.studentId, semester: exam.semester, status: ENROLLMENT_STATUS.ENROLLED }).session(s);
  return this.constructor.db.model('Subject').find({ _id: { $in: rows.map((r) => r.subjectId) } }).session(s);
};

/** Tick the subjects the student is appearing for (replaces any earlier choice). */
examFormSchema.methods.selectSubjects = async function selectSubjects(subjectIds, { session } = {}) {
  if (!EDITABLE.includes(this.status)) throw new AppError(`A ${this.status} exam form cannot be changed`, 409);
  const wanted = [...new Set((subjectIds || []).map(String))];
  if (!wanted.length) throw new AppError('Tick at least one subject', 400);
  const offered = await this.offeredSubjects({ session });
  const byId = new Map(offered.map((x) => [String(x._id), x]));
  const notAllowed = wanted.filter((w) => !byId.has(w));
  if (notAllowed.length) throw new AppError('Some subjects are not part of your enrolled subjects', 400, notAllowed.map((w) => ({ field: 'subjects', message: `${w} is not offered` })));
  this.subjects = wanted.map((w) => ({ subjectId: byId.get(w)._id, code: byId.get(w).code, name: byId.get(w).name, category: byId.get(w).category }));
  return this.save({ session });
};

/**
 * Press Continue: fix the fee and move to payment. With a fee of zero (for example a free category) the form is
 * submitted straight away. The Backend then creates a Payment (purpose "exam", examFormId = this form, amount = feeAmountPaise).
 */
examFormSchema.methods.continueToPayment = async function continueToPayment({ session } = {}) {
  if (!EDITABLE.includes(this.status)) throw new AppError(`A ${this.status} exam form cannot be changed`, 409);
  const db = this.constructor.db;
  const s = session || null;
  const exam = await db.model('Exam').findById(this.examId).session(s);
  if (!exam.isOpen()) throw new AppError('The exam form is not open', 409);
  if (!this.subjects.length) throw new AppError('Tick at least one subject first', 400);
  const fee = await db.model('FeeStructure').findOne({
    purpose: PAYMENT_PURPOSE.EXAM, academicYearId: exam.academicYearId, programId: exam.programId,
    feesCategory: this.details.feesCategory, isActive: true,
  }).session(s);
  if (!fee) throw new AppError('No exam fee is set for your class and fees category', 409);
  this.feeStructureId = fee._id;
  this.feeAmountPaise = fee.amountPaise;
  if (fee.amountPaise === 0) {
    this.status = EXAM_FORM_STATUS.SUBMITTED;
    this.submittedAt = new Date();
  } else {
    this.status = EXAM_FORM_STATUS.PENDING_PAYMENT;
  }
  return this.save({ session });
};

/** The fee was paid: check the payment really is this form's exam fee, then submit the form. Safe to call twice. */
examFormSchema.methods.markPaid = async function markPaid(paymentId, { session } = {}) {
  if (this.paymentId && String(this.paymentId) === String(paymentId) && this.status !== EXAM_FORM_STATUS.PENDING_PAYMENT) return this;
  if (this.status !== EXAM_FORM_STATUS.PENDING_PAYMENT) throw new AppError(`A ${this.status} exam form is not waiting for payment`, 409);
  const payment = await this.constructor.db.model('Payment').findById(paymentId).session(session || null);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== PAYMENT_STATUS.PAID) throw new AppError('The payment is not completed', 409);
  if (payment.purpose !== PAYMENT_PURPOSE.EXAM || String(payment.examFormId) !== String(this._id) || payment.amountPaise !== this.feeAmountPaise) {
    throw new AppError('This payment does not belong to this exam form', 409);
  }
  const updated = await this.constructor.findOneAndUpdate(
    { _id: this._id, status: EXAM_FORM_STATUS.PENDING_PAYMENT },
    { $set: { status: EXAM_FORM_STATUS.SUBMITTED, paymentId, submittedAt: new Date() } },
    { new: true, session }
  );
  return updated || this.constructor.findById(this._id).session(session || null);
};

/** Examination Admin approves or rejects a submitted form. A rejection needs a reason. */
examFormSchema.statics.decide = async function decide(id, { approve, decidedByUserId, note }, { session } = {}) {
  if (!approve && !note) throw new AppError('Say why the exam form was rejected', 400);
  const decided = await this.findOneAndUpdate(
    { _id: id, status: EXAM_FORM_STATUS.SUBMITTED },
    { $set: { status: approve ? EXAM_FORM_STATUS.APPROVED : EXAM_FORM_STATUS.REJECTED, decidedByUserId, decidedAt: new Date(), decisionNote: note } },
    { new: true, session }
  );
  if (decided) return decided;
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Exam form not found', 404);
  throw new AppError(`A ${current.status} exam form cannot be decided`, 409);
};

export default mongoose.model('ExamForm', examFormSchema);

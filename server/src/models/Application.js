import mongoose from 'mongoose';
import * as C from '../utils/constants.js';
import AppError from '../utils/AppError.js';
import { decryptDateField, decryptField, encryptDateField, encryptField } from '../utils/fieldCrypto.js';
import { hashMobile } from '../utils/blindIndex.js';
import { firstSemesterOf } from '../utils/academic.js';

const { Schema } = mongoose;
const oid = (ref, extra = {}) => ({ type: Schema.Types.ObjectId, ref, ...extra });
const text = { type: String, trim: true };
const pick = (values) => ({ type: String, enum: { values, message: '{PATH} has an unknown value' } });
// Draft-friendly: an empty value is fine, a filled one must match.
const digits = (n, label) => ({ type: String, trim: true, match: [new RegExp(`^(\\d{${n}})?$`), `${label} must be ${n} digits`] });
const encryptedDigits = (n, label) => ({
  type: String,
  get: decryptField,
  set(value) {
    if (value === undefined || value === null || value === '') return value;
    const text = String(value);
    if (!new RegExp(`^\\d{${n}}$`).test(text)) throw new AppError(`${label} must be ${n} digits`, 400);
    return encryptField(text);
  },
});
const encryptedDate = { type: String, get: decryptDateField, set: encryptDateField };

const addressSchema = new Schema(
  {
    line1: text, line2: text, country: text, pincode: digits(6, 'Pincode'),
    state: text, district: text, taluka: text, location: text,
  },
  { _id: false }
);

const NEP_GROUPS = ['major', 'minor', 'openElective', 'vsc', 'sec', 'aec', 'iks', 'vec', 'ccProject'];
// The subjects chosen on the form are picks from the Subject list (not typed text), so every name matches. See chooseSubjects().
const nepShape = Object.fromEntries(NEP_GROUPS.map((g) => [g, { type: [{ type: Schema.Types.ObjectId, ref: 'Subject' }], default: [] }]));

const applicationSchema = new Schema(
  {
    // ---- Step 1: admission form information ----
    applicantUserId: oid('User', { required: true, index: true }),
    academicYearId: oid('AcademicYear', { required: true }),
    programId: oid('Program', { required: true }),
    // Year of study applied for: 1 = F.Y. / first year (the usual case). A later year is for a direct second or third year admission.
    yearOfStudy: { type: Number, default: 1, min: 1, max: 10, validate: { validator: Number.isInteger, message: 'Year of study must be a whole number' } },
    admissionType: pick(C.ADMISSION_TYPES),
    divisionType: pick(C.DIVISION_TYPES),
    feesCategory: pick(C.FEES_CATEGORIES),
    abcId: text, // Academic Bank of Credits / APAAR ID
    // Personal data: encrypted at rest and not returned unless a query asks for it with .select('+aadhaarNumber').
    aadhaarNumber: { ...encryptedDigits(12, 'Aadhaar number'), select: false },

    // ---- Step 2: student ----
    student: {
      surname: text, firstName: text, middleName: text, noMiddleName: { type: Boolean, default: false },
      nameCombination: pick(C.NAME_COMBINATIONS),
      fullName: text, // as per the last mark sheet
      gender: pick(C.GENDERS),
      address: { type: addressSchema, default: () => ({}) }, // local address
      mobile: encryptedDigits(10, 'Mobile number'),
      mobileHash: { type: String, select: false }, // keyed blind index for exact-mobile lookup only
      email: { type: String, trim: true, lowercase: true, match: [/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, 'Email is not valid'] },
      birthDate: encryptedDate, birthPlace: text, birthPlaceCountry: text, nationality: text, motherTongue: text,
      maritalStatus: pick(C.MARITAL_STATUSES), bloodGroup: pick(C.BLOOD_GROUPS), handicap: pick(C.HANDICAPS),
      religion: pick(C.RELIGIONS), caste: text, subCaste: text, casteCategory: pick(C.CASTE_CATEGORIES),
      casteValidityNo: text, isMinority: pick(C.MINORITY_TYPES), minorityDetail: pick(C.MINORITY_DETAILS),
    },

    // ---- Step 3: parent ----
    parent: {
      fatherFullName: text, motherFirstName: text,
      sameAddressAsStudent: { type: Boolean, default: false },
      address: { type: addressSchema, default: () => ({}) }, // permanent address
      fatherMobile: encryptedDigits(10, 'Father mobile number'), motherMobile: encryptedDigits(10, 'Mother mobile number'),
      email: { type: String, trim: true, lowercase: true, match: [/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, 'Email is not valid'] },
      isAlumni: Boolean,
    },

    // ---- Step 4: last exam, TC/LC, migration ----
    lastExam: {
      lastClass: text, instituteName: text, boardName: text,
      eligibility: pick(C.ELIGIBILITIES), stateOfResidence: pick(C.STATES_OF_RESIDENCE),
      qualifiedExam: text, passingMonth: pick(C.EXAM_MONTHS), passingYear: digits(4, 'Passing year'),
      obtainedMarks: { type: Number, min: 0 }, outOfMarks: { type: Number, min: 1 },
      percentage: { type: Number, min: 0, max: 100 },
      result: pick(C.EXAM_RESULTS), attempt: pick(C.EXAM_ATTEMPTS), seatNo: text,
      tcLcNo: text, tcLcIssueDate: Date, migrationCertNo: text, migrationIssueDate: Date,
      hasGap: Boolean,
    },

    // ---- Step 5: passport (only for students it applies to) ----
    passport: {
      notApplicable: { type: Boolean, default: true },
      passportType: pick(C.PASSPORT_TYPES), country: text, countryCode: text, number: text, placeOfIssue: text,
      issueDate: Date, expiryDate: Date,
      visaNo: text, visaNature: pick(C.VISA_NATURES), visaIssuedAt: text, visaEntries: pick(C.VISA_ENTRIES),
      visaIssueDate: Date, visaExpiryDate: Date,
      universityLetterNo: text, universityLetterDate: Date, universityIdNo: text,
      residencePermitNo: text, residencePermitFrom: Date, residencePermitTill: Date, fsisId: text,
    },

    // ---- Step 6: subjects ----
    subjects: {
      mainGroup: text, majorGroup: text, minorGroup: text,
      nep: { type: new Schema(nepShape, { _id: false }), default: () => ({}) },
    },

    // ---- Workflow ----
    status: { type: String, enum: C.APPLICATION_STATUS_VALUES, default: C.APPLICATION_STATUS.DRAFT, index: true },
    // Assigned the first time the application is submitted.
    applicationNumber: { type: String, trim: true },
    submittedAt: Date,
    reviewedByUserId: oid('User', { default: null }),
    reviewedAt: Date,
    reviewNote: text, // reason when returned or rejected

    // The three approvals of the college admission process: subjects, documents, then the form.
    subjectsApprovedAt: Date,
    subjectsApprovedByUserId: oid('User', { default: null }),
    documentsApprovedAt: Date,
    documentsApprovedByUserId: oid('User', { default: null }),
    approvedAt: Date, // the form approval: the fee is now due
    waitlistedAt: Date,
    // The admission fee, fixed when the form is approved.
    feeStructureId: oid('FeeStructure', { default: null }),
    feeAmountPaise: { type: Number, min: 0 },
    feeDueAt: Date,
    feePaidAt: Date,
    paymentId: oid('Payment', { default: null }),
    // After payment the hard copy of the form and documents is due. The admission is complete when it arrives.
    hardCopyDueAt: Date,
    hardCopyReceivedAt: Date,
    hardCopyReceivedByUserId: oid('User', { default: null }),
    admittedAt: Date,
    cancelledAt: Date,
    cancelReason: text,
  },
  { timestamps: true, toObject: { getters: true }, toJSON: { getters: true } }
);

applicationSchema.index({ status: 1, feeDueAt: 1 });
applicationSchema.index({ status: 1, hardCopyDueAt: 1 });
applicationSchema.index({ status: 1, createdAt: -1 }, { name: 'application_status_created' });
applicationSchema.index({ applicantUserId: 1, createdAt: -1 }, { name: 'application_owner_created' });
applicationSchema.index({ applicationNumber: 1 }, { unique: true, partialFilterExpression: { applicationNumber: { $type: 'string' } } });
// One application per applicant, year and class.
applicationSchema.index({ applicantUserId: 1, academicYearId: 1, programId: 1 }, { unique: true });
applicationSchema.index({ 'student.mobileHash': 1 }, { name: 'application_mobile_blind_index' });

applicationSchema.pre('save', function syncMobileBlindIndex() {
  if (!this.student) return;
  this.student.mobileHash = this.student.mobile ? hashMobile(this.student.mobile) : undefined;
});

// Cross-field rules that hold even in a draft.
applicationSchema.pre('validate', function crossChecks() {
  const e = this.lastExam;
  if (e && e.obtainedMarks != null && e.outOfMarks != null && e.obtainedMarks > e.outOfMarks) {
    this.invalidate('lastExam.obtainedMarks', 'Obtained marks cannot be more than out-of marks');
  }
  const p = this.passport;
  if (p && p.issueDate && p.expiryDate && p.expiryDate <= p.issueDate) {
    this.invalidate('passport.expiryDate', 'Passport expiry must be after the issue date');
  }
  if (this.divisionType === 'Grantable' && this.student && this.student.gender && this.student.gender !== 'Female') {
    this.invalidate('divisionType', 'The Grantable division is for girls only');
  }
  if (this.parent && this.parent.sameAddressAsStudent && this.student && this.student.address) {
    this.parent.address = { ...this.student.address.toObject() };
  }
});

const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/** Names of required fields that are still empty. Used when the applicant presses Submit. */
applicationSchema.methods.missingForSubmit = function missingForSubmit(extra = {}) {
  const s = this.student || {};
  const p = this.parent || {};
  const e = this.lastExam || {};
  const pp = this.passport || {};
  const aadhaar = extra.aadhaarNumber !== undefined ? extra.aadhaarNumber : this.aadhaarNumber;
  const checks = {
    admissionType: this.admissionType, divisionType: this.divisionType, feesCategory: this.feesCategory,
    aadhaarNumber: aadhaar,
    'student.surname': s.surname, 'student.firstName': s.firstName,
    'student.middleName': s.noMiddleName ? 'n/a' : s.middleName,
    'student.nameCombination': s.nameCombination, 'student.fullName': s.fullName, 'student.gender': s.gender,
    'student.address.line1': s.address && s.address.line1, 'student.address.line2': s.address && s.address.line2,
    'student.address.country': s.address && s.address.country, 'student.address.pincode': s.address && s.address.pincode,
    'student.address.state': s.address && s.address.state, 'student.address.district': s.address && s.address.district,
    'student.address.taluka': s.address && s.address.taluka, 'student.address.location': s.address && s.address.location,
    'student.mobile': s.mobile, 'student.email': s.email, 'student.birthDate': s.birthDate,
    'student.birthPlace': s.birthPlace, 'student.birthPlaceCountry': s.birthPlaceCountry,
    'student.nationality': s.nationality, 'student.motherTongue': s.motherTongue,
    'student.maritalStatus': s.maritalStatus, 'student.bloodGroup': s.bloodGroup,
    'student.religion': s.religion, 'student.caste': s.caste, 'student.casteCategory': s.casteCategory,
    'parent.fatherFullName': p.fatherFullName, 'parent.motherFirstName': p.motherFirstName,
    'parent.address.line1': p.address && p.address.line1, 'parent.address.country': p.address && p.address.country,
    'parent.address.pincode': p.address && p.address.pincode, 'parent.address.state': p.address && p.address.state,
    'parent.address.district': p.address && p.address.district, 'parent.address.taluka': p.address && p.address.taluka,
    'parent.address.location': p.address && p.address.location, 'parent.fatherMobile': p.fatherMobile,
    'lastExam.lastClass': e.lastClass, 'lastExam.instituteName': e.instituteName, 'lastExam.boardName': e.boardName,
    'lastExam.eligibility': e.eligibility, 'lastExam.stateOfResidence': e.stateOfResidence,
    'lastExam.qualifiedExam': e.qualifiedExam, 'lastExam.passingMonth': e.passingMonth,
    'lastExam.passingYear': e.passingYear, 'lastExam.obtainedMarks': e.obtainedMarks,
    'lastExam.outOfMarks': e.outOfMarks, 'lastExam.percentage': e.percentage, 'lastExam.result': e.result,
    'lastExam.attempt': e.attempt, 'lastExam.seatNo': e.seatNo,
    'subjects.mainGroup': this.subjects && this.subjects.mainGroup,
    'subjects.majorGroup': this.subjects && this.subjects.majorGroup,
    'subjects.minorGroup': this.subjects && this.subjects.minorGroup,
  };
  if (p.isAlumni === undefined || p.isAlumni === null) checks['parent.isAlumni'] = null;
  if (e.hasGap === undefined || e.hasGap === null) checks['lastExam.hasGap'] = null;
  if (!pp.notApplicable) {
    Object.assign(checks, {
      'passport.passportType': pp.passportType, 'passport.country': pp.country, 'passport.countryCode': pp.countryCode,
      'passport.number': pp.number, 'passport.placeOfIssue': pp.placeOfIssue, 'passport.issueDate': pp.issueDate,
      'passport.expiryDate': pp.expiryDate,
    });
  }
  return Object.keys(checks).filter((k) => !has(checks[k]));
};

applicationSchema.methods.isEditable = function isEditable() {
  return C.EDITABLE_APPLICATION_STATUSES.includes(this.status);
};

/** Throws if the application is not a draft or returned for correction. Call before any applicant edit. */
applicationSchema.methods.assertEditable = function assertEditable() {
  if (!this.isEditable()) {
    const err = new Error(`An application that is ${this.status} cannot be edited`);
    err.statusCode = 409;
    throw err;
  }
};

/**
 * Send the application in. Checks the required fields, gives it a number the first time
 * and sets the status to submitted. Pass { session } when inside a transaction.
 */
applicationSchema.methods.submit = async function submit({ session } = {}) {
  this.assertEditable();
  const missing = this.missingForSubmit();
  if (missing.length) {
    const err = new Error('Some required details are missing');
    err.statusCode = 400;
    err.errors = missing.map((field) => ({ field, message: 'Required' }));
    throw err;
  }
  if (!this.applicationNumber) {
    const Counter = this.constructor.db.model('Counter');
    const year = await this.constructor.db.model('AcademicYear').findById(this.academicYearId).session(session || null);
    if (!year) throw new Error('Academic year not found');
    const seq = await Counter.next(`application:${year.label}`, { session });
    this.applicationNumber = Counter.format({ prefix: 'APP', yearLabel: year.label, seq });
  }
  this.status = C.APPLICATION_STATUS.SUBMITTED;
  this.submittedAt = new Date();
  this.reviewNote = undefined;
  return this.save({ session });
};

// ---------------------------------------------------------------------------------------------
// Subjects: picked from the Subject list
// ---------------------------------------------------------------------------------------------

/**
 * The subjects an applicant may pick for a program and year of study, grouped by category: { major: [Subject], minor: [...], ... }.
 * They are the active subjects of the first semester of that year. Use this to fill the form's subject lists.
 */
applicationSchema.statics.offeredSubjects = async function offeredSubjects(programId, yearOfStudy = 1) {
  const list = await this.db.model('Subject').find({ programId, semester: firstSemesterOf(yearOfStudy), isActive: true }).sort({ code: 1 });
  const grouped = {};
  for (const sub of list) (grouped[sub.category] = grouped[sub.category] || []).push(sub);
  return grouped;
};

/**
 * Save the subjects the applicant picked: { major: [subjectId], aec: [subjectId], ... }.
 * Each pick must be an active subject of this program and first semester of the year, listed under its own category.
 * Replaces all earlier picks. Only while the application can be edited.
 */
applicationSchema.methods.chooseSubjects = async function chooseSubjects(picks, { session } = {}) {
  this.assertEditable();
  const groups = Object.keys(picks || {});
  const unknownGroup = groups.find((g) => !C.SUBJECT_CATEGORIES.includes(g));
  if (unknownGroup) throw new AppError(`Unknown subject group "${unknownGroup}"`, 400);
  const ids = groups.flatMap((g) => (picks[g] || []).map(String));
  if (new Set(ids).size !== ids.length) throw new AppError('A subject was picked twice', 400);
  const found = ids.length ? await this.constructor.db.model('Subject').find({ _id: { $in: ids } }).session(session || null) : [];
  const byId = new Map(found.map((x) => [String(x._id), x]));
  const semester = firstSemesterOf(this.yearOfStudy || 1);
  const errors = [];
  for (const g of groups) {
    for (const id of picks[g] || []) {
      const sub = byId.get(String(id));
      if (!sub) errors.push({ field: `subjects.nep.${g}`, message: `Subject ${id} was not found` });
      else if (!sub.isActive || String(sub.programId) !== String(this.programId) || sub.semester !== semester) errors.push({ field: `subjects.nep.${g}`, message: `${sub.code} is not offered for this class` });
      else if (sub.category !== g) errors.push({ field: `subjects.nep.${g}`, message: `${sub.code} belongs to ${sub.category}, not ${g}` });
    }
  }
  if (errors.length) throw new AppError('Some subjects cannot be chosen', 400, errors);
  const next = {};
  for (const g of C.SUBJECT_CATEGORIES) next[g] = (picks[g] || []).map(String);
  this.set('subjects.nep', next);
  return this.save({ session });
};

// ---------------------------------------------------------------------------------------------
// Admission workflow (college "Admission Procedure")
//   submitted -> subjects approved + documents approved -> form approved (fee due) -> fee paid (hard copy due) -> admitted
//   submitted -> waitlisted (not approved in time) -> approved later
//   submitted/waitlisted -> returned for correction or rejected; approved/feePaid -> cancelled
// Every step is one atomic update that checks the current status, so two admins cannot both move the same application.
// ---------------------------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const S = C.APPLICATION_STATUS;

async function move(doc, from, patch, { session, extra = {}, unset = {} } = {}) {
  const update = { $set: patch };
  if (Object.keys(unset).length) update.$unset = unset;
  const updated = await doc.constructor.findOneAndUpdate({ _id: doc._id, status: { $in: from }, ...extra }, update, { new: true, session: session || null });
  if (updated) return updated;
  const now = await doc.constructor.findById(doc._id).session(session || null);
  if (!now) throw new AppError('Application not found', 404);
  throw new AppError(`An application that is ${now.status} cannot be moved this way`, 409);
}

function needNote(note, what) {
  if (!note || !String(note).trim()) throw new AppError(`Say why: ${what} needs a reason`, 400);
  return String(note).trim();
}

/** Step 1 of 3: the admission office accepts the chosen subjects. */
applicationSchema.methods.approveSubjects = async function approveSubjects({ byUserId } = {}, { session } = {}) {
  return move(this, [S.SUBMITTED, S.WAITLISTED], { subjectsApprovedAt: new Date(), subjectsApprovedByUserId: byUserId }, { session });
};

/** Step 2 of 3: the office accepts the documents. Every required document must be uploaded and verified. */
applicationSchema.methods.approveDocuments = async function approveDocuments({ byUserId } = {}, { session } = {}) {
  const Docs = this.constructor.db.model('AdmissionDocument');
  const missing = await Docs.missingRequired(this._id, { session });
  if (missing.length) throw new AppError('Some required documents are not uploaded', 409, missing.map((type) => ({ field: type, message: 'Not uploaded' })));
  const pending = await Docs.notVerified(this._id, { session });
  if (pending.length) throw new AppError('Some required documents are not verified', 409, pending.map((type) => ({ field: type, message: 'Not verified' })));
  return move(this, [S.SUBMITTED, S.WAITLISTED], { documentsApprovedAt: new Date(), documentsApprovedByUserId: byUserId }, { session });
};

/**
 * Step 3 of 3: approve the form. Needs the subjects and documents approved first. Fixes the admission fee from the fee sheet
 * and starts the 3-day payment window. A zero fee (for example PM J&K scholarship) skips payment and starts the hard copy window.
 */
applicationSchema.methods.approveForm = async function approveForm({ byUserId, now = new Date() } = {}, { session } = {}) {
  if (!this.subjectsApprovedAt || !this.documentsApprovedAt) throw new AppError('Approve the subjects and the documents first', 409);
  if (this.divisionType === 'Grantable' && !(this.student && this.student.gender === 'Female')) throw new AppError('The Grantable division is for girls only', 409);
  const fee = await this.constructor.db.model('FeeStructure').findFor({
    purpose: 'admission', academicYearId: this.academicYearId, programId: this.programId,
    yearOfStudy: this.yearOfStudy || 1, divisionType: this.divisionType || C.DEFAULT_DIVISION, feesCategory: this.feesCategory,
  }, { session });
  if (!fee) throw new AppError('No admission fee is set for this class, division and fees category', 409);
  const patch = {
    approvedAt: now, reviewedByUserId: byUserId, reviewedAt: now, feeStructureId: fee._id, feeAmountPaise: fee.amountPaise,
  };
  const unset = { reviewNote: '' };
  if (fee.amountPaise === 0) {
    Object.assign(patch, { status: S.FEE_PAID, feePaidAt: now, hardCopyDueAt: new Date(now.getTime() + C.ADMISSION_RULES.hardCopyDueDays * DAY_MS) });
  } else {
    Object.assign(patch, { status: S.APPROVED, feeDueAt: new Date(now.getTime() + C.ADMISSION_RULES.feeDueDays * DAY_MS) });
  }
  return move(this, [S.SUBMITTED, S.WAITLISTED], patch, { session, unset, extra: { subjectsApprovedAt: { $ne: null }, documentsApprovedAt: { $ne: null } } });
};

/** A form that is not approved in time goes on the waiting list. It can still be approved later. */
applicationSchema.methods.waitlist = async function waitlist({ byUserId, note } = {}, { session } = {}) {
  return move(this, [S.SUBMITTED], { status: S.WAITLISTED, waitlistedAt: new Date(), reviewedByUserId: byUserId, reviewedAt: new Date(), reviewNote: note }, { session });
};

/** Send the form back to the applicant to correct. Earlier subject and document approvals are cleared. */
applicationSchema.methods.returnForCorrection = async function returnForCorrection({ byUserId, note } = {}, { session } = {}) {
  return move(this, [S.SUBMITTED, S.WAITLISTED], {
    status: S.RETURNED, reviewedByUserId: byUserId, reviewedAt: new Date(), reviewNote: needNote(note, 'returning a form'),
  }, { session, unset: { subjectsApprovedAt: '', subjectsApprovedByUserId: '', documentsApprovedAt: '', documentsApprovedByUserId: '' } });
};

applicationSchema.methods.reject = async function reject({ byUserId, note } = {}, { session } = {}) {
  return move(this, [S.SUBMITTED, S.WAITLISTED], {
    status: S.REJECTED, reviewedByUserId: byUserId, reviewedAt: new Date(), reviewNote: needNote(note, 'rejecting a form'),
  }, { session });
};

/**
 * Record that the admission fee was paid. Checks the payment really is a paid admission payment of this application for the
 * agreed amount. Safe to call twice. Starts the 3-day hard copy window.
 */
applicationSchema.methods.markFeePaid = async function markFeePaid({ paymentId } = {}, { session } = {}) {
  if (this.status === S.FEE_PAID || this.status === S.ADMITTED) return this;
  const payment = await this.constructor.db.model('Payment').findById(paymentId).session(session || null);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.purpose !== 'admission' || String(payment.applicationId) !== String(this._id)) throw new AppError('This payment is not for this application', 409);
  if (payment.status !== 'paid') throw new AppError('The payment is not paid', 409);
  if (payment.amountPaise !== this.feeAmountPaise) throw new AppError('The payment does not match the admission fee', 409);
  const paidAt = payment.paidAt || new Date();
  try {
    return await move(this, [S.APPROVED], {
      status: S.FEE_PAID, feePaidAt: paidAt, paymentId: payment._id, hardCopyDueAt: new Date(paidAt.getTime() + C.ADMISSION_RULES.hardCopyDueDays * DAY_MS),
    }, { session });
  } catch (err) {
    // The browser and the webhook can settle the same payment at the same time. If the other call already
    // recorded this exact payment, that is success, not a conflict.
    if (err.statusCode !== 409) throw err;
    const now = await this.constructor.findById(this._id).session(session || null);
    if (now && (now.status === S.FEE_PAID || now.status === S.ADMITTED) && String(now.paymentId) === String(payment._id)) return now;
    throw err;
  }
};

/** The hard copy of the form and documents reached the office: the admission is complete and a student record can be made. */
applicationSchema.methods.receiveHardCopy = async function receiveHardCopy({ byUserId } = {}, { session } = {}) {
  if (this.status === S.ADMITTED) return this;
  const now = new Date();
  return move(this, [S.FEE_PAID], { status: S.ADMITTED, hardCopyReceivedAt: now, hardCopyReceivedByUserId: byUserId, admittedAt: now }, { session });
};

/** Cancel an approved or fee-paid admission. A refund, if due, is a separate Refund. */
applicationSchema.methods.cancel = async function cancel({ byUserId, reason } = {}, { session } = {}) {
  return move(this, [S.APPROVED, S.FEE_PAID], {
    status: S.CANCELLED, cancelledAt: new Date(), reviewedByUserId: byUserId, reviewedAt: new Date(), cancelReason: needNote(reason, 'cancelling an admission'),
  }, { session });
};

/** Applications whose deadline passed: fee not paid in time, or hard copy not received in time. */
applicationSchema.statics.overdue = async function overdue({ now = new Date() } = {}) {
  const [fee, hardCopy] = await Promise.all([
    this.find({ status: S.APPROVED, feeDueAt: { $lt: now } }).select('applicationNumber feeDueAt'),
    this.find({ status: S.FEE_PAID, hardCopyDueAt: { $lt: now } }).select('applicationNumber hardCopyDueAt'),
  ]);
  return { fee, hardCopy };
};

/**
 * Cancel every approved application whose fee was not paid by the due date. Run it once a day (a scheduled job).
 * Late hard copies are NOT cancelled here: the college says the admission is "liable to be cancelled", so the office decides
 * (see overdue().hardCopy). Returns how many were cancelled.
 */
applicationSchema.statics.cancelUnpaid = async function cancelUnpaid({ now = new Date() } = {}) {
  const r = await this.updateMany(
    { status: S.APPROVED, feeDueAt: { $lt: now } },
    { $set: { status: S.CANCELLED, cancelledAt: now, cancelReason: 'Fee not paid within the due date' } }
  );
  return r.modifiedCount;
};

export default mongoose.model('Application', applicationSchema);

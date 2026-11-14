import mongoose from 'mongoose';
import * as C from '../utils/constants.js';

const { Schema } = mongoose;
const oid = (ref, extra = {}) => ({ type: Schema.Types.ObjectId, ref, ...extra });
const text = { type: String, trim: true };
const pick = (values) => ({ type: String, enum: { values, message: '{PATH} has an unknown value' } });
// Draft-friendly: an empty value is fine, a filled one must match.
const digits = (n, label) => ({ type: String, trim: true, match: [new RegExp(`^(\\d{${n}})?$`), `${label} must be ${n} digits`] });

const addressSchema = new Schema(
  {
    line1: text, line2: text, country: text, pincode: digits(6, 'Pincode'),
    state: text, district: text, taluka: text, location: text,
  },
  { _id: false }
);

const NEP_GROUPS = ['major', 'minor', 'openElective', 'vsc', 'sec', 'aec', 'iks', 'vec', 'ccProject'];
const nepShape = Object.fromEntries(NEP_GROUPS.map((g) => [g, { type: [String], default: [] }]));

const applicationSchema = new Schema(
  {
    // ---- Step 1: admission form information ----
    applicantUserId: oid('User', { required: true, index: true }),
    academicYearId: oid('AcademicYear', { required: true }),
    programId: oid('Program', { required: true }),
    admissionType: pick(C.ADMISSION_TYPES),
    divisionType: pick(C.DIVISION_TYPES),
    feesCategory: pick(C.FEES_CATEGORIES),
    abcId: text, // Academic Bank of Credits / APAAR ID
    // Personal data: not returned unless a query asks for it with .select('+aadhaarNumber').
    aadhaarNumber: { ...digits(12, 'Aadhaar number'), select: false },

    // ---- Step 2: student ----
    student: {
      surname: text, firstName: text, middleName: text, noMiddleName: { type: Boolean, default: false },
      nameCombination: pick(C.NAME_COMBINATIONS),
      fullName: text, // as per the last mark sheet
      gender: pick(C.GENDERS),
      address: { type: addressSchema, default: () => ({}) }, // local address
      mobile: digits(10, 'Mobile number'),
      email: { type: String, trim: true, lowercase: true, match: [/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, 'Email is not valid'] },
      birthDate: Date, birthPlace: text, birthPlaceCountry: text, nationality: text, motherTongue: text,
      maritalStatus: pick(C.MARITAL_STATUSES), bloodGroup: pick(C.BLOOD_GROUPS), handicap: pick(C.HANDICAPS),
      religion: pick(C.RELIGIONS), caste: text, subCaste: text, casteCategory: pick(C.CASTE_CATEGORIES),
      casteValidityNo: text, isMinority: pick(C.MINORITY_TYPES), minorityDetail: pick(C.MINORITY_DETAILS),
    },

    // ---- Step 3: parent ----
    parent: {
      fatherFullName: text, motherFirstName: text,
      sameAddressAsStudent: { type: Boolean, default: false },
      address: { type: addressSchema, default: () => ({}) }, // permanent address
      fatherMobile: digits(10, 'Father mobile number'), motherMobile: digits(10, 'Mother mobile number'),
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
  },
  { timestamps: true }
);

applicationSchema.index({ applicationNumber: 1 }, { unique: true, partialFilterExpression: { applicationNumber: { $type: 'string' } } });
// One application per applicant, year and class.
applicationSchema.index({ applicantUserId: 1, academicYearId: 1, programId: 1 }, { unique: true });

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

export default mongoose.model('Application', applicationSchema);

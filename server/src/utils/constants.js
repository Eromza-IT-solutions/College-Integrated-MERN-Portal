// Fixed value lists shared by models, middleware and (through the API) the client.
// Keep these in one place so Backend, Frontend and Database never disagree.
// (This replaces the earlier constants.js. It adds AUTH_TOKEN_PURPOSE, AUTH_TOKEN_TTL_MS,
//  AUDIT_OUTCOME and TEACHER_STATUS. Nothing was removed.)

export const ROLES = Object.freeze({
  APPLICANT: 'applicant',
  STUDENT: 'student',
  TEACHER: 'teacher',
  HOD: 'hod',
  WEBSITE_ADMIN: 'websiteAdmin',
  ADMISSION_ADMIN: 'admissionAdmin',
  EXAM_ADMIN: 'examAdmin',
  SUPER_ADMIN: 'superAdmin',
});

// Names shown on screen, used by the seed script.
export const ROLE_LABELS = Object.freeze({
  applicant: 'Applicant',
  student: 'Student',
  teacher: 'Teacher',
  hod: 'Head of Department',
  websiteAdmin: 'Website Admin',
  admissionAdmin: 'Admission Admin',
  examAdmin: 'Examination Admin',
  superAdmin: 'Super Admin',
});

export const USER_STATUS = Object.freeze({
  PENDING: 'pending', // registered, email not verified yet
  ACTIVE: 'active',
  DEACTIVATED: 'deactivated',
  LOCKED: 'locked',
});

// What a role may do with a resource ...
export const PERMISSION_ACTIONS = Object.freeze(['view', 'create', 'update', 'approve', 'delete', 'export']);
// ... and on whose records: only their own, their department's, or everyone's.
export const PERMISSION_SCOPES = Object.freeze(['own', 'department', 'all']);

export const ACADEMIC_YEAR_STATUS = Object.freeze({
  UPCOMING: 'upcoming',
  CURRENT: 'current',
  CLOSED: 'closed',
});

// Links sent by email.
export const AUTH_TOKEN_PURPOSE = Object.freeze({
  EMAIL_VERIFICATION: 'emailVerification',
  PASSWORD_RESET: 'passwordReset',
});

// How long a link works. PROPOSED values: 24 hours to verify, 30 minutes to reset. Team to confirm.
export const AUTH_TOKEN_TTL_MS = Object.freeze({
  emailVerification: 24 * 60 * 60 * 1000,
  passwordReset: 30 * 60 * 1000,
});

export const AUDIT_OUTCOME = Object.freeze({
  SUCCESS: 'success',
  DENIED: 'denied',
  FAILED: 'failed',
});

export const TEACHER_STATUS = Object.freeze({
  ACTIVE: 'active',
  DEACTIVATED: 'deactivated',
});

// Roles that must belong to a department.
export const DEPARTMENT_ROLES = [ROLES.TEACHER, ROLES.HOD];

export const ROLE_VALUES = Object.values(ROLES);
export const USER_STATUS_VALUES = Object.values(USER_STATUS);
export const ACADEMIC_YEAR_STATUS_VALUES = Object.values(ACADEMIC_YEAR_STATUS);
export const AUTH_TOKEN_PURPOSE_VALUES = Object.values(AUTH_TOKEN_PURPOSE);
export const AUDIT_OUTCOME_VALUES = Object.values(AUDIT_OUTCOME);
export const TEACHER_STATUS_VALUES = Object.values(TEACHER_STATUS);

// ---- Admission (values copied from the college admission portal's dropdowns) ----
export const ADMISSION_TYPES = Object.freeze(["Provisional"]);
export const DIVISION_TYPES = Object.freeze(["P.N.G."]);
export const FEES_CATEGORIES = Object.freeze(["PAYING", "OTHER STATE", "N.R.I.", "SAARC", "FOREIGNER", "PM J&K SCH."]);
export const NAME_COMBINATIONS = Object.freeze(["Surname First Middle", "First Middle Surname", "Surname First (no middle)", "First Surname (no middle)"]);
export const GENDERS = Object.freeze(["Male", "Female", "Transgender"]);
export const MARITAL_STATUSES = Object.freeze(["Divorced", "Married", "Separated", "Single", "Widow/Widower"]);
export const BLOOD_GROUPS = Object.freeze(["A-", "A+", "AB-", "AB+", "B-", "B+", "O-", "O+"]);
export const HANDICAPS = Object.freeze(["No", "Acid Attack Victim", "Autism Spectrum Disorder", "Blind", "Cerebral Palsy", "Chronic Neurological Conditions", "Deaf", "Dumb", "Dwarfism", "Hearing Imairment", "Hemophilia", "Intellectual Disability - Mentally", "L.D.", "Leprosy Cured Persons", "Locomotor Disability", "Low Vision/Partial Blind", "Mental Illness", "Multiple Disabilities", "Multiple Sclerosis", "Muscular Dystrophy", "Orthopedic", "Orthopedic Disability", "Parkinsons Disease", "Sickle Cell Disease", "Spastic", "Specific Learning Disability", "Speech and Language Disability", "Thalassemia / Cancer"]);
export const RELIGIONS = Object.freeze(["BUDDHIST", "CHRISTIAN", "HINDU", "ISLAM", "ISLAM-MUSLIM", "JAIN", "JUDAISM", "MUSLIM", "PARSI", "SIKH"]);
export const CASTE_CATEGORIES = Object.freeze(["OPEN", "EWS", "NT-B", "NT-C", "NT-D", "OBC", "SBC", "SC", "SEBC", "ST", "VJ-A"]);
export const MINORITY_TYPES = Object.freeze(["Religious", "Linguistic", "No"]);
export const MINORITY_DETAILS = Object.freeze(["Buddhist", "Christian", "Jain", "Muslim", "Navbodh", "Parsi", "Sikh"]);
export const ELIGIBILITIES = Object.freeze(["Foreigner", "J & K Quota", "N.R.I.", "Other Board/Other University", "Other Institute/College", "Other State", "P.I.O.", "SAARC", "Same Institute/College"]);
export const STATES_OF_RESIDENCE = Object.freeze(["Maharashtra", "Out Of Maharastra"]);
export const EXAM_MONTHS = Object.freeze(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
export const EXAM_RESULTS = Object.freeze(["-", "A Grade", "A.T.K.T.", "A+ Grade", "Appeared", "B Grade", "B+ Grade", "C Grade", "C+ Grade", "D Grade", "D+ Grade", "Distinction", "Fail", "I Class", "II Class", "O Grade", "Pass Class"]);
export const EXAM_ATTEMPTS = Object.freeze(["1st", "2nd", "3rd", "4th", "5th"]);
export const PASSPORT_TYPES = Object.freeze(["P"]);
export const VISA_NATURES = Object.freeze(["-", "Business", "Conference", "Employment", "Entry", "Journalist", "Other", "Student", "Tourist", "Transit"]);
export const VISA_ENTRIES = Object.freeze(["Double", "Multiple", "Single", "Triple"]);
export const APPLICATION_STATUS = Object.freeze({"DRAFT": "draft", "SUBMITTED": "submitted", "RETURNED": "returned", "APPROVED": "approved", "REJECTED": "rejected"});
export const APPLICATION_STATUS_VALUES = Object.values(APPLICATION_STATUS);
export const DOCUMENT_TYPES = Object.freeze({"AADHAAR": "aadhaar", "ADDRESS_PROOF": "addressProof", "ORIGINAL_LC": "originalLc", "MARKSHEET_10": "marksheet10", "MARKSHEET_12": "marksheet12", "PHOTO": "photo", "SIGNATURE": "signature"});
export const DOCUMENT_TYPES_VALUES = Object.values(DOCUMENT_TYPES);
export const DOCUMENT_STATUS = Object.freeze({"PENDING": "pending", "VERIFIED": "verified", "REJECTED": "rejected"});
export const DOCUMENT_STATUS_VALUES = Object.values(DOCUMENT_STATUS);

// A draft or an application sent back for correction may be edited; the others may not.
export const EDITABLE_APPLICATION_STATUSES = Object.freeze([APPLICATION_STATUS.DRAFT, APPLICATION_STATUS.RETURNED]);
// Documents the portal marks as required.
export const REQUIRED_DOCUMENT_TYPES = Object.freeze([DOCUMENT_TYPES.ORIGINAL_LC, DOCUMENT_TYPES.MARKSHEET_10, DOCUMENT_TYPES.MARKSHEET_12]);
// Upload limits from the portal: JPG/PNG, 500 KB; photo 80x100 px, signature 80x50 px.
export const DOCUMENT_RULES = Object.freeze({ mimeTypes: ['image/jpeg', 'image/png'], maxBytes: 500 * 1024,
  size: { photo: { width: 80, height: 100 }, signature: { width: 80, height: 50 } } });

// ---- Fees and payments ----
export const PAYMENT_PURPOSE = Object.freeze({"ADMISSION": "admission", "EXAM": "exam"});
export const PAYMENT_PURPOSE_VALUES = Object.values(PAYMENT_PURPOSE);
export const PAYMENT_STATUS = Object.freeze({"CREATED": "created", "PAID": "paid", "FAILED": "failed"});
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);
export const PAYMENT_GATEWAY = Object.freeze({"FAKE": "fake", "RAZORPAY": "razorpay"});
export const PAYMENT_GATEWAY_VALUES = Object.values(PAYMENT_GATEWAY);
export const REFUND_STATUS = Object.freeze({"REQUESTED": "requested", "APPROVED": "approved", "REJECTED": "rejected"});
export const REFUND_STATUS_VALUES = Object.values(REFUND_STATUS);

// ---- Students and subjects ----
export const SUBJECT_CATEGORIES = Object.freeze(["major", "minor", "openElective", "vsc", "sec", "aec", "iks", "vec", "ccProject"]);
export const STUDENT_STATUS = Object.freeze({"ACTIVE": "active", "GRADUATED": "graduated", "WITHDRAWN": "withdrawn"});
export const STUDENT_STATUS_VALUES = Object.values(STUDENT_STATUS);
export const ENROLLMENT_STATUS = Object.freeze({"ENROLLED": "enrolled", "DROPPED": "dropped"});
export const ENROLLMENT_STATUS_VALUES = Object.values(ENROLLMENT_STATUS);

// ---- Exams ----
export const EXAM_STATUS = Object.freeze({"DRAFT": "draft", "OPEN": "open", "CLOSED": "closed"});
export const EXAM_STATUS_VALUES = Object.values(EXAM_STATUS);
export const EXAM_FORM_STATUS = Object.freeze({"DRAFT": "draft", "PENDING_PAYMENT": "pendingPayment", "SUBMITTED": "submitted", "APPROVED": "approved", "REJECTED": "rejected"});
export const EXAM_FORM_STATUS_VALUES = Object.values(EXAM_FORM_STATUS);

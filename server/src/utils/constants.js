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

// ---- Admission (values copied from the college admission portal's dropdowns) ----
export const ADMISSION_TYPES = Object.freeze(["Provisional"]);
export const DIVISION_TYPES = Object.freeze(["P.N.G.", "Grantable"]); // Grantable is for girls only (college fee sheet)
export const DEFAULT_DIVISION = "P.N.G.";
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
// The college admission process: the form is sent in (submitted), then approved in three steps (subjects, documents, form).
// A form not approved in time is waitlisted. After form approval the fee is due; after payment the hard copy is due;
// the admission is complete (admitted) only when the hard copy is received.
export const APPLICATION_STATUS = Object.freeze({"DRAFT": "draft", "SUBMITTED": "submitted", "RETURNED": "returned", "WAITLISTED": "waitlisted", "APPROVED": "approved", "FEE_PAID": "feePaid", "ADMITTED": "admitted", "REJECTED": "rejected", "CANCELLED": "cancelled"});
export const APPLICATION_STATUS_VALUES = Object.values(APPLICATION_STATUS);
// Document kinds from the college "Documents to be attached with the online admission form" list, plus the portal signature.
export const DOCUMENT_TYPES = Object.freeze({
  "AADHAAR": "aadhaar", "ADDRESS_PROOF": "addressProof", "ORIGINAL_LC": "originalLc", "MARKSHEET_10": "marksheet10", "MARKSHEET_12": "marksheet12",
  "PHOTO": "photo", "SIGNATURE": "signature",
  "ELIGIBILITY_FORM": "eligibilityForm", "ANTI_RAGING_FORM": "antiRagingForm", "UNDERTAKING_FORM": "undertakingForm", "GAP_CERTIFICATE": "gapCertificate",
  "CONCESSION_FORM": "concessionForm", "INCOME_CERTIFICATE": "incomeCertificate", "BANK_PASSBOOK": "bankPassbook", "DOMICILE_CERTIFICATE": "domicileCertificate",
  "SCHOLARSHIP_FORM": "scholarshipForm", "CASTE_CERTIFICATE": "casteCertificate", "CASTE_VALIDITY_CERTIFICATE": "casteValidityCertificate",
  "MIGRATION_CERTIFICATE": "migrationCertificate",
  "UNIVERSITY_ADMISSION_LETTER": "universityAdmissionLetter", "PASSPORT_VISA": "passportVisa", "RESIDENTIAL_PROOF": "residentialProof",
  "POLICE_REGISTRATION": "policeRegistration", "C_FORM": "cForm",
});
export const DOCUMENT_TYPES_VALUES = Object.values(DOCUMENT_TYPES);
export const DOCUMENT_STATUS = Object.freeze({"PENDING": "pending", "VERIFIED": "verified", "REJECTED": "rejected"});
export const DOCUMENT_STATUS_VALUES = Object.values(DOCUMENT_STATUS);

// A draft or an application sent back for correction may be edited; the others may not.
export const EDITABLE_APPLICATION_STATUSES = Object.freeze([APPLICATION_STATUS.DRAFT, APPLICATION_STATUS.RETURNED]);
// Which documents an applicant must upload depends on the category (see utils/documentRules.js).
// Caste categories that need the reserved-category documents (caste certificate, validity, scholarship form...).
export const RESERVED_CASTE_CATEGORIES = Object.freeze(["NT-B", "NT-C", "NT-D", "OBC", "SBC", "SC", "SEBC", "ST", "VJ-A"]);
// Economically weaker / concession categories (EBC/PTC/STC/DEF/Ex-serviceman on the college list): EWS is the one the form can tell.
export const CONCESSION_CASTE_CATEGORIES = Object.freeze(["EWS"]);
// Fees categories that are foreign students (SAARC / N.R.I. / foreign countries on the college list).
export const FOREIGN_FEES_CATEGORIES = Object.freeze(["N.R.I.", "SAARC", "FOREIGNER"]);
export const OTHER_STATE_FEES_CATEGORY = "OTHER STATE";
// Admission timings from the college "Admission Procedure": a form is reviewed within 4 days, the fee is due within 3 days of
// approval, and the hard copy within 3 days of payment. PM J&K scholarship students pay no fee.
export const ADMISSION_RULES = Object.freeze({ reviewDays: 4, feeDueDays: 3, hardCopyDueDays: 3 });
// Upload limits from the portal: JPG/PNG, 500 KB; photo 80x100 px, signature 80x50 px.
export const DOCUMENT_RULES = Object.freeze({ mimeTypes: ['image/jpeg', 'image/png'], maxBytes: 500 * 1024,
  size: { photo: { width: 80, height: 100 }, signature: { width: 80, height: 50 } } });


// ---- Website content (notices, events, news, gallery, pages) ----
export const WEBSITE_CONTENT_TYPE = Object.freeze({"NOTICE": "notice", "EVENT": "event", "NEWS": "news", "GALLERY": "gallery", "PAGE": "page"});
export const WEBSITE_CONTENT_TYPE_VALUES = Object.values(WEBSITE_CONTENT_TYPE);
export const WEBSITE_CONTENT_STATUS = Object.freeze({"DRAFT": "draft", "PUBLISHED": "published", "ARCHIVED": "archived"});
export const WEBSITE_CONTENT_STATUS_VALUES = Object.values(WEBSITE_CONTENT_STATUS);
// Which permission-matrix resource governs each type. Notices have their own rows; the rest use "publicPages".
// (Events, news and gallery are not named in the signed-off matrix; they are treated as public pages until the team says otherwise.)
export const WEBSITE_CONTENT_RESOURCE = Object.freeze({"notice": "notices", "event": "publicPages", "news": "publicPages", "gallery": "publicPages", "page": "publicPages"});
export const WEBSITE_LIMITS = Object.freeze({ titleMax: 200, summaryMax: 500, bodyMax: 20000, attachmentsMax: 10, imagesMax: 60, slugMax: 80 });

// ---- Fees and payments ----
// ---- Programs ----
export const PROGRAM_LEVELS = Object.freeze(["Undergraduate", "Post Graduate", "Ph.D.", "Post-Doctoral", "UG Diploma", "PG Diploma", "Certificate Course"]);
export const PROGRAM_FACULTIES = Object.freeze(["Arts and Humanities", "Science and Technology", "Commerce and Management"]);
// PROPOSED number of years of study per level (the college must confirm diplomas and certificates).
export const PROGRAM_YEARS = Object.freeze({ "Undergraduate": 3, "Post Graduate": 2, "Ph.D.": 5, "Post-Doctoral": 1, "UG Diploma": 1, "PG Diploma": 1, "Certificate Course": 1 });
// How the college names each year of study on its fee sheets.
export const YEAR_LABELS = Object.freeze({ "Undergraduate": ["F.Y.", "S.Y.", "T.Y."], "Post Graduate": ["I", "II"], "Ph.D.": ["I", "II", "III", "IV", "V"] });

export const PAYMENT_PURPOSE = Object.freeze({"ADMISSION": "admission", "EXAM": "exam"});
export const PAYMENT_PURPOSE_VALUES = Object.values(PAYMENT_PURPOSE);
export const PAYMENT_STATUS = Object.freeze({"CREATED": "created", "PAID": "paid", "FAILED": "failed"});
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);
// Razorpay is the real gateway. "fake" exists only so offline demos and tests can run without any account.
export const PAYMENT_GATEWAY = Object.freeze({"RAZORPAY": "razorpay", "FAKE": "fake"});
export const PAYMENT_GATEWAY_VALUES = Object.values(PAYMENT_GATEWAY);
export const PAYMENT_METHODS = Object.freeze(["card", "upi", "netbanking", "wallet", "emi", "paylater", "other"]);
export const PAYMENT_CONFIRMED_VIA = Object.freeze({"CHECKOUT": "checkout", "WEBHOOK": "webhook", "RECONCILIATION": "reconciliation"});
export const PAYMENT_CONFIRMED_VIA_VALUES = Object.values(PAYMENT_CONFIRMED_VIA);
// Razorpay amounts are in paise, the same as ours. Receipt ids are limited to 40 characters.
export const RAZORPAY = Object.freeze({
  currency: "INR",
  receiptMaxLength: 40,
  ordersUrl: "https://api.razorpay.com/v1/orders",
  testKeyPrefix: "rzp_test_",
  events: Object.freeze({ PAYMENT_CAPTURED: "payment.captured", ORDER_PAID: "order.paid", PAYMENT_FAILED: "payment.failed" }),
});
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
export const HALL_TICKET_STATUS = Object.freeze({"PENDING": "pending", "ISSUED": "issued", "BLOCKED": "blocked"});
export const HALL_TICKET_STATUS_VALUES = Object.values(HALL_TICKET_STATUS);

// ---- Results ----
export const RESULT_OUTCOME = Object.freeze({"PASS": "pass", "FAIL": "fail"});
export const RESULT_OUTCOME_VALUES = Object.values(RESULT_OUTCOME);
export const RESULT_LINE_STATUS = Object.freeze({"PENDING": "pending", "PASS": "pass", "FAIL": "fail"});
export const RESULT_LINE_STATUS_VALUES = Object.values(RESULT_LINE_STATUS);
// College grading: CBCS 10-point credit system (college "Credit and Grade Point Calculation Sheet").
// A subject is passed only with at least 40% in CIE (internal) AND at least 40% in SEE (external). Otherwise: F, no credits.
// gradeBands: marks percentage -> letter grade and grade point. finalBands: SGPA or CGPA -> final letter grade.
// defaultMaxInternal / defaultMaxExternal / defaultCredits are PROPOSED starting values for a subject until the college gives its own.
export const GRADE_LETTERS = Object.freeze(['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'AB']);
export const GRADING = Object.freeze({
  minCiePercent: 40,
  minSeePercent: 40,
  gradeBands: Object.freeze([
    Object.freeze({ min: 90, grade: 'O', point: 10 }),
    Object.freeze({ min: 80, grade: 'A+', point: 9 }),
    Object.freeze({ min: 70, grade: 'A', point: 8 }),
    Object.freeze({ min: 55, grade: 'B+', point: 7 }),
    Object.freeze({ min: 50, grade: 'B', point: 6 }),
    Object.freeze({ min: 45, grade: 'C', point: 5 }),
    Object.freeze({ min: 40, grade: 'P', point: 4 }),
  ]),
  finalBands: Object.freeze([
    Object.freeze({ min: 9.5, grade: 'O' }),
    Object.freeze({ min: 8.5, grade: 'A+' }),
    Object.freeze({ min: 7.5, grade: 'A' }),
    Object.freeze({ min: 6.25, grade: 'B+' }),
    Object.freeze({ min: 5.25, grade: 'B' }),
    Object.freeze({ min: 4.75, grade: 'C' }),
    Object.freeze({ min: 4, grade: 'P' }),
  ]),
  defaultMaxInternal: 40,
  defaultMaxExternal: 60,
  defaultCredits: 2,
});

// ---- Teaching: timetable, attendance, teaching plans, internal marks ----
export const ATTENDANCE_STATUS = Object.freeze({"PRESENT": "present", "ABSENT": "absent", "LEAVE": "leave"});
export const ATTENDANCE_STATUS_VALUES = Object.values(ATTENDANCE_STATUS);
export const REVIEW_STATUS = Object.freeze({"DRAFT": "draft", "SUBMITTED": "submitted", "APPROVED": "approved", "RETURNED": "returned"});
export const REVIEW_STATUS_VALUES = Object.values(REVIEW_STATUS);
export const TOPIC_STATUS = Object.freeze({"PLANNED": "planned", "IN_PROGRESS": "inProgress", "DONE": "done"});
export const TOPIC_STATUS_VALUES = Object.values(TOPIC_STATUS);
export const TEACHING_RULES = Object.freeze({"attendanceEditDays": 7, "collegeUtcOffsetMinutes": 330, "maxPeriod": 12, "maxDivisionLength": 3});
// PROPOSED: a teacher may correct attendance up to 7 days after the lecture; after that it is locked. Dates use Indian time (UTC+5:30).

export const ROLE_VALUES = Object.values(ROLES);
export const USER_STATUS_VALUES = Object.values(USER_STATUS);
export const ACADEMIC_YEAR_STATUS_VALUES = Object.values(ACADEMIC_YEAR_STATUS);
export const AUTH_TOKEN_PURPOSE_VALUES = Object.values(AUTH_TOKEN_PURPOSE);
export const AUDIT_OUTCOME_VALUES = Object.values(AUDIT_OUTCOME);
export const TEACHER_STATUS_VALUES = Object.values(TEACHER_STATUS);

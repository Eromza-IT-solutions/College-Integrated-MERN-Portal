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
  ACCOUNTS_ADMIN: 'accountsAdmin',
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
  accountsAdmin: 'Accounts Admin',
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

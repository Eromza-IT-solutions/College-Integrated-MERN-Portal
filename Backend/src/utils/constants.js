// Fixed value lists shared by models, middleware and (through the API) the client.
// Keep these in one place so Backend, Frontend and Database never disagree.

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

export const USER_STATUS = Object.freeze({
  PENDING: 'pending', // registered, email not verified yet
  ACTIVE: 'active',
  DEACTIVATED: 'deactivated',
  LOCKED: 'locked',
});

// Roles that must belong to a department.
export const DEPARTMENT_ROLES = [ROLES.TEACHER, ROLES.HOD];

export const ROLE_VALUES = Object.values(ROLES);
export const USER_STATUS_VALUES = Object.values(USER_STATUS);

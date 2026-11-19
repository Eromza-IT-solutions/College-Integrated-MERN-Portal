import { z } from 'zod';
import AppError from '../../../utils/AppError.js';
import {
  ROLE_VALUES,
  ROLES,
  USER_STATUS_VALUES,
  PROGRAM_LEVELS,
  PROGRAM_FACULTIES,
  SUBJECT_CATEGORIES,
  PAYMENT_PURPOSE_VALUES,
  DIVISION_TYPES,
  FEES_CATEGORIES,
  ACADEMIC_YEAR_STATUS_VALUES,
} from '../../../utils/constants.js';

const objectId = (label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
  .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
const date = z.coerce.date({ invalid_type_error: 'Enter a valid date' });
const pageFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const search = z.string().trim().max(120).optional();
const active = z.enum(['true', 'false']).transform((v) => v === 'true').optional();
const atLeastOne = (o) => Object.keys(o).length > 0;
const staffRoles = [ROLES.WEBSITE_ADMIN, ROLES.ADMISSION_ADMIN, ROLES.EXAM_ADMIN, ROLES.SUPER_ADMIN];

const listQuery = z.object({ search, isActive: active, ...pageFields }).strict();
const userListQuery = z.object({
  search,
  role: z.enum(ROLE_VALUES).optional(),
  status: z.enum(USER_STATUS_VALUES).optional(),
  departmentId: objectId('departmentId').optional(),
  ...pageFields,
}).strict();

const userCreateBody = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits').optional().or(z.literal('')),
  password: z.string().min(1).max(128),
  role: z.enum(staffRoles),
}).strict();

const userUpdateBody = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits').optional().or(z.literal('')),
  role: z.enum(staffRoles).optional(),
  status: z.enum(USER_STATUS_VALUES).optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const departmentBody = z.object({
  code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  hodUserId: objectId('hodUserId').nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();
const departmentUpdateBody = departmentBody.partial().refine(atLeastOne, 'Send at least one field to change');

const academicYearBody = z.object({
  label: z.string().trim().regex(/^\d{4}-\d{2}$/, 'Label must look like 2026-27'),
  startDate: date,
  endDate: date,
  status: z.enum(ACADEMIC_YEAR_STATUS_VALUES).optional(),
}).strict().refine((b) => b.endDate > b.startDate, { path: ['endDate'], message: 'endDate must be after startDate' });
const academicYearUpdateBody = z.object({
  label: z.string().trim().regex(/^\d{4}-\d{2}$/, 'Label must look like 2026-27').optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  status: z.enum(ACADEMIC_YEAR_STATUS_VALUES).optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const programBody = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
  departmentId: objectId('departmentId'),
  faculty: z.enum(PROGRAM_FACULTIES).optional(),
  level: z.enum(PROGRAM_LEVELS),
  durationYears: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
}).strict();
const programUpdateBody = programBody.partial().refine(atLeastOne, 'Send at least one field to change');

const subjectBody = z.object({
  code: z.string().trim().min(1).max(30).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  programId: objectId('programId'),
  semester: z.number().int().min(1).max(12),
  category: z.enum(SUBJECT_CATEGORIES),
  credits: z.number().min(0).max(100).optional(),
  maxInternal: z.number().min(0).max(1000).optional(),
  maxExternal: z.number().min(0).max(1000).optional(),
  countsForCgpa: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict();
const subjectUpdateBody = subjectBody.partial().refine(atLeastOne, 'Send at least one field to change');

const feeHead = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  amountPaise: z.number().int().min(0),
}).strict();

const feeStructureBody = z.object({
  purpose: z.enum(PAYMENT_PURPOSE_VALUES),
  academicYearId: objectId('academicYearId'),
  programId: objectId('programId'),
  yearOfStudy: z.number().int().min(1).max(10).optional(),
  divisionType: z.enum(DIVISION_TYPES).optional(),
  feesCategory: z.enum(FEES_CATEGORIES),
  heads: z.array(feeHead).max(60).optional(),
  amountPaise: z.number().int().min(0).optional(),
  classLabel: z.string().trim().max(80).optional(),
  feeGroup: z.string().trim().max(80).optional(),
  label: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((b) => (b.heads && b.heads.length) || b.amountPaise != null, {
  path: ['amountPaise'], message: 'Send fee heads or an amount',
});
const feeStructureUpdateBody = z.object({
  purpose: z.enum(PAYMENT_PURPOSE_VALUES).optional(),
  academicYearId: objectId('academicYearId').optional(),
  programId: objectId('programId').optional(),
  yearOfStudy: z.number().int().min(1).max(10).optional(),
  divisionType: z.enum(DIVISION_TYPES).optional(),
  feesCategory: z.enum(FEES_CATEGORIES).optional(),
  heads: z.array(feeHead).max(60).optional(),
  amountPaise: z.number().int().min(0).optional(),
  classLabel: z.string().trim().max(80).optional(),
  feeGroup: z.string().trim().max(80).optional(),
  label: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const teacherBody = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits').optional().or(z.literal('')),
  password: z.string().min(1).max(128),
  role: z.enum([ROLES.TEACHER, ROLES.HOD]).default(ROLES.TEACHER),
  departmentId: objectId('departmentId'),
  employeeNumber: z.string().trim().min(1).max(40),
  designation: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Phone number looks invalid').optional().or(z.literal('')),
  joiningDate: date.optional(),
}).strict();

const teacherUpdateBody = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits').optional().or(z.literal('')),
  role: z.enum([ROLES.TEACHER, ROLES.HOD]).optional(),
  departmentId: objectId('departmentId').optional(),
  employeeNumber: z.string().trim().min(1).max(40).optional(),
  designation: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Phone number looks invalid').optional().or(z.literal('')),
  joiningDate: date.nullable().optional(),
  status: z.enum(['active', 'deactivated']).optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const idParam = objectId('id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export {
  listQuery, userListQuery, userCreateBody, userUpdateBody,
  departmentBody, departmentUpdateBody,
  academicYearBody, academicYearUpdateBody,
  programBody, programUpdateBody,
  subjectBody, subjectUpdateBody,
  feeStructureBody, feeStructureUpdateBody,
  teacherBody, teacherUpdateBody,
  idParam, parse,
};

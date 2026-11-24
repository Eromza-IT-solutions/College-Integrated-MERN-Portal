import asyncHandler from '../../../utils/asyncHandler.js';
import AuditLog from '../../../models/AuditLog.js';
import { AUDIT_OUTCOME } from '../../../utils/constants.js';
import * as s from './management.service.js';
import {
  listQuery, userListQuery, userCreateBody, userUpdateBody,
  departmentBody, departmentUpdateBody, academicYearBody, academicYearUpdateBody,
  programBody, programUpdateBody, programListQuery, subjectBody, subjectUpdateBody, subjectListQuery,
  feeStructureBody, feeStructureUpdateBody, teacherBody, teacherUpdateBody,
  idParam, parse,
} from './management.validation.js';

const send = (req, res, data, status = 200, meta = {}) => {
  res.set('Cache-Control', 'no-store');
  res.status(status).json({ success: true, data, meta: { ...meta, requestId: req.id } });
};
const paged = ({ total, page, limit }) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });
const audit = (req, action, entityType, entityId, details = {}) => AuditLog.record({
  actorUserId: req.user?.id,
  action,
  entityType,
  entityId,
  outcome: AUDIT_OUTCOME.SUCCESS,
  ip: req.ip,
  details,
}).catch((err) => console.error('Could not write audit log:', err.message));

// ---- users ----
export const listUsers = asyncHandler(async (req, res) => {
  const result = await s.listUsers(req, parse(userListQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await s.createStaffUser(parse(userCreateBody, req.body));
  await audit(req, 'userCreated', 'user', user._id, { role: user.role });
  send(req, res, user, 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await s.updateUser(req, parse(idParam, req.params.id), parse(userUpdateBody, req.body));
  await audit(req, 'userUpdated', 'user', user._id, { fields: Object.keys(req.body || {}) });
  send(req, res, user);
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await s.deactivateUser(parse(idParam, req.params.id), req.user.id);
  await audit(req, 'userDeactivated', 'user', user._id);
  send(req, res, user);
});

// ---- teachers ----
export const listTeachers = asyncHandler(async (req, res) => {
  const result = await s.listTeachers(req, parse(listQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createTeacher = asyncHandler(async (req, res) => {
  const teacher = await s.createTeacher(parse(teacherBody, req.body));
  await audit(req, 'teacherCreated', 'teacher', teacher._id, { userId: teacher.userId });
  send(req, res, teacher, 201);
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await s.updateTeacher(req, parse(idParam, req.params.id), parse(teacherUpdateBody, req.body));
  await audit(req, 'teacherUpdated', 'teacher', teacher._id, { fields: Object.keys(req.body || {}) });
  send(req, res, teacher);
});

export const deactivateTeacher = asyncHandler(async (req, res) => {
  const teacher = await s.deactivateTeacher(parse(idParam, req.params.id));
  await audit(req, 'teacherDeactivated', 'teacher', teacher._id);
  send(req, res, teacher);
});

// ---- departments ----
export const listDepartments = asyncHandler(async (req, res) => {
  const result = await s.listDepartments(parse(listQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await s.createDepartment(parse(departmentBody, req.body));
  await audit(req, 'departmentCreated', 'department', department._id, { code: department.code });
  send(req, res, department, 201);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await s.updateDepartment(parse(idParam, req.params.id), parse(departmentUpdateBody, req.body));
  await audit(req, 'departmentUpdated', 'department', department._id, { fields: Object.keys(req.body || {}) });
  send(req, res, department);
});

export const deactivateDepartment = asyncHandler(async (req, res) => {
  const department = await s.deactivateDepartment(parse(idParam, req.params.id));
  await audit(req, 'departmentDeactivated', 'department', department._id);
  send(req, res, department);
});

// ---- academic years ----
export const listAcademicYears = asyncHandler(async (req, res) => {
  const result = await s.listAcademicYears(parse(listQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createAcademicYear = asyncHandler(async (req, res) => {
  const year = await s.createAcademicYear(parse(academicYearBody, req.body));
  await audit(req, 'academicYearCreated', 'academicYear', year._id, { label: year.label, status: year.status });
  send(req, res, year, 201);
});

export const updateAcademicYear = asyncHandler(async (req, res) => {
  const year = await s.updateAcademicYear(parse(idParam, req.params.id), parse(academicYearUpdateBody, req.body));
  await audit(req, 'academicYearUpdated', 'academicYear', year._id, { fields: Object.keys(req.body || {}), status: year.status });
  send(req, res, year);
});

// ---- programs ----
export const listPrograms = asyncHandler(async (req, res) => {
  const result = await s.listPrograms(parse(programListQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createProgram = asyncHandler(async (req, res) => {
  const program = await s.createProgram(parse(programBody, req.body));
  await audit(req, 'programCreated', 'program', program._id, { code: program.code });
  send(req, res, program, 201);
});

export const updateProgram = asyncHandler(async (req, res) => {
  const program = await s.updateProgram(parse(idParam, req.params.id), parse(programUpdateBody, req.body));
  await audit(req, 'programUpdated', 'program', program._id, { fields: Object.keys(req.body || {}) });
  send(req, res, program);
});

export const deactivateProgram = asyncHandler(async (req, res) => {
  const program = await s.deactivateProgram(parse(idParam, req.params.id));
  await audit(req, 'programDeactivated', 'program', program._id);
  send(req, res, program);
});

// ---- subjects ----
export const listSubjects = asyncHandler(async (req, res) => {
  const result = await s.listSubjects(parse(subjectListQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createSubject = asyncHandler(async (req, res) => {
  const subject = await s.createSubject(parse(subjectBody, req.body));
  await audit(req, 'subjectCreated', 'subject', subject._id, { code: subject.code });
  send(req, res, subject, 201);
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await s.updateSubject(parse(idParam, req.params.id), parse(subjectUpdateBody, req.body));
  await audit(req, 'subjectUpdated', 'subject', subject._id, { fields: Object.keys(req.body || {}) });
  send(req, res, subject);
});

export const deactivateSubject = asyncHandler(async (req, res) => {
  const subject = await s.deactivateSubject(parse(idParam, req.params.id));
  await audit(req, 'subjectDeactivated', 'subject', subject._id);
  send(req, res, subject);
});

// ---- fee structures ----
export const listFeeStructures = asyncHandler(async (req, res) => {
  const result = await s.listFeeStructures(parse(listQuery, req.query));
  send(req, res, result.items, 200, paged(result));
});

export const createFeeStructure = asyncHandler(async (req, res) => {
  const fee = await s.createFeeStructure(parse(feeStructureBody, req.body));
  await audit(req, 'feeStructureCreated', 'feeStructure', fee._id, { purpose: fee.purpose, amountPaise: fee.amountPaise });
  send(req, res, fee, 201);
});

export const updateFeeStructure = asyncHandler(async (req, res) => {
  const fee = await s.updateFeeStructure(parse(idParam, req.params.id), parse(feeStructureUpdateBody, req.body));
  await audit(req, 'feeStructureUpdated', 'feeStructure', fee._id, { fields: Object.keys(req.body || {}), amountPaise: fee.amountPaise });
  send(req, res, fee);
});

export const deactivateFeeStructure = asyncHandler(async (req, res) => {
  const fee = await s.deactivateFeeStructure(parse(idParam, req.params.id));
  await audit(req, 'feeStructureDeactivated', 'feeStructure', fee._id);
  send(req, res, fee);
});

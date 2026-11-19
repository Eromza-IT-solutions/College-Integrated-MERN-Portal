import mongoose from 'mongoose';
import AppError from '../../../utils/AppError.js';
import User from '../../../models/User.js';
import Teacher from '../../../models/Teacher.js';
import Department from '../../../models/Department.js';
import AcademicYear from '../../../models/AcademicYear.js';
import Program from '../../../models/Program.js';
import Subject from '../../../models/Subject.js';
import FeeStructure from '../../../models/FeeStructure.js';
import { hashPassword } from '../../../utils/password.js';
import { validatePassword } from '../../../utils/passwordPolicy.js';
import { ROLES, USER_STATUS, TEACHER_STATUS, ACADEMIC_YEAR_STATUS } from '../../../utils/constants.js';
import { getActor } from '../../../middleware/requirePermission.js';
import { scopeFilter, isInScope } from '../../../utils/scope.js';

const notFound = (what) => new AppError(`${what} not found`, 404, undefined, 'NOT_FOUND');
const blank = (value) => (value === '' ? undefined : value);
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function duplicate(err, messages = {}) {
  if (err?.code !== 11000) return err;
  const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
  return new AppError(messages[field] || `That ${field} is already used.`, 409, [{ field, message: messages[field] || `That ${field} is already used.` }], 'DUPLICATE');
}

async function mustExist(Model, id, label) {
  const doc = mongoose.isValidObjectId(id) ? await Model.findById(id).lean() : null;
  if (!doc) throw new AppError(`${label} not found`, 400, [{ field: `${label.toLowerCase()}Id`, message: `${label} not found` }], 'INVALID_REFERENCE');
  return doc;
}

async function list(Model, filter, query, searchFields, sort) {
  const { page, limit } = query;
  const finalFilter = { ...filter };
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    finalFilter.$or = searchFields.map((field) => ({ [field]: rx }));
  }
  const [items, total] = await Promise.all([
    Model.find(finalFilter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(finalFilter),
  ]);
  return { items, total, page, limit };
}

function userFilter(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.departmentId) filter.departmentId = query.departmentId;
  return filter;
}

const scoped = (client, scope) => ({ $and: [client, scope] });
const SELF_TEACHER_FIELDS = new Set(['fullName', 'email', 'mobile', 'phone']);

async function newPassword(password, email) {
  const problem = validatePassword(password, email);
  if (problem) throw new AppError(problem, 400, [{ field: 'password', message: problem }], 'WEAK_PASSWORD');
  return hashPassword(password);
}

// ---- users ----
export const listUsers = (req, query) => list(
  User,
  scoped(userFilter(query), scopeFilter(req, { ownerField: '_id' })),
  query,
  ['fullName', 'email'],
  { createdAt: -1 }
);

export async function createStaffUser(body) {
  const passwordHash = await newPassword(body.password, body.email);
  try {
    return await User.create({
      fullName: body.fullName,
      email: body.email,
      mobile: blank(body.mobile),
      passwordHash,
      role: body.role,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
    });
  } catch (err) {
    throw duplicate(err, { email: 'That email address is already used.', mobile: 'That mobile number is already used.' });
  }
}

export async function updateUser(req, id, body) {
  const actor = getActor(req);
  const user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
  if (!user || !isInScope(req, user, { ownerField: '_id' })) throw notFound('User');
  if (req.permission.scope !== 'all' && (body.role !== undefined || body.status !== undefined)) {
    throw new AppError('You cannot change your own role or status.', 400, undefined, 'SELF_CHANGE_BLOCKED');
  }
  if (String(user._id) === actor.id && (body.role !== undefined || body.status !== undefined)) {
    throw new AppError('You cannot change your own role or status.', 400, undefined, 'SELF_CHANGE_BLOCKED');
  }
  for (const key of ['fullName', 'email', 'role', 'status']) if (body[key] !== undefined) user[key] = body[key];
  if (body.mobile !== undefined) user.mobile = blank(body.mobile);
  try {
    await user.save();
  } catch (err) {
    throw duplicate(err, { email: 'That email address is already used.', mobile: 'That mobile number is already used.' });
  }
  return user;
}

export async function deactivateUser(id, actorId) {
  const user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
  if (!user) throw notFound('User');
  if (String(user._id) === String(actorId)) throw new AppError('You cannot deactivate your own account.', 400, undefined, 'SELF_CHANGE_BLOCKED');
  if (user.role === ROLES.SUPER_ADMIN) {
    const activeSuperAdmins = await User.countDocuments({ role: ROLES.SUPER_ADMIN, status: USER_STATUS.ACTIVE });
    if (activeSuperAdmins <= 1) throw new AppError('The last active Super Admin cannot be deactivated.', 409, undefined, 'LAST_SUPER_ADMIN');
  }
  user.status = USER_STATUS.DEACTIVATED;
  await user.save();
  return user;
}

// ---- teachers ----
export const listTeachers = (req, query) => list(
  Teacher,
  scopeFilter(req, { ownerField: 'userId', departmentField: 'departmentId' }),
  query,
  ['employeeNumber', 'designation'],
  { createdAt: -1 }
);

export async function createTeacher(body) {
  await mustExist(Department, body.departmentId, 'Department');
  const passwordHash = await newPassword(body.password, body.email);
  let user;
  try {
    user = await User.create({
      fullName: body.fullName,
      email: body.email,
      mobile: blank(body.mobile),
      passwordHash,
      role: body.role,
      departmentId: body.departmentId,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
    });
    return await Teacher.create({
      userId: user._id,
      employeeNumber: body.employeeNumber,
      departmentId: body.departmentId,
      designation: body.designation,
      phone: blank(body.phone),
      joiningDate: body.joiningDate,
      status: TEACHER_STATUS.ACTIVE,
    });
  } catch (err) {
    if (user) await User.deleteOne({ _id: user._id }).catch(() => {});
    throw duplicate(err, {
      email: 'That email address is already used.',
      mobile: 'That mobile number is already used.',
      employeeNumber: 'That employee number is already used.',
    });
  }
}

export async function updateTeacher(req, id, body) {
  const teacher = mongoose.isValidObjectId(id) ? await Teacher.findById(id) : null;
  if (!teacher || !isInScope(req, teacher, { ownerField: 'userId', departmentField: 'departmentId' })) throw notFound('Teacher');
  if (req.permission.scope !== 'all') {
    const outside = Object.keys(body).filter((key) => !SELF_TEACHER_FIELDS.has(key));
    if (outside.length) throw new AppError('You can change only your own contact details.', 403, outside.map((field) => ({ field, message: 'Not allowed' })), 'FORBIDDEN');
  }
  const user = await User.findById(teacher.userId);
  if (!user) throw notFound('User');

  for (const key of ['fullName', 'email']) if (body[key] !== undefined) user[key] = body[key];
  if (body.mobile !== undefined) user.mobile = blank(body.mobile);
  if (body.role !== undefined) user.role = body.role;
  if (body.departmentId !== undefined) {
    await mustExist(Department, body.departmentId, 'Department');
    user.departmentId = body.departmentId;
    teacher.departmentId = body.departmentId;
  }
  for (const key of ['employeeNumber', 'designation', 'joiningDate', 'status']) if (body[key] !== undefined) teacher[key] = body[key];
  if (body.phone !== undefined) teacher.phone = blank(body.phone);

  try {
    await user.save();
    await teacher.save();
  } catch (err) {
    throw duplicate(err, {
      email: 'That email address is already used.',
      mobile: 'That mobile number is already used.',
      employeeNumber: 'That employee number is already used.',
    });
  }
  return teacher;
}

export async function deactivateTeacher(id) {
  const teacher = mongoose.isValidObjectId(id) ? await Teacher.findById(id) : null;
  if (!teacher) throw notFound('Teacher');
  teacher.status = TEACHER_STATUS.DEACTIVATED;
  await teacher.save();
  await User.updateOne({ _id: teacher.userId }, { $set: { status: USER_STATUS.DEACTIVATED } });
  return teacher;
}

// ---- departments ----
export const listDepartments = (query) => list(Department, query.isActive === undefined ? {} : { isActive: query.isActive }, query, ['code', 'name'], { code: 1 });

export async function createDepartment(body) {
  if (body.hodUserId) await checkHod(body.hodUserId, body._id);
  try {
    return await Department.create(body);
  } catch (err) {
    throw duplicate(err, { code: 'That department code is already used.' });
  }
}

async function checkHod(hodUserId, departmentId) {
  const user = mongoose.isValidObjectId(hodUserId) ? await User.findById(hodUserId) : null;
  if (!user || user.role !== ROLES.HOD) throw new AppError('The HOD must be a user with the Head of Department role.', 400, [{ field: 'hodUserId', message: 'Choose a Head of Department user' }], 'INVALID_HOD');
  if (departmentId && user.departmentId && String(user.departmentId) !== String(departmentId)) {
    throw new AppError('The HOD belongs to another department.', 400, [{ field: 'hodUserId', message: 'The HOD belongs to another department' }], 'INVALID_HOD');
  }
  return user;
}

export async function updateDepartment(id, body) {
  const department = mongoose.isValidObjectId(id) ? await Department.findById(id) : null;
  if (!department) throw notFound('Department');
  if (body.hodUserId) await checkHod(body.hodUserId, department._id);
  for (const key of ['code', 'name', 'hodUserId', 'isActive']) if (body[key] !== undefined) department[key] = body[key];
  try {
    await department.save();
  } catch (err) {
    throw duplicate(err, { code: 'That department code is already used.' });
  }
  return department;
}

export async function deactivateDepartment(id) {
  const department = mongoose.isValidObjectId(id) ? await Department.findById(id) : null;
  if (!department) throw notFound('Department');
  const [users, programs] = await Promise.all([
    User.countDocuments({ departmentId: department._id, status: USER_STATUS.ACTIVE }),
    Program.countDocuments({ departmentId: department._id, isActive: true }),
  ]);
  if (users || programs) throw new AppError('Move or deactivate the department staff and programs first.', 409, undefined, 'DEPARTMENT_IN_USE');
  department.isActive = false;
  await department.save();
  return department;
}

// ---- academic years ----
export const listAcademicYears = (query) => list(AcademicYear, {}, query, ['label'], { startDate: -1 });

async function clearCurrentYear(exceptId) {
  const filter = { status: ACADEMIC_YEAR_STATUS.CURRENT };
  if (exceptId) filter._id = { $ne: exceptId };
  await AcademicYear.updateMany(filter, { $set: { status: ACADEMIC_YEAR_STATUS.CLOSED, isCurrent: false } });
}

export async function createAcademicYear(body) {
  if (body.status === ACADEMIC_YEAR_STATUS.CURRENT) await clearCurrentYear();
  try {
    return await AcademicYear.create(body);
  } catch (err) {
    throw duplicate(err, { label: 'That academic year already exists.' });
  }
}

export async function updateAcademicYear(id, body) {
  const year = mongoose.isValidObjectId(id) ? await AcademicYear.findById(id) : null;
  if (!year) throw notFound('Academic year');
  if (body.status === ACADEMIC_YEAR_STATUS.CURRENT) await clearCurrentYear(year._id);
  for (const key of ['label', 'startDate', 'endDate', 'status']) if (body[key] !== undefined) year[key] = body[key];
  try {
    await year.save();
  } catch (err) {
    throw duplicate(err, { label: 'That academic year already exists.' });
  }
  return year;
}

// ---- programs ----
export const listPrograms = (query) => list(Program, query.isActive === undefined ? {} : { isActive: query.isActive }, query, ['name', 'code'], { name: 1 });

export async function createProgram(body) {
  await mustExist(Department, body.departmentId, 'Department');
  try {
    return await Program.create(body);
  } catch (err) {
    throw duplicate(err, { name: 'That program name is already used.', code: 'That program code is already used.' });
  }
}

export async function updateProgram(id, body) {
  const program = mongoose.isValidObjectId(id) ? await Program.findById(id) : null;
  if (!program) throw notFound('Program');
  if (body.departmentId !== undefined) await mustExist(Department, body.departmentId, 'Department');
  for (const key of ['name', 'code', 'departmentId', 'faculty', 'level', 'durationYears', 'isActive']) {
    if (body[key] !== undefined) program[key] = body[key];
  }
  try {
    await program.save();
  } catch (err) {
    throw duplicate(err, { name: 'That program name is already used.', code: 'That program code is already used.' });
  }
  return program;
}

export async function deactivateProgram(id) {
  const program = mongoose.isValidObjectId(id) ? await Program.findById(id) : null;
  if (!program) throw notFound('Program');
  program.isActive = false;
  await program.save();
  return program;
}

// ---- subjects ----
export const listSubjects = (query) => list(Subject, query.isActive === undefined ? {} : { isActive: query.isActive }, query, ['name', 'code'], { code: 1 });

export async function createSubject(body) {
  await mustExist(Program, body.programId, 'Program');
  try {
    return await Subject.create(body);
  } catch (err) {
    throw duplicate(err, { code: 'That subject code is already used in this class and semester.' });
  }
}

export async function updateSubject(id, body) {
  const subject = mongoose.isValidObjectId(id) ? await Subject.findById(id) : null;
  if (!subject) throw notFound('Subject');
  if (body.programId !== undefined) await mustExist(Program, body.programId, 'Program');
  for (const key of ['code', 'name', 'programId', 'semester', 'category', 'credits', 'maxInternal', 'maxExternal', 'countsForCgpa', 'isActive']) {
    if (body[key] !== undefined) subject[key] = body[key];
  }
  try {
    await subject.save();
  } catch (err) {
    throw duplicate(err, { code: 'That subject code is already used in this class and semester.' });
  }
  return subject;
}

export async function deactivateSubject(id) {
  const subject = mongoose.isValidObjectId(id) ? await Subject.findById(id) : null;
  if (!subject) throw notFound('Subject');
  subject.isActive = false;
  await subject.save();
  return subject;
}

// ---- fee structures ----
export const listFeeStructures = (query) => list(FeeStructure, query.isActive === undefined ? {} : { isActive: query.isActive }, query, ['classLabel', 'feeGroup', 'label'], { createdAt: -1 });

export async function createFeeStructure(body) {
  await mustExist(AcademicYear, body.academicYearId, 'Academic year');
  await mustExist(Program, body.programId, 'Program');
  try {
    return await FeeStructure.create(body);
  } catch (err) {
    throw duplicate(err, {});
  }
}

export async function updateFeeStructure(id, body) {
  const fee = mongoose.isValidObjectId(id) ? await FeeStructure.findById(id) : null;
  if (!fee) throw notFound('Fee structure');
  if (body.academicYearId !== undefined) await mustExist(AcademicYear, body.academicYearId, 'Academic year');
  if (body.programId !== undefined) await mustExist(Program, body.programId, 'Program');
  for (const key of ['purpose', 'academicYearId', 'programId', 'yearOfStudy', 'divisionType', 'feesCategory', 'heads', 'amountPaise', 'classLabel', 'feeGroup', 'label', 'isActive']) {
    if (body[key] !== undefined) fee[key] = body[key];
  }
  try {
    await fee.save();
  } catch (err) {
    throw duplicate(err, {});
  }
  return fee;
}

export async function deactivateFeeStructure(id) {
  const fee = mongoose.isValidObjectId(id) ? await FeeStructure.findById(id) : null;
  if (!fee) throw notFound('Fee structure');
  fee.isActive = false;
  await fee.save();
  return fee;
}

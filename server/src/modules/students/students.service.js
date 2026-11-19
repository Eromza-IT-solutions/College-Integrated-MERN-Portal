import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import Student from '../../models/Student.js';
import Enrollment from '../../models/Enrollment.js';
import Subject from '../../models/Subject.js';
import Program from '../../models/Program.js';
import AcademicYear from '../../models/AcademicYear.js';
import User from '../../models/User.js';
import Marks from '../../models/Marks.js';
import Attendance from '../../models/Attendance.js';
import { getActor } from '../../middleware/requirePermission.js';
import { studentScopeFilter } from '../../services/studentScope.js';
import { auditSafe } from '../../services/auditService.js';
import { firstSemesterOf, yearOfSemester } from '../../utils/academic.js';
import {
  ROLES,
  STUDENT_STATUS,
  USER_STATUS,
  ENROLLMENT_STATUS,
  ACADEMIC_YEAR_STATUS,
} from '../../utils/constants.js';

const notFound = () => new AppError('Student not found', 404, undefined, 'NOT_FOUND');
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
const last4 = (value) => (value ? String(value).slice(-4) : null);

function userView(user, { includeContact = false } = {}) {
  if (!user) return null;
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    ...(includeContact ? { mobile: user.mobile || null } : { mobileLast4: last4(user.mobile) }),
    aadhaarLast4: user.aadhaarLast4 || null,
  };
}

function studentView(student, { includeContact = false } = {}) {
  const user = student.userId && typeof student.userId === 'object' ? student.userId : null;
  const program = student.programId && typeof student.programId === 'object' ? student.programId : null;
  return {
    _id: student._id,
    userId: user ? user._id : student.userId,
    enrollmentNumber: student.enrollmentNumber,
    yearOfStudy: student.yearOfStudy,
    currentSemester: student.currentSemester,
    division: student.division,
    status: student.status,
    admittedAt: student.admittedAt,
    programId: program ? program._id : student.programId,
    program: program
      ? {
          _id: program._id,
          name: program.name,
          code: program.code,
          level: program.level,
          durationYears: program.durationYears,
          departmentId: program.departmentId,
        }
      : null,
    user: userView(user, { includeContact }),
  };
}

function canSeeContact(req) {
  const actor = getActor(req);
  return actor.role === ROLES.ADMISSION_ADMIN || actor.role === ROLES.SUPER_ADMIN;
}

async function loadStudent(req, id, { populate = false } = {}) {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const scope = await studentScopeFilter(req);
  let query = Student.findOne({ $and: [{ _id: id }, scope] });
  if (populate) {
    query = query
      .populate('userId', 'fullName email mobile aadhaarLast4')
      .populate('programId', 'name code level durationYears departmentId')
      .populate('admissionYearId', 'label startDate endDate status');
  }
  const student = await query;
  if (!student) throw notFound();
  return student;
}

async function listStudents(req, query) {
  const { page, limit, search, ...filters } = query;
  const client = clean({
    programId: filters.programId,
    currentSemester: filters.semester,
    division: filters.division,
    status: filters.status,
  });
  const scope = await studentScopeFilter(req);
  const conditions = [client, scope];

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ fullName: rx }).select('_id').lean();
    conditions.push({ $or: [{ enrollmentNumber: rx }, { userId: { $in: users.map((u) => u._id) } }] });
  }

  const filter = { $and: conditions };
  const [items, total] = await Promise.all([
    Student.find(filter)
      .sort({ enrollmentNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'fullName email mobile aadhaarLast4')
      .populate('programId', 'name code level durationYears departmentId')
      .lean(),
    Student.countDocuments(filter),
  ]);

  return {
    rows: items.map((student) => studentView(student)),
    total,
    page,
    limit,
  };
}

async function getStudent(req, id) {
  const student = await loadStudent(req, id, { populate: true });
  return {
    student: studentView(student, { includeContact: canSeeContact(req) }),
    program: student.programId,
    admissionYear: student.admissionYearId,
  };
}

async function updateStudent(req, id, body) {
  const student = await loadStudent(req, id);
  const scope = req.permission.scope;
  const allowed = scope === 'all'
    ? new Set(['mobile', 'division', 'currentSemester', 'yearOfStudy', 'status'])
    : new Set(['mobile']);

  const outside = Object.keys(body).filter((key) => !allowed.has(key));
  if (outside.length) {
    throw new AppError('Those student fields cannot be changed', 403, outside.map((field) => ({ field, message: 'Not allowed' })), 'FORBIDDEN');
  }

  const user = await User.findById(student.userId);
  if (!user) throw new AppError('The student account was not found', 404, undefined, 'NOT_FOUND');

  if (scope === 'all') {
    const program = await Program.findById(student.programId).select('durationYears').lean();
    if (!program) throw new AppError('Program not found', 404, undefined, 'NOT_FOUND');
    const maxSemester = program.durationYears * 2;

    let currentSemester = body.currentSemester;
    let yearOfStudy = body.yearOfStudy;
    if (currentSemester !== undefined && yearOfStudy === undefined) yearOfStudy = yearOfSemester(currentSemester);
    if (yearOfStudy !== undefined && currentSemester === undefined) currentSemester = firstSemesterOf(yearOfStudy);
    if (currentSemester !== undefined && yearOfStudy !== undefined && yearOfSemester(currentSemester) !== yearOfStudy) {
      throw new AppError('Semester and year of study do not match', 400, undefined, 'INVALID_SEMESTER');
    }
    if (currentSemester !== undefined && (currentSemester > maxSemester || currentSemester < 1)) {
      throw new AppError('That semester is outside the program duration', 400, undefined, 'INVALID_SEMESTER');
    }
    if (yearOfStudy !== undefined && (yearOfStudy > program.durationYears || yearOfStudy < 1)) {
      throw new AppError('That year is outside the program duration', 400, undefined, 'INVALID_YEAR');
    }

    if (body.division !== undefined) student.division = body.division;
    if (currentSemester !== undefined) student.currentSemester = currentSemester;
    if (yearOfStudy !== undefined) student.yearOfStudy = yearOfStudy;
    if (body.status !== undefined) student.status = body.status;
  }

  if (body.mobile !== undefined) user.mobile = body.mobile;
  if (scope === 'all' && body.status !== undefined) {
    user.status = body.status === STUDENT_STATUS.ACTIVE ? USER_STATUS.ACTIVE : USER_STATUS.DEACTIVATED;
  }

  try {
    await Promise.all([student.save(), user.save()]);
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
      throw new AppError(`That ${field} is already used.`, 409, [{ field, message: `That ${field} is already used.` }], 'DUPLICATE');
    }
    throw err;
  }

  if (body.status !== undefined && scope === 'all') {
    await auditSafe(req, {
      action: 'studentStatusChanged',
      entityType: 'student',
      entityId: student._id,
      details: { status: student.status },
    });
  }
  await auditSafe(req, {
    action: 'studentUpdated',
    entityType: 'student',
    entityId: student._id,
    details: { fields: Object.keys(body) },
  });

  return getStudent(req, id);
}

async function deactivateStudent(req, id) {
  const student = await loadStudent(req, id);
  const user = await User.findById(student.userId);
  student.status = STUDENT_STATUS.WITHDRAWN;
  if (user) user.status = USER_STATUS.DEACTIVATED;
  await Promise.all([student.save(), user ? user.save() : null]);
  await auditSafe(req, {
    action: 'studentDeactivated',
    entityType: 'student',
    entityId: student._id,
    details: { enrollmentNumber: student.enrollmentNumber },
  });
  return getStudent(req, id);
}

async function listEnrollments(req, id) {
  const student = await loadStudent(req, id);
  const rows = await Enrollment.find({ studentId: student._id })
    .populate('subjectId', 'code name semester category credits isActive')
    .sort({ semester: 1, createdAt: 1 })
    .lean();
  return rows.map((row) => ({
    ...row,
    subject: row.subjectId && typeof row.subjectId === 'object' ? row.subjectId : null,
    subjectId: row.subjectId && row.subjectId._id ? row.subjectId._id : row.subjectId,
  }));
}

function assertEnrollmentAdmin(req) {
  if (req.permission.scope !== 'all') {
    throw new AppError('Only admission staff can change enrollments', 403, undefined, 'FORBIDDEN');
  }
}

async function academicYearFor(student, academicYearId) {
  if (academicYearId) {
    const year = mongoose.isValidObjectId(academicYearId)
      ? await AcademicYear.findById(academicYearId).select('_id').lean()
      : null;
    if (!year) throw new AppError('Academic year not found', 400, undefined, 'INVALID_REFERENCE');
    return year._id;
  }
  const current = await AcademicYear.findOne({ status: ACADEMIC_YEAR_STATUS.CURRENT }).select('_id').lean();
  return current ? current._id : student.admissionYearId;
}

async function addEnrollment(req, id, body) {
  assertEnrollmentAdmin(req);
  const student = await loadStudent(req, id);
  const semester = body.semester ?? student.currentSemester;

  const subject = await Subject.findById(body.subjectId).lean();
  if (!subject || !subject.isActive) throw new AppError('Subject not found', 404, undefined, 'NOT_FOUND');
  if (String(subject.programId) !== String(student.programId)) {
    throw new AppError('The subject is not part of the student program', 400, undefined, 'INVALID_SUBJECT');
  }
  if (subject.semester !== semester) {
    throw new AppError('The subject is not in that semester', 400, undefined, 'INVALID_SUBJECT');
  }

  const academicYearId = await academicYearFor(student, body.academicYearId);
  const existing = await Enrollment.findOne({ studentId: student._id, subjectId: subject._id, semester });
  if (existing && existing.status === ENROLLMENT_STATUS.ENROLLED) {
    throw new AppError('The student is already enrolled in this subject', 409, undefined, 'DUPLICATE_ENROLLMENT');
  }

  let enrollment;
  if (existing) {
    existing.status = ENROLLMENT_STATUS.ENROLLED;
    existing.academicYearId = academicYearId;
    enrollment = await existing.save();
  } else {
    enrollment = await Enrollment.create({
      studentId: student._id,
      subjectId: subject._id,
      semester,
      academicYearId,
      status: ENROLLMENT_STATUS.ENROLLED,
    });
  }

  await auditSafe(req, {
    action: 'enrollmentAdded',
    entityType: 'enrollment',
    entityId: enrollment._id,
    details: { studentId: student._id, subjectId: subject._id, semester },
  });
  return Enrollment.findById(enrollment._id).populate('subjectId', 'code name semester category credits isActive').lean();
}

async function dropEnrollment(req, id, enrollmentId) {
  assertEnrollmentAdmin(req);
  const student = await loadStudent(req, id);
  if (!mongoose.isValidObjectId(enrollmentId)) throw new AppError('Enrollment not found', 404, undefined, 'NOT_FOUND');
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, studentId: student._id });
  if (!enrollment) throw new AppError('Enrollment not found', 404, undefined, 'NOT_FOUND');
  if (enrollment.status === ENROLLMENT_STATUS.DROPPED) {
    throw new AppError('The subject is already dropped', 409, undefined, 'ALREADY_DROPPED');
  }

  const [hasMarks, hasAttendance] = await Promise.all([
    Marks.exists({ studentId: student._id, subjectId: enrollment.subjectId, semester: enrollment.semester }),
    Attendance.exists({ 'records.studentId': student._id, subjectId: enrollment.subjectId, semester: enrollment.semester }),
  ]);
  if (hasMarks || hasAttendance) {
    throw new AppError('A subject with marks or attendance cannot be dropped', 409, undefined, 'ENROLLMENT_IN_USE');
  }

  enrollment.status = ENROLLMENT_STATUS.DROPPED;
  await enrollment.save();
  await auditSafe(req, {
    action: 'enrollmentDropped',
    entityType: 'enrollment',
    entityId: enrollment._id,
    details: { studentId: student._id, subjectId: enrollment.subjectId, semester: enrollment.semester },
  });
  return enrollment;
}

async function promoteStudent(req, id, body) {
  assertEnrollmentAdmin(req);
  const student = await loadStudent(req, id);
  const program = await Program.findById(student.programId).select('durationYears').lean();
  if (!program) throw new AppError('Program not found', 404, undefined, 'NOT_FOUND');

  const nextSemester = student.currentSemester + 1;
  const maxSemester = program.durationYears * 2;
  if (nextSemester > maxSemester) {
    throw new AppError('The student has completed the last semester of the program', 409, undefined, 'PROGRAM_COMPLETE');
  }

  const academicYearId = await academicYearFor(student, body.academicYearId);
  const subjects = await Subject.find({ programId: student.programId, semester: nextSemester, isActive: true }).select('_id').lean();

  student.currentSemester = nextSemester;
  student.yearOfStudy = yearOfSemester(nextSemester);
  await student.save();

  if (subjects.length) {
    await Enrollment.bulkWrite(subjects.map((subject) => ({
      updateOne: {
        filter: { studentId: student._id, subjectId: subject._id, semester: nextSemester },
        update: {
          $set: { status: ENROLLMENT_STATUS.ENROLLED, academicYearId },
          $setOnInsert: { studentId: student._id, subjectId: subject._id, semester: nextSemester },
        },
        upsert: true,
      },
    })));
  }

  await auditSafe(req, {
    action: 'studentPromoted',
    entityType: 'student',
    entityId: student._id,
    details: { fromSemester: nextSemester - 1, toSemester: nextSemester, enrolled: subjects.length },
  });

  const detail = await getStudent(req, id);
  return { ...detail, enrolled: subjects.length };
}

export {
  listStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
  listEnrollments,
  addEnrollment,
  dropEnrollment,
  promoteStudent,
};

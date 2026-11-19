import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import Student from '../../models/Student.js';
import Enrollment from '../../models/Enrollment.js';
import Program from '../../models/Program.js';
import AcademicYear from '../../models/AcademicYear.js';
import Department from '../../models/Department.js';
import { requirePermission, getActor } from '../../middleware/requirePermission.js';
import { ENROLLMENT_STATUS } from '../../utils/constants.js';
import { ok, paged } from '../academics/academics.helpers.js';
import {
  listStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
  listEnrollments,
  addEnrollment,
  dropEnrollment,
  promoteStudent,
} from './students.service.js';
import {
  studentListQuery,
  studentUpdateBody,
  enrollmentBody,
  promotionBody,
  idParam,
  parse,
} from './students.validation.js';

const router = express.Router();

router.get('/me', requirePermission('students', 'view'), asyncHandler(async (req, res) => {
  const record = await Student.findOne({ userId: getActor(req).id })
    .populate('userId', 'fullName email mobile aadhaarLast4')
    .lean();
  if (!record) throw new AppError('No student record found for this account', 404, undefined, 'NOT_FOUND');

  const user = record.userId && typeof record.userId === 'object' ? record.userId : null;
  const student = {
    ...record,
    userId: user ? user._id : record.userId,
  };

  const [program, admissionYear, enrollments] = await Promise.all([
    Program.findById(student.programId).select('name code level durationYears departmentId').lean(),
    AcademicYear.findById(student.admissionYearId).select('label startDate endDate status').lean(),
    Enrollment.find({ studentId: student._id, status: ENROLLMENT_STATUS.ENROLLED })
      .populate('subjectId', 'code name semester category credits')
      .sort({ semester: 1 })
      .lean(),
  ]);

  const department = program && program.departmentId
    ? await Department.findById(program.departmentId).select('name code').lean()
    : null;

  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: {
      student,
      user,
      program,
      department,
      admissionYear,
      enrollments: enrollments.filter((e) => e.subjectId),
    },
    meta: { requestId: req.id },
  });
}));

router.get('/', requirePermission('students', 'view'), asyncHandler(async (req, res) => {
  const result = await listStudents(req, parse(studentListQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.get('/:id/enrollments', requirePermission('students', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await listEnrollments(req, parse(idParam, req.params.id)));
}));

router.post('/:id/enrollments', requirePermission('students', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await addEnrollment(req, parse(idParam, req.params.id), parse(enrollmentBody, req.body)), 201);
}));

router.delete('/:id/enrollments/:enrollmentId', requirePermission('students', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await dropEnrollment(req, parse(idParam, req.params.id), parse(idParam, req.params.enrollmentId)));
}));

router.post('/:id/promote', requirePermission('students', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await promoteStudent(req, parse(idParam, req.params.id), parse(promotionBody, req.body)));
}));

router.get('/:id', requirePermission('students', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await getStudent(req, parse(idParam, req.params.id)));
}));

router.patch('/:id', requirePermission('students', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await updateStudent(req, parse(idParam, req.params.id), parse(studentUpdateBody, req.body)));
}));

router.delete('/:id', requirePermission('students', 'delete'), asyncHandler(async (req, res) => {
  ok(req, res, await deactivateStudent(req, parse(idParam, req.params.id)));
}));

export default router;

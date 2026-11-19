import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import Student from '../../models/Student.js';
import Enrollment from '../../models/Enrollment.js';
import Program from '../../models/Program.js';
import AcademicYear from '../../models/AcademicYear.js';
import { requirePermission, getActor } from '../../middleware/requirePermission.js';
import { ENROLLMENT_STATUS } from '../../utils/constants.js';

const router = express.Router();

router.get('/me', requirePermission('students', 'view'), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: getActor(req).id }).lean();
  if (!student) throw new AppError('No student record found for this account', 404, undefined, 'NOT_FOUND');

  const [program, admissionYear, enrollments] = await Promise.all([
    Program.findById(student.programId).select('name code level durationYears departmentId').lean(),
    AcademicYear.findById(student.admissionYearId).select('label startDate endDate status').lean(),
    Enrollment.find({ studentId: student._id, status: ENROLLMENT_STATUS.ENROLLED })
      .populate('subjectId', 'code name semester category credits')
      .sort({ semester: 1 })
      .lean(),
  ]);

  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: {
      student,
      program,
      admissionYear,
      enrollments: enrollments.filter((e) => e.subjectId),
    },
    meta: { requestId: req.id },
  });
}));

export default router;

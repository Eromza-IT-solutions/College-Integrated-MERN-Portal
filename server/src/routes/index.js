// Mounts every feature's routes under /api/v1.
// Each module keeps its own routes file; add them here as they are built:
//   router.use('/auth', require('../modules/auth/auth.routes'));
import express from 'express';
import mongoose from 'mongoose';
import authRoutes from '../modules/auth/auth.routes.js';
import rbacRoutes from '../modules/admin/super/rbac.routes.js';
import auditLogsRoutes from '../modules/admin/super/auditLogs.routes.js';
import managementRoutes from '../modules/admin/super/management.routes.js';
import admissionRoutes from '../modules/admission/admission.routes.js';
import examRoutes from '../modules/examinations/exam.routes.js';
import examFormRoutes from '../modules/examinations/examForm.routes.js';
import paymentsRoutes from '../modules/payments/payments.routes.js';
import refundsRoutes from '../modules/payments/refunds.routes.js';
import timetableRoutes from '../modules/academics/timetable.routes.js';
import attendanceRoutes from '../modules/academics/attendance.routes.js';
import marksRoutes from '../modules/academics/marks.routes.js';
import resultsRoutes from '../modules/academics/results.routes.js';
import teachingRoutes from '../modules/academics/teaching.routes.js';
import studentsRoutes from '../modules/students/students.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import buildWebsiteRouter from '../modules/website/website.routes.js';
import { ensureAuthenticated } from '../middleware/authenticate.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use(rbacRoutes); // /roles and /permissions (Super Admin only)

// Quick check that the server and database are up.
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    },
    meta: { requestId: req.id },
  });
});

router.use('/audit-logs', ensureAuthenticated, requirePasswordChange, auditLogsRoutes);
router.use('/admin', ensureAuthenticated, requirePasswordChange, managementRoutes);
router.use('/admissions', ensureAuthenticated, requirePasswordChange, admissionRoutes);
router.use('/exams', ensureAuthenticated, requirePasswordChange, examRoutes);
router.use('/exam-forms', ensureAuthenticated, requirePasswordChange, examFormRoutes);
router.use('/payments', paymentsRoutes);
router.use('/refunds', ensureAuthenticated, requirePasswordChange, refundsRoutes);
router.use('/timetable', ensureAuthenticated, requirePasswordChange, timetableRoutes);
router.use('/attendance', ensureAuthenticated, requirePasswordChange, attendanceRoutes);
router.use('/marks', ensureAuthenticated, requirePasswordChange, marksRoutes);
router.use('/results', ensureAuthenticated, requirePasswordChange, resultsRoutes);
router.use('/teaching-plans', ensureAuthenticated, requirePasswordChange, teachingRoutes);
router.use('/students', ensureAuthenticated, requirePasswordChange, studentsRoutes);
router.use('/reports', ensureAuthenticated, requirePasswordChange, reportsRoutes);
router.use('/website', buildWebsiteRouter());

export default router;

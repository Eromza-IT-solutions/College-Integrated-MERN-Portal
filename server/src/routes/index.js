// Mounts every feature's routes under /api/v1.
// Each module keeps its own routes file; add them here as they are built:
//   router.use('/auth', require('../modules/auth/auth.routes'));
import express from 'express';
import mongoose from 'mongoose';
import authRoutes from '../modules/auth/auth.routes.js';
import rbacRoutes from '../modules/admin/super/rbac.routes.js';
import auditLogsRoutes from '../modules/admin/super/auditLogs.routes.js';
import paymentsRoutes from '../modules/payments/payments.routes.js';
import refundsRoutes from '../modules/payments/refunds.routes.js';
import timetableRoutes from '../modules/academics/timetable.routes.js';
import attendanceRoutes from '../modules/academics/attendance.routes.js';
import marksRoutes from '../modules/academics/marks.routes.js';
import resultsRoutes from '../modules/academics/results.routes.js';
import buildWebsiteRouter from '../modules/website/website.routes.js';

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

router.use('/audit-logs', auditLogsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/refunds', refundsRoutes);
router.use('/timetable', timetableRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marks', marksRoutes);
router.use('/results', resultsRoutes);
router.use('/website', buildWebsiteRouter());

export default router;

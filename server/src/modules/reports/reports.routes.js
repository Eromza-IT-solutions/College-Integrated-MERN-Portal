import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { auditSafe } from '../../services/auditService.js';
import { todayAtCollege } from '../../utils/dates.js';
import { reportQuery, parse } from './reports.validation.js';
import { toCsv } from './reports.csv.js';
import { departmentReport, admissionReport, examReport, paymentReport } from './reports.service.js';

const router = express.Router();
const viewGuard = requirePermission('reports', 'view');
const exportGuard = requirePermission('reports', 'export');
// CSV (export) ke liye "export" permission alag se chahiye; JSON dekhne ke liye sirf "view".
const exportIfCsv = (req, res, next) => (req.query.format === 'csv' ? exportGuard(req, res, next) : next());

function reportRoute(name, build) {
  return [viewGuard, exportIfCsv, asyncHandler(async (req, res) => {
    const q = parse(reportQuery, req.query);
    const report = await build(req, q);
    if (q.format === 'csv') {
      const { format, ...filters } = q; // eslint-disable-line no-unused-vars
      await auditSafe(req, { action: 'reportExported', entityType: 'report', details: { report: name, rows: report.rows.length, filters } });
      res.status(200).type('text/csv').set('Content-Disposition', `attachment; filename="${name}-report-${todayAtCollege()}.csv"`).send(toCsv(report.rows));
      return;
    }
    res.status(200).json({ success: true, data: report, meta: { requestId: req.id } });
  })];
}

// GET /api/v1/reports/department|admission|exam|payment  ?academicYearId=&programId=&examId=&from=&to=&format=json|csv
router.get('/department', ...reportRoute('department', departmentReport));
router.get('/admission', ...reportRoute('admission', admissionReport));
router.get('/exam', ...reportRoute('exam', examReport));
router.get('/payment', ...reportRoute('payment', paymentReport));

export default router;

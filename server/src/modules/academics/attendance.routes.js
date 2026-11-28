import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { rosterQuery, markBody, registerQuery, summaryQuery, myRecordsQuery, parse } from './academics.validation.js';
import { getRoster, markAttendance, listRegisters, studentSummary, myRecords } from './attendance.service.js';
import { ok, paged } from './academics.helpers.js';

const router = express.Router();

// GET /api/v1/attendance/roster?slotId=&lectureDate=2026-11-16   (teacher: attendance lene se pehle student list)
router.get('/roster', requirePermission('attendance', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await getRoster(req, parse(rosterQuery, req.query)));
}));

// POST /api/v1/attendance/mark   { slotId, lectureDate, records: [{ studentId, status }] }   (nayi attendance ya correction)
router.post('/mark', requirePermission('attendance', 'create'), asyncHandler(async (req, res) => {
  const result = await markAttendance(req, parse(markBody, req.body));
  ok(req, res, result, result.corrected ? 200 : 201);
}));

// GET /api/v1/attendance/summary?studentId=&subjectId=   (student apni; hod / teacher / super admin studentId ke saath)
router.get('/summary', requirePermission('attendance', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await studentSummary(req, parse(summaryQuery, req.query)));
}));

// GET /api/v1/attendance/my-records?from=&to=   (student: apni lecture-wise attendance, calendar ke liye)
router.get('/my-records', requirePermission('attendance', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await myRecords(req, parse(myRecordsQuery, req.query)));
}));

// GET /api/v1/attendance?slotId=&subjectId=&from=&to=&page=&limit=   (registers ki list)
router.get('/', requirePermission('attendance', 'view'), asyncHandler(async (req, res) => {
  const result = await listRegisters(req, parse(registerQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

export default router;

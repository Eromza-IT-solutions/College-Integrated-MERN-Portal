import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { slotBody, slotUpdateBody, slotQuery, idParam, parse } from './academics.validation.js';
import { createSlot, updateSlot, listSlots } from './timetable.service.js';
import { ok, paged } from './academics.helpers.js';

const router = express.Router();

// GET /api/v1/timetable?programId=&semester=&dayOfWeek=&page=&limit=
router.get('/', requirePermission('timetable', 'view'), asyncHandler(async (req, res) => {
  const result = await listSlots(req, parse(slotQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

// POST /api/v1/timetable   { academicYearId, programId, semester, division, subjectId, teacherUserId, dayOfWeek, period, startTime?, endTime?, room? }
router.post('/', requirePermission('timetable', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await createSlot(req, parse(slotBody, req.body)), 201);
}));

// PATCH /api/v1/timetable/:id   { teacherUserId?, dayOfWeek?, period?, startTime?, endTime?, room?, isActive? }
router.patch('/:id', requirePermission('timetable', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await updateSlot(req, parse(idParam, req.params.id), parse(slotUpdateBody, req.body)));
}));

export default router;

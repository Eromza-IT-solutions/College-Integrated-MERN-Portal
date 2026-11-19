import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { marksEnterBody, marksSubmitBody, marksDecisionBody, marksQuery, idParam, parse } from './academics.validation.js';
import { enterMarks, submitMarks, decideMarks, listMarks, getMark } from './marks.service.js';
import { ok, paged } from './academics.helpers.js';

const router = express.Router();

// POST /api/v1/marks   { subjectId, semester, academicYearId, component, outOf, entries: [{ studentId, obtained }] }
router.post('/', requirePermission('marks', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await enterMarks(req, parse(marksEnterBody, req.body)));
}));

// POST /api/v1/marks/submit   { ids: [...] }     teacher -> HOD ko approval ke liye
router.post('/submit', requirePermission('marks', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await submitMarks(req, parse(marksSubmitBody, req.body)));
}));

// POST /api/v1/marks/decision   { ids: [...], approve: true|false, note? }     HOD
router.post('/decision', requirePermission('marks', 'approve'), asyncHandler(async (req, res) => {
  ok(req, res, await decideMarks(req, parse(marksDecisionBody, req.body)));
}));

// GET /api/v1/marks?subjectId=&semester=&status=&page=&limit=
router.get('/', requirePermission('marks', 'view'), asyncHandler(async (req, res) => {
  const result = await listMarks(req, parse(marksQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.get('/:id', requirePermission('marks', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await getMark(req, parse(idParam, req.params.id)));
}));

export default router;

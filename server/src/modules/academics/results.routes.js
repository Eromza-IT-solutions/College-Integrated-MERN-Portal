import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import {
  resultOpenBody, resultMarksBody, resultPublishExamBody, resultUnpublishBody, resultQuery, idParam, parse,
} from './academics.validation.js';
import {
  openSheet, listResults, getResult, enterResultMarks, publishOne, publishAll, unpublishOne,
} from './results.service.js';
import { ok, paged } from './academics.helpers.js';
import { sendPdf, pdfFilename } from '../../utils/pdf.js';
import { resultPdf } from '../../utils/pdfDocuments.js';

const router = express.Router();

// Static paths (/open, /publish-exam) hamesha "/:id" se UPAR rakho, warna Express unhe id samajh lega.

// POST /api/v1/results/open   { examFormId }
router.post('/open', requirePermission('results', 'create'), asyncHandler(async (req, res) => {
  const { sheet, created } = await openSheet(req, parse(resultOpenBody, req.body));
  ok(req, res, sheet, created ? 201 : 200, { created });
}));

// POST /api/v1/results/publish-exam   { examId }
router.post('/publish-exam', requirePermission('results', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await publishAll(req, parse(resultPublishExamBody, req.body)));
}));

// GET /api/v1/results?examId=&studentId=&isPublished=&page=&limit=
router.get('/', requirePermission('results', 'view'), asyncHandler(async (req, res) => {
  const result = await listResults(req, parse(resultQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.get('/:id/pdf', requirePermission('results', 'view'), asyncHandler(async (req, res) => {
  const result = await getResult(req, parse(idParam, req.params.id));
  sendPdf(res, resultPdf(result), pdfFilename(`result-${result.enrollmentNumber || result._id}`));
}));

router.get('/:id', requirePermission('results', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await getResult(req, parse(idParam, req.params.id)));
}));

// PUT /api/v1/results/:id/marks   { entries: [{ subjectId, internalMarks, externalMarks, absent?, maxInternal?, maxExternal? }] }
router.put('/:id/marks', requirePermission('results', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await enterResultMarks(req, parse(idParam, req.params.id), parse(resultMarksBody, req.body)));
}));

router.post('/:id/publish', requirePermission('results', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await publishOne(req, parse(idParam, req.params.id)));
}));

// POST /api/v1/results/:id/unpublish   { reason }
router.post('/:id/unpublish', requirePermission('results', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await unpublishOne(req, parse(idParam, req.params.id), parse(resultUnpublishBody, req.body)));
}));

export default router;

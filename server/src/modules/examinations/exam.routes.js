import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { ok, paged } from '../academics/academics.helpers.js';
import { examBody, examUpdateBody, examQuery, formQuery, referenceQuery, hallTicketGenerateBody, idParam, parse } from './examinations.validation.js';
import {
  createExam, listExams, getExam, updateExam, referenceData, availableExams, examEligibility, startForm, listForms,
} from './examinations.service.js';
import { generateTickets, listTickets } from './hallTickets.service.js';

const router = express.Router();

router.get('/', requirePermission('exams', 'view'), asyncHandler(async (req, res) => {
  const result = await listExams(req, parse(examQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.get('/available', requirePermission('examForms', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await availableExams(req));
}));

router.get('/eligibility', requirePermission('examForms', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await examEligibility(req));
}));

router.get('/reference', requirePermission('exams', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await referenceData(req, parse(referenceQuery, req.query)));
}));

router.post('/', requirePermission('exams', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await createExam(req, parse(examBody, req.body)), 201);
}));

router.get('/:id', requirePermission('exams', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await getExam(req, parse(idParam, req.params.id)));
}));

router.patch('/:id', requirePermission('exams', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await updateExam(req, parse(idParam, req.params.id), parse(examUpdateBody, req.body)));
}));

router.get('/:id/hall-tickets', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  const result = await listTickets(req, parse(idParam, req.params.id));
  ok(req, res, result.rows, 200, { total: result.total });
}));

router.post('/:id/hall-tickets/generate', requirePermission('examForms', 'approve'), asyncHandler(async (req, res) => {
  const result = await generateTickets(req, parse(idParam, req.params.id), parse(hallTicketGenerateBody, req.body));
  ok(req, res, result, 201);
}));

router.post('/:id/form', requirePermission('examForms', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await startForm(req, parse(idParam, req.params.id)), 201);
}));

router.get('/:id/forms', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  const query = parse(formQuery, { ...req.query, examId: req.params.id });
  const result = await listForms(req, query);
  ok(req, res, result.rows, 200, paged(result));
}));

export default router;

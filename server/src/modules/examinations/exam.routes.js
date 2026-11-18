import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { ok, paged } from '../academics/academics.helpers.js';
import { examBody, examUpdateBody, examQuery, formQuery, idParam, parse } from './examinations.validation.js';
import {
  createExam, listExams, getExam, updateExam, availableExams, startForm, listForms,
} from './examinations.service.js';

const router = express.Router();

router.get('/', requirePermission('exams', 'view'), asyncHandler(async (req, res) => {
  const result = await listExams(req, parse(examQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.get('/available', requirePermission('examForms', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await availableExams(req));
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

router.post('/:id/form', requirePermission('examForms', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await startForm(req, parse(idParam, req.params.id)), 201);
}));

router.get('/:id/forms', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  const query = parse(formQuery, { ...req.query, examId: req.params.id });
  const result = await listForms(req, query);
  ok(req, res, result.rows, 200, paged(result));
}));

export default router;

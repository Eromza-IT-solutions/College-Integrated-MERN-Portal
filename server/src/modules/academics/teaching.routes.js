import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { ok, paged } from './academics.helpers.js';
import { startBody, topicsBody, decisionBody, progressBody, listQuery, idParam, parse } from './teaching.validation.js';
import { listPlans, startPlan, getPlan, setTopics, submitPlan, decidePlan, updateProgress } from './teaching.service.js';

const router = express.Router();

router.get('/', requirePermission('teachingPlans', 'view'), asyncHandler(async (req, res) => {
  const result = await listPlans(req, parse(listQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.post('/', requirePermission('teachingPlans', 'create'), asyncHandler(async (req, res) => {
  ok(req, res, await startPlan(req, parse(startBody, req.body)), 201);
}));

router.get('/:id', requirePermission('teachingPlans', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await getPlan(req, parse(idParam, req.params.id)));
}));

router.put('/:id/topics', requirePermission('teachingPlans', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await setTopics(req, parse(idParam, req.params.id), parse(topicsBody, req.body).topics));
}));

router.post('/:id/submit', requirePermission('teachingPlans', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await submitPlan(req, parse(idParam, req.params.id)));
}));

router.post('/:id/decision', requirePermission('teachingPlans', 'approve'), asyncHandler(async (req, res) => {
  ok(req, res, await decidePlan(req, parse(idParam, req.params.id), parse(decisionBody, req.body)));
}));

router.patch('/:id/topics/:topicId', requirePermission('teachingPlans', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await updateProgress(req, parse(idParam, req.params.id), parse(idParam, req.params.topicId), parse(progressBody, req.body)));
}));

export default router;

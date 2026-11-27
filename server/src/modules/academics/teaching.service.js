import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import TeachingPlan from '../../models/TeachingPlan.js';
import { scopeFilter, isInScope } from '../../utils/scope.js';
import { getActor } from '../../middleware/requirePermission.js';

const FIELDS = { ownerField: 'teacherUserId', departmentField: 'departmentId' };
const notFound = () => new AppError('Teaching plan not found', 404, undefined, 'NOT_FOUND');

function withProgress(plan) {
  const topics = plan.topics || [];
  const done = topics.filter((t) => t.status === 'done').length;
  return { ...plan, progressPercent: topics.length ? Math.round((done * 10000) / topics.length) / 100 : 0 };
}

async function load(req, id) {
  const plan = mongoose.isValidObjectId(id) ? await TeachingPlan.findById(id) : null;
  if (!plan || !isInScope(req, plan, FIELDS)) throw notFound();
  return plan;
}

export async function listPlans(req, query) {
  const filter = { ...scopeFilter(req, FIELDS) };
  if (query.subjectId) filter.subjectId = query.subjectId;
  if (query.academicYearId) filter.academicYearId = query.academicYearId;
  if (query.semester) filter.semester = query.semester;
  if (query.status) filter.status = query.status;
  const { page, limit } = query;
  const [rows, total] = await Promise.all([
    TeachingPlan.find(filter)
      .populate('subjectId', 'code name')
      .populate('programId', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TeachingPlan.countDocuments(filter),
  ]);
  return { rows: rows.map(withProgress), total, page, limit };
}

export async function startPlan(req, body) {
  try {
    const plan = await TeachingPlan.start({ teacherUserId: getActor(req).id, ...body });
    return withProgress(plan.toObject());
  } catch (err) {
    if (err?.code === 11000) throw new AppError('A plan for this subject and semester already exists.', 409, undefined, 'PLAN_EXISTS');
    throw err;
  }
}

export async function getPlan(req, id) {
  return withProgress((await load(req, id)).toObject());
}

export async function setTopics(req, id, topics) {
  const plan = await load(req, id);
  return withProgress((await plan.setTopics(topics)).toObject());
}

export async function submitPlan(req, id) {
  const plan = await load(req, id);
  return withProgress((await plan.submit()).toObject());
}

export async function decidePlan(req, id, { approve, note }) {
  const plan = await load(req, id);
  const decided = await TeachingPlan.decide(plan._id, { approve, byUserId: getActor(req).id, note });
  return withProgress(decided.toObject());
}

export async function updateProgress(req, id, topicId, { status, completedOn }) {
  const plan = await load(req, id);
  const topic = plan.topics.id(topicId);
  if (!topic) throw new AppError('Topic not found', 404, undefined, 'NOT_FOUND');
  return withProgress((await plan.updateProgress(topic._id, status, completedOn)).toObject());
}

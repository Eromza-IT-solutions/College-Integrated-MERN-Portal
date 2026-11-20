import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import { REVIEW_STATUS_VALUES, TOPIC_STATUS_VALUES } from '../../utils/constants.js';

const objectId = (label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
  .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
const pageFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const startBody = z.object({
  subjectId: objectId('subjectId'),
  semester: z.number({ required_error: 'semester is required' }).int().min(1).max(12),
  academicYearId: objectId('academicYearId'),
}).strict();

const topic = z.object({
  weekNo: z.number({ required_error: 'weekNo is required' }).int().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  plannedHours: z.number().min(0).max(1000).optional(),
}).strict();

const topicsBody = z.object({ topics: z.array(topic).max(200) }).strict();
const decisionBody = z.object({
  approve: z.boolean({ required_error: 'approve is required', invalid_type_error: 'approve must be true or false' }),
  note: z.string().trim().max(300).optional(),
}).strict().superRefine((b, ctx) => {
  if (!b.approve && !b.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Say what needs to change' });
});
const progressBody = z.object({
  status: z.enum(TOPIC_STATUS_VALUES),
  completedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must look like 2026-11-16').optional(),
}).strict().superRefine((b, ctx) => {
  if (b.status === 'done' && !b.completedOn) ctx.addIssue({ code: 'custom', path: ['completedOn'], message: 'Give the date it was completed' });
});
const listQuery = z.object({
  subjectId: objectId('subjectId').optional(),
  academicYearId: objectId('academicYearId').optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(REVIEW_STATUS_VALUES).optional(),
  ...pageFields,
}).strict();
const idParam = objectId('id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  throw new AppError('Invalid request', 400, result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message })), 'VALIDATION_ERROR');
}

export { startBody, topicsBody, decisionBody, progressBody, listQuery, idParam, parse };

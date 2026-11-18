import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import { EXAM_STATUS_VALUES } from '../../utils/constants.js';

const objectId = (label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
  .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
const dateTime = (label) => z.string({ required_error: `${label} is required` })
  .refine((value) => !Number.isNaN(new Date(value).getTime()), `${label} is not a valid date`);
const pageFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const atLeastOne = (value) => Object.keys(value).length > 0;

const examBody = z.object({
  name: z.string().trim().min(1).max(160),
  academicYearId: objectId('academicYearId'),
  programId: objectId('programId'),
  semester: z.number({ required_error: 'semester is required' }).int().min(1).max(12),
  formOpensAt: dateTime('formOpensAt'),
  formClosesAt: dateTime('formClosesAt'),
}).strict();

const examUpdateBody = examBody.partial().extend({
  status: z.enum(EXAM_STATUS_VALUES).optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const examQuery = z.object({
  academicYearId: objectId('academicYearId').optional(),
  programId: objectId('programId').optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  status: z.enum(EXAM_STATUS_VALUES).optional(),
  ...pageFields,
}).strict();

const formQuery = z.object({
  examId: objectId('examId').optional(),
  studentId: objectId('studentId').optional(),
  status: z.string().trim().max(30).optional(),
  ...pageFields,
}).strict();

const subjectSelectionBody = z.object({
  subjectIds: z.array(objectId('subjectId')).min(1, 'Tick at least one subject').max(30),
}).strict();

const decisionBody = z.object({
  approve: z.boolean({ required_error: 'approve is required' }),
  note: z.string().trim().max(500).optional(),
}).strict();

const idParam = z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export { examBody, examUpdateBody, examQuery, formQuery, subjectSelectionBody, decisionBody, idParam, parse };

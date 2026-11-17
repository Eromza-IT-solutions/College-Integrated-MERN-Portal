import { z } from 'zod';
import AppError from '../../utils/AppError.js';

// Reports ke filters. Sab optional hain; jo report ke liye matlab ka nahi, wo ignore ho jata hai.
const objectId = (label) => z.string().regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must look like 2026-11-16');

const reportQuery = z.object({
  academicYearId: objectId('academicYearId').optional(),
  programId: objectId('programId').optional(),
  examId: objectId('examId').optional(),
  from: dateText.optional(),
  to: dateText.optional(),
  format: z.enum(['json', 'csv']).default('json'),
}).refine((q) => !q.from || !q.to || q.from <= q.to, { path: ['to'], message: '"to" must be on or after "from"' });

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ field: i.path.join('.') || 'query', message: i.message }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export { reportQuery, parse };

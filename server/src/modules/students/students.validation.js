import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import { STUDENT_STATUS_VALUES } from '../../utils/constants.js';

const objectId = (label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
  .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
const pageFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const atLeastOne = (o) => Object.keys(o).length > 0;
const division = z.string().trim().min(1).max(3).transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{1,3}$/, 'Division must be 1 to 3 letters or digits'));

const studentListQuery = z.object({
  search: z.string().trim().max(120).optional(),
  programId: objectId('programId').optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  division: division.optional(),
  status: z.enum(STUDENT_STATUS_VALUES).optional(),
  ...pageFields,
}).strict();

const studentUpdateBody = z.object({
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be 10 digits').optional(),
  division: division.optional(),
  currentSemester: z.number().int().min(1).max(12).optional(),
  yearOfStudy: z.number().int().min(1).max(10).optional(),
  status: z.enum(STUDENT_STATUS_VALUES).optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const enrollmentBody = z.object({
  subjectId: objectId('subjectId'),
  semester: z.number().int().min(1).max(12).optional(),
  academicYearId: objectId('academicYearId').optional(),
}).strict();

const promotionBody = z.object({
  academicYearId: objectId('academicYearId').optional(),
}).strict();

const idParam = objectId('id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export { studentListQuery, studentUpdateBody, enrollmentBody, promotionBody, idParam, parse };

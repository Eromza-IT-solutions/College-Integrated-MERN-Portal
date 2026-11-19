import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import {
  APPLICATION_STATUS_VALUES,
  DOCUMENT_TYPES_VALUES,
} from '../../utils/constants.js';

const objectId = (label) =>
  z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be text`,
    })
    .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);

const createBody = z
  .object({
    academicYearId: objectId('academicYearId'),
    programId: objectId('programId'),
    yearOfStudy: z.coerce.number().int().min(1).max(10).default(1),
  })
  .passthrough();

const formBody = z.object({}).passthrough();

const listQuery = z
  .object({
    status: z.enum(APPLICATION_STATUS_VALUES).optional(),
    academicYearId: objectId('academicYearId').optional(),
    programId: objectId('programId').optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const subjectsQuery = z
  .object({
    programId: objectId('programId'),
    yearOfStudy: z.coerce.number().int().min(1).max(10).default(1),
  })
  .strict();

const subjectPicks = z.record(z.string(), z.array(objectId('subjectId')));

const uploadBody = z
  .object({
    type: z.enum(DOCUMENT_TYPES_VALUES, {
      errorMap: () => ({
        message: `type must be one of: ${DOCUMENT_TYPES_VALUES.join(', ')}`,
      }),
    }),
    width: z.coerce.number().int().min(1).optional(),
    height: z.coerce.number().int().min(1).optional(),
  })
  .strict();

const decisionBody = z
  .object({
    approve: z.boolean({
      required_error: 'approve is required',
      invalid_type_error: 'approve must be true or false',
    }),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (!body.approve && !body.note) {
      ctx.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Say why the document was rejected',
      });
    }
  });

const waitlistBody = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const noteBody = (what) =>
  z
    .object({
      note: z
        .string({ required_error: `note is required` })
        .trim()
        .min(1, `Say why the form is being ${what}`)
        .max(500),
    })
    .strict();

const cancelBody = z
  .object({
    reason: z
      .string({ required_error: 'reason is required' })
      .trim()
      .min(1, 'Say why the admission is being cancelled')
      .max(500),
  })
  .strict();

const idParam = objectId('id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export {
  createBody,
  formBody,
  listQuery,
  subjectsQuery,
  subjectPicks,
  uploadBody,
  decisionBody,
  waitlistBody,
  noteBody,
  cancelBody,
  idParam,
  parse,
};

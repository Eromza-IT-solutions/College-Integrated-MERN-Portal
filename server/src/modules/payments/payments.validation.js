import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import { PAYMENT_PURPOSE_VALUES, PAYMENT_STATUS_VALUES } from '../../utils/constants.js';

// Checks what the browser sent, before any database work. A wrong shape is answered with 400 and the
// list of problems, in the same format as the rest of the API (code VALIDATION_ERROR).
const objectId = (label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
  .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);

const orderBody = z.object({
  purpose: z.enum(PAYMENT_PURPOSE_VALUES, { errorMap: () => ({ message: `purpose must be one of: ${PAYMENT_PURPOSE_VALUES.join(', ')}` }) }),
  applicationId: objectId('applicationId').optional(),
  examFormId: objectId('examFormId').optional(),
}).strict().superRefine((b, ctx) => {
  // The amount is NEVER taken from the browser: it comes from the fee structure on the server.
  if (b.purpose === 'admission' && !b.applicationId) ctx.addIssue({ code: 'custom', path: ['applicationId'], message: 'applicationId is required for an admission payment' });
  if (b.purpose === 'exam' && !b.examFormId) ctx.addIssue({ code: 'custom', path: ['examFormId'], message: 'examFormId is required for an exam payment' });
});

const verifyBody = z.object({
  gatewayPaymentId: z.string({ required_error: 'gatewayPaymentId is required' }).trim().min(1, 'gatewayPaymentId is required').max(100),
  signature: z.string({ required_error: 'signature is required' }).trim().min(1, 'signature is required').max(200),
}).strict();

const refundBody = z.object({
  paymentId: objectId('paymentId'),
  amountPaise: z.number({ required_error: 'amountPaise is required', invalid_type_error: 'amountPaise must be a number' })
    .int('amountPaise must be a whole number of paise').min(1, 'amountPaise must be more than zero'),
  reason: z.string({ required_error: 'reason is required' }).trim().min(3, 'Give a reason (at least 3 letters)').max(300),
}).strict();

const decisionBody = z.object({
  approve: z.boolean({ required_error: 'approve is required', invalid_type_error: 'approve must be true or false' }),
  note: z.string().trim().max(300).optional(),
}).strict().superRefine((b, ctx) => {
  if (!b.approve && !b.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Say why the refund was rejected' });
});

const listQuery = z.object({
  purpose: z.enum(PAYMENT_PURPOSE_VALUES, { errorMap: () => ({ message: `purpose must be one of: ${PAYMENT_PURPOSE_VALUES.join(', ')}` }) }),
  status: z.enum([...PAYMENT_STATUS_VALUES, 'requested', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParam = objectId('id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export { orderBody, verifyBody, refundBody, decisionBody, listQuery, idParam, parse };

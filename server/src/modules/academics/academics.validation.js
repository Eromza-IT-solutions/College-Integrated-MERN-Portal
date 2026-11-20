import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import { ATTENDANCE_STATUS_VALUES, REVIEW_STATUS_VALUES, TEACHING_RULES } from '../../utils/constants.js';

// Browser jo bhejta hai usko database ke kaam se PEHLE check karte hain.
// Galat shape par 400 + problems ki list jaati hai (code VALIDATION_ERROR), baaki API jaisa hi.
const objectId = (label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
  .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 09:30');
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must look like 2026-11-16');
const halfMark = (label) => z.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`).multipleOf(0.5, 'Marks go in steps of 0.5');
const pageFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const atLeastOne = (o) => Object.keys(o).length > 0;

// ---------- Timetable ----------
const slotBody = z.object({
  academicYearId: objectId('academicYearId'),
  programId: objectId('programId'),
  semester: z.number({ required_error: 'semester is required' }).int().min(1).max(12),
  division: z.string().trim().min(1).max(TEACHING_RULES.maxDivisionLength).default('A'),
  subjectId: objectId('subjectId'),
  teacherUserId: objectId('teacherUserId'),
  dayOfWeek: z.number({ required_error: 'dayOfWeek is required' }).int().min(1, 'dayOfWeek must be 1 (Monday) to 7 (Sunday)').max(7, 'dayOfWeek must be 1 (Monday) to 7 (Sunday)'),
  period: z.number({ required_error: 'period is required' }).int().min(1).max(TEACHING_RULES.maxPeriod),
  startTime: hhmm.optional(),
  endTime: hhmm.optional(),
  room: z.string().trim().max(40).optional(),
}).strict();

const slotUpdateBody = z.object({
  teacherUserId: objectId('teacherUserId').optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  period: z.number().int().min(1).max(TEACHING_RULES.maxPeriod).optional(),
  startTime: hhmm.optional(),
  endTime: hhmm.optional(),
  room: z.string().trim().max(40).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(atLeastOne, 'Send at least one field to change');

const slotQuery = z.object({
  academicYearId: objectId('academicYearId').optional(),
  programId: objectId('programId').optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  division: z.string().trim().min(1).max(TEACHING_RULES.maxDivisionLength).transform((v) => v.toUpperCase()).optional(),
  teacherUserId: objectId('teacherUserId').optional(),
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
  ...pageFields,
});

// ---------- Attendance ----------
const rosterQuery = z.object({ slotId: objectId('slotId'), lectureDate: dateText.optional() });

const markBody = z.object({
  slotId: objectId('slotId'),
  lectureDate: dateText,
  // Jo student list me nahi hoga woh "absent" ginega (model ka rule), isliye sirf present/leave bhejna kaafi hai.
  records: z.array(z.object({
    studentId: objectId('studentId'),
    status: z.enum(ATTENDANCE_STATUS_VALUES, { errorMap: () => ({ message: `status must be one of: ${ATTENDANCE_STATUS_VALUES.join(', ')}` }) }),
  }).strict()).max(500),
}).strict();

const registerQuery = z.object({
  slotId: objectId('slotId').optional(),
  subjectId: objectId('subjectId').optional(),
  from: dateText.optional(),
  to: dateText.optional(),
  ...pageFields,
});

const summaryQuery = z.object({
  studentId: objectId('studentId').optional(),
  subjectId: objectId('subjectId').optional(),
  academicYearId: objectId('academicYearId').optional(),
});

// ---------- Marks (internal marks) ----------
const marksEnterBody = z.object({
  subjectId: objectId('subjectId'),
  semester: z.number({ required_error: 'semester is required' }).int().min(1).max(12),
  academicYearId: objectId('academicYearId'),
  component: z.string({ required_error: 'component is required' }).trim().min(1, 'component is required').max(60),
  outOf: z.number({ required_error: 'outOf is required' }).min(0.5).max(1000).multipleOf(0.5, 'Marks go in steps of 0.5'),
  entries: z.array(z.object({ studentId: objectId('studentId'), obtained: halfMark('obtained') }).strict()).min(1, 'Send at least one student').max(200),
}).strict();

const idList = z.array(objectId('id')).min(1, 'Send at least one id').max(500);
const marksSubmitBody = z.object({ ids: idList }).strict();
const marksDecisionBody = z.object({
  ids: idList,
  approve: z.boolean({ required_error: 'approve is required', invalid_type_error: 'approve must be true or false' }),
  note: z.string().trim().max(300).optional(),
}).strict().superRefine((b, ctx) => {
  if (!b.approve && !b.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Say what needs to change' });
});

const marksQuery = z.object({
  subjectId: objectId('subjectId').optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  academicYearId: objectId('academicYearId').optional(),
  studentId: objectId('studentId').optional(),
  status: z.enum(REVIEW_STATUS_VALUES).optional(),
  ...pageFields,
});

// ---------- Results (exam results) ----------
const resultOpenBody = z.object({ examFormId: objectId('examFormId') }).strict();

const resultMarksBody = z.object({
  entries: z.array(z.object({
    subjectId: objectId('subjectId'),
    internalMarks: halfMark('internalMarks').optional(),
    externalMarks: halfMark('externalMarks').optional(),
    absent: z.boolean().optional(),
    maxInternal: halfMark('maxInternal').optional(),
    maxExternal: halfMark('maxExternal').optional(),
  }).strict().superRefine((e, ctx) => {
    if (e.absent && (e.internalMarks != null || e.externalMarks != null)) ctx.addIssue({ code: 'custom', path: ['absent'], message: 'An absent student has no marks' });
  })).min(1, 'Send at least one subject').max(30),
}).strict();

const resultPublishExamBody = z.object({ examId: objectId('examId') }).strict();
const resultUnpublishBody = z.object({ reason: z.string({ required_error: 'reason is required' }).trim().min(3, 'Give a reason (at least 3 letters)').max(300) }).strict();

const resultQuery = z.object({
  examId: objectId('examId').optional(),
  studentId: objectId('studentId').optional(),
  isPublished: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  ...pageFields,
});

const idParam = objectId('id');

function parse(schema, input) {
  const result = schema.safeParse(input === undefined ? {} : input);
  if (result.success) return result.data;
  const errors = result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
  throw new AppError('Invalid request', 400, errors, 'VALIDATION_ERROR');
}

export {
  slotBody, slotUpdateBody, slotQuery,
  rosterQuery, markBody, registerQuery, summaryQuery,
  marksEnterBody, marksSubmitBody, marksDecisionBody, marksQuery,
  resultOpenBody, resultMarksBody, resultPublishExamBody, resultUnpublishBody, resultQuery,
  idParam, parse,
};

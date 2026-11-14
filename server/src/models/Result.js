import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { evaluate } from '../utils/resultRules.js';
import {
  EXAM_FORM_STATUS, RESULT_CLASS_VALUES, RESULT_LINE_STATUS_VALUES, RESULT_RULES, SUBJECT_CATEGORIES,
} from '../utils/constants.js';

const { Schema } = mongoose;

// Marks allowed in steps of half a mark.
const marks = { type: Number, min: 0, validate: { validator: (v) => v == null || Number.isInteger(v * 2), message: 'Marks go in steps of 0.5' } };

// One student's result for one exam: a line for every subject on the approved exam form.
// The Examination Admin enters the marks; totals, subject results and the class are worked out automatically.
// A student sees the result only after it is published.
const resultSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    examFormId: { type: Schema.Types.ObjectId, ref: 'ExamForm', required: true },
    // Copied from the exam form for printing.
    enrollmentNumber: String,
    fullName: String,
    semester: Number,
    lines: [
      new Schema(
        {
          subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
          code: String, name: String, category: { type: String, enum: SUBJECT_CATEGORIES },
          maxInternal: { type: Number, min: 0, required: true },
          maxExternal: { type: Number, min: 0, required: true },
          internalMarks: marks,
          externalMarks: marks,
          absent: { type: Boolean, default: false },
          // Worked out, never typed in:
          total: Number, max: Number, status: { type: String, enum: RESULT_LINE_STATUS_VALUES },
        },
        { _id: false }
      ),
    ],
    // Worked out, never typed in:
    totalObtained: Number,
    totalMax: Number,
    percentage: Number,
    failedSubjects: { type: Number, default: 0 },
    resultClass: { type: String, enum: RESULT_CLASS_VALUES },
    isComplete: { type: Boolean, default: false, index: true },

    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: Date,
    publishedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastEditedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    unpublishReason: { type: String, trim: true },
  },
  { timestamps: true }
);

resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

resultSchema.pre('validate', function calculate() {
  const seen = new Set();
  this.lines.forEach((line, i) => {
    const key = String(line.subjectId);
    if (seen.has(key)) this.invalidate(`lines.${i}.subjectId`, 'A subject appears twice');
    seen.add(key);
    if (line.internalMarks != null && line.internalMarks > line.maxInternal) this.invalidate(`lines.${i}.internalMarks`, 'Internal marks are more than the maximum');
    if (line.externalMarks != null && line.externalMarks > line.maxExternal) this.invalidate(`lines.${i}.externalMarks`, 'External marks are more than the maximum');
    if (line.absent && (line.internalMarks != null || line.externalMarks != null)) this.invalidate(`lines.${i}.absent`, 'An absent student has no marks');
  });
  const r = evaluate(this.lines.map((l) => ({
    maxInternal: l.maxInternal, maxExternal: l.maxExternal, internalMarks: l.internalMarks, externalMarks: l.externalMarks, absent: l.absent,
  })));
  r.lines.forEach((x, i) => { this.lines[i].total = x.total; this.lines[i].max = x.max; this.lines[i].status = x.status; });
  this.totalObtained = r.totalObtained;
  this.totalMax = r.totalMax;
  this.percentage = r.percentage;
  this.failedSubjects = r.failedSubjects;
  this.resultClass = r.resultClass || undefined;
  this.isComplete = r.isComplete;
  if (this.isPublished && !r.isComplete) this.invalidate('isPublished', 'An incomplete result cannot be published');
});

/**
 * Open the result sheet for a student whose exam form was approved: one line per ticked subject, marks still empty.
 * Maximum marks start at the proposed defaults (RESULT_RULES) and can be changed per subject. Returns the existing sheet if there is one.
 */
resultSchema.statics.openForApprovedForm = async function openForApprovedForm(examFormId, { session } = {}) {
  const s = session || null;
  const form = await this.db.model('ExamForm').findById(examFormId).session(s);
  if (!form) throw new AppError('Exam form not found', 404);
  if (form.status !== EXAM_FORM_STATUS.APPROVED) throw new AppError('A result sheet is opened only for an approved exam form', 409);
  const existing = await this.findOne({ examId: form.examId, studentId: form.studentId }).session(s);
  if (existing) return existing;
  const [sheet] = await this.create(
    [{
      examId: form.examId, studentId: form.studentId, examFormId: form._id,
      enrollmentNumber: form.details.enrollmentNumber, fullName: form.details.fullName, semester: form.details.semester,
      lines: form.subjects.map((x) => ({
        subjectId: x.subjectId, code: x.code, name: x.name, category: x.category,
        maxInternal: RESULT_RULES.defaultMaxInternal, maxExternal: RESULT_RULES.defaultMaxExternal,
      })),
    }],
    { session }
  );
  return sheet;
};

function assertNotPublished(sheet) {
  if (sheet.isPublished) throw new AppError('A published result must be unpublished before it is changed', 409);
}

/**
 * Enter or correct marks. entries: [{ subjectId, internalMarks, externalMarks, absent }].
 * Only the subjects named are changed. Not allowed once the result is published.
 */
resultSchema.methods.enterMarks = async function enterMarks(entries, { byUserId, session } = {}) {
  assertNotPublished(this);
  for (const e of entries) {
    const line = this.lines.find((l) => String(l.subjectId) === String(e.subjectId));
    if (!line) throw new AppError(`Subject ${e.subjectId} is not on this result`, 400);
    line.absent = !!e.absent;
    line.internalMarks = e.absent ? undefined : e.internalMarks;
    line.externalMarks = e.absent ? undefined : e.externalMarks;
    if (e.maxInternal != null) line.maxInternal = e.maxInternal;
    if (e.maxExternal != null) line.maxExternal = e.maxExternal;
  }
  this.lastEditedByUserId = byUserId || null;
  return this.save({ session });
};

/** Publish one finished result so the student can see it. */
resultSchema.statics.publish = async function publish(id, { byUserId, session } = {}) {
  const published = await this.findOneAndUpdate(
    { _id: id, isPublished: false, isComplete: true },
    { $set: { isPublished: true, publishedAt: new Date(), publishedByUserId: byUserId }, $unset: { unpublishReason: '' } },
    { new: true, session }
  );
  if (published) return published;
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Result not found', 404);
  if (current.isPublished) return current; // already published: nothing to do
  throw new AppError('Enter all marks before publishing', 409);
};

/** Publish every finished, unpublished result of an exam. Incomplete ones are left alone and counted. */
resultSchema.statics.publishExam = async function publishExam(examId, { byUserId, session } = {}) {
  const r = await this.updateMany(
    { examId, isPublished: false, isComplete: true },
    { $set: { isPublished: true, publishedAt: new Date(), publishedByUserId: byUserId } },
    { session }
  );
  const incomplete = await this.countDocuments({ examId, isComplete: false }).session(session || null);
  return { published: r.modifiedCount, incomplete };
};

/** Take a result back (to correct a mistake). A reason is required and is kept. */
resultSchema.statics.unpublish = async function unpublish(id, { reason, session } = {}) {
  if (!reason) throw new AppError('Say why the result is being unpublished', 400);
  const updated = await this.findOneAndUpdate(
    { _id: id, isPublished: true },
    { $set: { isPublished: false, unpublishReason: reason }, $unset: { publishedAt: '' } },
    { new: true, session }
  );
  if (updated) return updated;
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Result not found', 404);
  throw new AppError('The result is not published', 409);
};

/** What a student may see: only published results. */
resultSchema.statics.publishedFor = function publishedFor(studentId) {
  return this.find({ studentId, isPublished: true }).sort({ publishedAt: -1 });
};

export default mongoose.model('Result', resultSchema);

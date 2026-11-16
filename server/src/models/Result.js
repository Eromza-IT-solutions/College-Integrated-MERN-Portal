import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { evaluate, cgpa } from '../utils/resultRules.js';
import {
  EXAM_FORM_STATUS, RESULT_OUTCOME_VALUES, RESULT_LINE_STATUS_VALUES, GRADE_LETTERS, GRADING, SUBJECT_CATEGORIES,
} from '../utils/constants.js';

const { Schema } = mongoose;

// Marks allowed in steps of half a mark.
const marks = { type: Number, min: 0, validate: { validator: (v) => v == null || Number.isInteger(v * 2), message: 'Marks go in steps of 0.5' } };

// One student's result for one exam: a line for every subject on the approved exam form.
// The Examination Admin enters the marks; totals, grades, SGPA and the pass/fail outcome are worked out automatically
// by the college's CBCS credit system (see utils/resultRules.js).
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
          maxInternal: { type: Number, min: 0, required: true }, // CIE maximum
          maxExternal: { type: Number, min: 0, required: true }, // SEE maximum
          credits: { type: Number, min: 0, default: 0 },
          countsForCgpa: { type: Boolean, default: true },
          internalMarks: marks,
          externalMarks: marks,
          absent: { type: Boolean, default: false },
          // Worked out, never typed in:
          total: Number, max: Number, percent: Number,
          status: { type: String, enum: RESULT_LINE_STATUS_VALUES },
          grade: { type: String, enum: GRADE_LETTERS },
          gradePoint: Number,
          creditsEarned: { type: Number, default: 0 },
        },
        { _id: false }
      ),
    ],
    // Worked out, never typed in:
    totalObtained: Number,
    totalMax: Number,
    percentage: Number,
    failedSubjects: { type: Number, default: 0 },
    outcome: { type: String, enum: RESULT_OUTCOME_VALUES },
    sgpa: Number,
    finalGrade: { type: String, enum: GRADE_LETTERS },
    creditsTotal: { type: Number, default: 0 },
    creditsEarned: { type: Number, default: 0 },
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
    credits: l.credits, countsForCgpa: l.countsForCgpa,
  })));
  r.lines.forEach((x, i) => {
    const l = this.lines[i];
    l.total = x.total; l.max = x.max; l.percent = x.percent; l.status = x.status;
    l.grade = x.grade; l.gradePoint = x.gradePoint; l.creditsEarned = x.creditsEarned;
  });
  this.totalObtained = r.totalObtained;
  this.totalMax = r.totalMax;
  this.percentage = r.percentage;
  this.failedSubjects = r.failedSubjects;
  this.outcome = r.outcome || undefined;
  this.sgpa = r.sgpa == null ? undefined : r.sgpa;
  this.finalGrade = r.finalGrade || undefined;
  this.creditsTotal = r.creditsTotal;
  this.creditsEarned = r.creditsEarned;
  this.isComplete = r.isComplete;
  if (this.isPublished && !r.isComplete) this.invalidate('isPublished', 'An incomplete result cannot be published');
});

/**
 * Open the result sheet for a student whose exam form was approved: one line per ticked subject, marks still empty.
 * Maximum marks (CIE and SEE), credits and the CGPA flag are copied from each Subject; a subject that cannot be found gets the
 * proposed defaults (GRADING). They can be changed per line when marks are entered. Returns the existing sheet if there is one.
 */
resultSchema.statics.openForApprovedForm = async function openForApprovedForm(examFormId, { session } = {}) {
  const s = session || null;
  const form = await this.db.model('ExamForm').findById(examFormId).session(s);
  if (!form) throw new AppError('Exam form not found', 404);
  if (form.status !== EXAM_FORM_STATUS.APPROVED) throw new AppError('A result sheet is opened only for an approved exam form', 409);
  const existing = await this.findOne({ examId: form.examId, studentId: form.studentId }).session(s);
  if (existing) return existing;
  const subjectDocs = await this.db.model('Subject').find({ _id: { $in: form.subjects.map((x) => x.subjectId) } }).session(s);
  const subjectById = new Map((subjectDocs || []).map((d) => [String(d._id), d]));
  const [sheet] = await this.create(
    [{
      examId: form.examId, studentId: form.studentId, examFormId: form._id,
      enrollmentNumber: form.details.enrollmentNumber, fullName: form.details.fullName, semester: form.details.semester,
      lines: form.subjects.map((x) => {
        const sub = subjectById.get(String(x.subjectId)) || {};
        const pick = (v, d) => (v == null ? d : v);
        return {
          subjectId: x.subjectId, code: x.code, name: x.name, category: x.category,
          maxInternal: pick(sub.maxInternal, GRADING.defaultMaxInternal),
          maxExternal: pick(sub.maxExternal, GRADING.defaultMaxExternal),
          credits: pick(sub.credits, GRADING.defaultCredits),
          countsForCgpa: sub.countsForCgpa !== false,
        };
      }),
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
    if (e.credits != null) line.credits = e.credits;
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

/**
 * Cumulative grade point average (CGPA) over everything the student has published so far.
 * If a subject was written again, only its latest published line counts. Returns { cgpa, finalGrade, credits, subjects }.
 */
resultSchema.statics.cgpaFor = async function cgpaFor(studentId) {
  const sheets = await this.find({ studentId, isPublished: true }).sort({ publishedAt: 1 });
  const latest = new Map();
  for (const sheet of sheets) for (const l of sheet.lines) latest.set(String(l.subjectId), l); // later sheets overwrite earlier ones
  const lines = [...latest.values()];
  return { ...cgpa(lines), subjects: lines.length };
};

export default mongoose.model('Result', resultSchema);

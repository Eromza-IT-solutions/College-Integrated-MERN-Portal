import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { REVIEW_STATUS, REVIEW_STATUS_VALUES, ENROLLMENT_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;

// Internal marks a teacher enters during the semester (test, assignment, practical ...), one row per student per component.
// These are not the final exam result (see Result). Flow: draft -> submitted -> approved by the HOD, or returned for changes.
const marksSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    component: { type: String, required: true, trim: true }, // for example "Internal Test 1", "Assignment", "Practical"
    obtained: { type: Number, required: true, min: 0, validate: { validator: (v) => Number.isInteger(v * 2), message: 'Marks go in steps of 0.5' } },
    outOf: { type: Number, required: true, min: 0.5, validate: { validator: (v) => Number.isInteger(v * 2), message: 'Marks go in steps of 0.5' } },
    enteredByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: REVIEW_STATUS_VALUES, default: REVIEW_STATUS.DRAFT, index: true },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true }
);

marksSchema.index({ studentId: 1, subjectId: 1, semester: 1, academicYearId: 1, component: 1 }, { unique: true });

marksSchema.pre('validate', function check() {
  if (this.obtained != null && this.outOf != null && this.obtained > this.outOf) this.invalidate('obtained', 'Marks obtained cannot be more than the maximum');
});

const EDITABLE = [REVIEW_STATUS.DRAFT, REVIEW_STATUS.RETURNED];

/**
 * Enter (or correct) one student's marks for one component. Checks that the teacher teaches the subject and that the
 * student is enrolled in it. A mark that is submitted or approved cannot be changed here.
 */
marksSchema.statics.enter = async function enter(
  { studentId, subjectId, semester, academicYearId, component, obtained, outOf, byUserId },
  { session } = {}
) {
  const s = session || null;
  if (!(await this.db.model('Timetable').teaches({ teacherUserId: byUserId, subjectId, semester, academicYearId }, { session }))) {
    throw new AppError('You can enter marks only for the subjects you teach', 403);
  }
  const enrolled = await this.db.model('Enrollment').findOne({ studentId, subjectId, semester, academicYearId, status: ENROLLMENT_STATUS.ENROLLED }).session(s);
  if (!enrolled) throw new AppError('The student is not enrolled in this subject', 400);
  const subject = await this.db.model('Subject').findById(subjectId).session(s);
  const program = await this.db.model('Program').findById(subject.programId).session(s);

  const key = { studentId, subjectId, semester, academicYearId, component: String(component || '').trim() };
  const existing = await this.findOne(key).session(s);
  if (existing) {
    if (!EDITABLE.includes(existing.status)) throw new AppError(`A ${existing.status} mark cannot be changed`, 409);
    existing.obtained = obtained;
    existing.outOf = outOf;
    existing.enteredByUserId = byUserId;
    return existing.save({ session });
  }
  const [row] = await this.create([{ ...key, programId: subject.programId, departmentId: program.departmentId, obtained, outOf, enteredByUserId: byUserId }], { session });
  return row;
};

/** The teacher sends their draft (or returned) marks for approval. Returns how many were sent. */
marksSchema.statics.submitMany = async function submitMany(ids, { byUserId, session } = {}) {
  const r = await this.updateMany(
    { _id: { $in: ids }, enteredByUserId: byUserId, status: { $in: EDITABLE } },
    { $set: { status: REVIEW_STATUS.SUBMITTED }, $unset: { reviewNote: '' } },
    { session }
  );
  return { submitted: r.modifiedCount, skipped: ids.length - r.modifiedCount };
};

/**
 * The HOD approves or returns submitted marks. Returning needs a note. Per the team's decision a HOD approves their own
 * marks. Returns how many were decided; marks that were not "submitted" are skipped.
 */
marksSchema.statics.decideMany = async function decideMany(ids, { approve, byUserId, note }, { session } = {}) {
  if (!approve && !note) throw new AppError('Say what needs to change', 400);
  const r = await this.updateMany(
    { _id: { $in: ids }, status: REVIEW_STATUS.SUBMITTED },
    { $set: { status: approve ? REVIEW_STATUS.APPROVED : REVIEW_STATUS.RETURNED, reviewedByUserId: byUserId, reviewedAt: new Date(), reviewNote: note } },
    { session }
  );
  return { decided: r.modifiedCount, skipped: ids.length - r.modifiedCount };
};

export default mongoose.model('Marks', marksSchema);

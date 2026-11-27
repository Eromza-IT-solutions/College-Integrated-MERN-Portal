import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { REVIEW_STATUS, REVIEW_STATUS_VALUES, TOPIC_STATUS, TOPIC_STATUS_VALUES } from '../utils/constants.js';

const { Schema } = mongoose;

// A teacher's plan for one subject in one semester: the topics to cover, week by week.
//   draft -> submitted -> approved (by the HOD)  or  returned (for changes) -> submitted again ...
// After approval the teacher can still tick topics off as they are taught (progress).
const teachingPlanSchema = new Schema(
  {
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    topics: [
      new Schema(
        {
          weekNo: { type: Number, required: true, min: 1, max: 60, validate: { validator: Number.isInteger, message: 'Week must be a whole number' } },
          title: { type: String, required: true, trim: true },
          plannedHours: { type: Number, min: 0 },
          status: { type: String, enum: TOPIC_STATUS_VALUES, default: TOPIC_STATUS.PLANNED },
          completedOn: String, // "2026-11-16"
        }
      ),
    ],
    status: { type: String, enum: REVIEW_STATUS_VALUES, default: REVIEW_STATUS.DRAFT, index: true },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true }
);

teachingPlanSchema.index({ academicYearId: 1, teacherUserId: 1, subjectId: 1, semester: 1 }, { unique: true });

const EDITABLE = [REVIEW_STATUS.DRAFT, REVIEW_STATUS.RETURNED];

/** Start a plan. The teacher must teach the subject (have a timetable slot for it). */
teachingPlanSchema.statics.start = async function start({ teacherUserId, subjectId, semester, academicYearId }, { session } = {}) {
  const s = session || null;
  const subject = await this.db.model('Subject').findById(subjectId).session(s);
  if (!subject) throw new AppError('Subject not found', 404);
  if (subject.semester !== semester) throw new AppError('This subject is not taught in that semester', 400);
  if (!(await this.db.model('Timetable').teaches({ teacherUserId, subjectId, semester, academicYearId }, { session }))) {
    throw new AppError('You can plan only the subjects you teach', 403);
  }
  const program = await this.db.model('Program').findById(subject.programId).session(s);
  const [plan] = await this.create([{ teacherUserId, subjectId, semester, academicYearId, programId: subject.programId, departmentId: program.departmentId }], { session });
  return plan;
};

/** Replace the topic list. Only while the plan is a draft or returned. */
teachingPlanSchema.methods.setTopics = async function setTopics(topics, { session } = {}) {
  if (!EDITABLE.includes(this.status)) throw new AppError(`A ${this.status} plan cannot be changed`, 409);
  this.topics = (topics || []).map((t) => ({ weekNo: t.weekNo, title: t.title, plannedHours: t.plannedHours }));
  return this.save({ session });
};

teachingPlanSchema.methods.submit = async function submit({ session } = {}) {
  if (!EDITABLE.includes(this.status)) throw new AppError(`A ${this.status} plan cannot be submitted`, 409);
  if (!this.topics.length) throw new AppError('Add at least one topic first', 400);
  this.status = REVIEW_STATUS.SUBMITTED;
  this.reviewNote = undefined;
  return this.save({ session });
};

/**
 * The HOD approves or returns a submitted plan. Returning needs a note. Per the team's decision a HOD approves their own
 * plan; a teacher cannot approve anything (the permission check stops that before it gets here).
 */
teachingPlanSchema.statics.decide = async function decide(id, { approve, byUserId, note }, { session } = {}) {
  if (!approve && !note) throw new AppError('Say what needs to change', 400);
  const done = await this.findOneAndUpdate(
    { _id: id, status: REVIEW_STATUS.SUBMITTED },
    { $set: { status: approve ? REVIEW_STATUS.APPROVED : REVIEW_STATUS.RETURNED, reviewedByUserId: byUserId, reviewedAt: new Date(), reviewNote: note } },
    { new: true, session }
  );
  if (done) return done;
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Plan not found', 404);
  throw new AppError(`A ${current.status} plan cannot be decided`, 409);
};

/** Tick a topic as in progress or done. Allowed once the plan is approved. */
teachingPlanSchema.methods.updateProgress = async function updateProgress(topicId, status, completedOn, { session } = {}) {
  if (this.status !== REVIEW_STATUS.APPROVED) throw new AppError('Progress can be recorded once the plan is approved', 409);
  const topic = this.topics.id(topicId);
  if (!topic) throw new AppError('Topic not found', 404);
  if (!TOPIC_STATUS_VALUES.includes(status)) throw new AppError('Status must be planned, inProgress or done', 400);
  topic.status = status;
  topic.completedOn = status === TOPIC_STATUS.DONE ? completedOn : undefined;
  return this.save({ session });
};

/** Share of topics done, in percent. */
teachingPlanSchema.methods.progressPercent = function progressPercent() {
  if (!this.topics.length) return 0;
  return Math.round((this.topics.filter((t) => t.status === TOPIC_STATUS.DONE).length * 10000) / this.topics.length) / 100;
};

export default mongoose.model('TeachingPlan', teachingPlanSchema);

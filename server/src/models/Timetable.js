import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { TEACHING_RULES } from '../utils/constants.js';

const { Schema } = mongoose;

// One lecture slot in the weekly timetable: this teacher takes this subject for this class division in this period.
// It is also the record of who teaches what: a teacher can take attendance and enter internal marks only for subjects
// they have a slot for.
const timetableSchema = new Schema(
  {
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true }, // the class's department
    semester: { type: Number, required: true, min: 1, max: 12 },
    division: { type: String, required: true, trim: true, uppercase: true, maxlength: TEACHING_RULES.maxDivisionLength, default: 'A' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 7, validate: { validator: Number.isInteger, message: 'Day must be a whole number' } }, // 1 Monday ... 7 Sunday
    period: { type: Number, required: true, min: 1, max: TEACHING_RULES.maxPeriod, validate: { validator: Number.isInteger, message: 'Period must be a whole number' } },
    startTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 09:30'] },
    endTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 09:30'] },
    room: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A class division has one lecture in a period, and a teacher is in one place in a period (active slots only).
const active = { partialFilterExpression: { isActive: true } };
timetableSchema.index({ academicYearId: 1, programId: 1, semester: 1, division: 1, dayOfWeek: 1, period: 1 }, { unique: true, ...active });
timetableSchema.index({ academicYearId: 1, teacherUserId: 1, dayOfWeek: 1, period: 1 }, { unique: true, ...active });

timetableSchema.pre('validate', function checkTimes() {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) this.invalidate('endTime', 'The lecture must end after it starts');
});

/**
 * Add a slot. Fills the department from the class, checks the subject belongs to that class and semester, and checks the
 * teacher account is a teacher or HOD of that department.
 */
timetableSchema.statics.addSlot = async function addSlot(data, { session } = {}) {
  const s = session || null;
  const [program, subject, teacher] = await Promise.all([
    this.db.model('Program').findById(data.programId).session(s),
    this.db.model('Subject').findById(data.subjectId).session(s),
    this.db.model('User').findById(data.teacherUserId).session(s),
  ]);
  if (!program) throw new AppError('Class not found', 404);
  if (!subject) throw new AppError('Subject not found', 404);
  if (String(subject.programId) !== String(program._id) || subject.semester !== Number(data.semester)) {
    throw new AppError('This subject is not taught in that class and semester', 400);
  }
  if (!teacher || !['teacher', 'hod'].includes(teacher.role)) throw new AppError('The teacher account was not found', 404);
  if (String(teacher.departmentId) !== String(program.departmentId)) throw new AppError('The teacher belongs to another department', 400);
  const [slot] = await this.create([{ ...data, departmentId: program.departmentId }], { session });
  return slot;
};

/** Does this teacher teach this subject (in that class, semester and year)? Used before attendance and marks. */
timetableSchema.statics.teaches = async function teaches({ teacherUserId, subjectId, semester, academicYearId }, { session } = {}) {
  const found = await this.findOne({ teacherUserId, subjectId, semester, academicYearId, isActive: true }).session(session || null);
  return !!found;
};

export default mongoose.model('Timetable', timetableSchema);

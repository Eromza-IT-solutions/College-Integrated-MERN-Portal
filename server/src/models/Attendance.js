import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_VALUES, ENROLLMENT_STATUS, STUDENT_STATUS, TEACHING_RULES } from '../utils/constants.js';
import { isValidDateString, todayAtCollege, weekdayOf, daysBetween } from '../utils/dates.js';

const { Schema } = mongoose;

// The attendance register of one lecture: who was present, absent or on leave.
// One record per timetable slot per date.
const attendanceSchema = new Schema(
  {
    slotId: { type: Schema.Types.ObjectId, ref: 'Timetable', required: true },
    lectureDate: { type: String, required: true, validate: { validator: isValidDateString, message: 'Date must look like 2026-11-16' } },
    // Copied from the slot so lists and department views need no lookups.
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    semester: { type: Number, required: true },
    division: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    period: { type: Number, required: true },
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // who took the lecture
    records: [new Schema({ studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, status: { type: String, enum: ATTENDANCE_STATUS_VALUES, required: true } }, { _id: false })],
    markedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ slotId: 1, lectureDate: 1 }, { unique: true });
attendanceSchema.index({ 'records.studentId': 1, subjectId: 1 });

attendanceSchema.pre('validate', function noDuplicateStudents() {
  const seen = new Set();
  this.records.forEach((r, i) => {
    const k = String(r.studentId);
    if (seen.has(k)) this.invalidate(`records.${i}.studentId`, 'A student appears twice');
    seen.add(k);
  });
});

/** The students who attend this slot's lectures: enrolled in the subject this semester, active, and in the slot's division. */
attendanceSchema.statics.rosterForSlot = async function rosterForSlot(slot, { session } = {}) {
  const s = session || null;
  const enrolled = await this.db.model('Enrollment')
    .find({ subjectId: slot.subjectId, semester: slot.semester, academicYearId: slot.academicYearId, status: ENROLLMENT_STATUS.ENROLLED }).session(s);
  return this.db.model('Student')
    .find({ _id: { $in: enrolled.map((e) => e.studentId) }, programId: slot.programId, division: slot.division, status: STUDENT_STATUS.ACTIVE }).session(s);
};

/**
 * Take (or correct) the attendance of one lecture. records: [{ studentId, status }] — students not listed are
 * recorded as absent, so the register is always complete.
 * Rules: only the slot's teacher; the date must fall on the slot's weekday, not be in the future, and not be older than
 * the correction limit (TEACHING_RULES.attendanceEditDays).
 */
attendanceSchema.statics.mark = async function mark({ slotId, lectureDate, records, byUserId }, { session, now = new Date() } = {}) {
  const s = session || null;
  const slot = await this.db.model('Timetable').findById(slotId).session(s);
  if (!slot || !slot.isActive) throw new AppError('Lecture slot not found', 404);
  if (String(slot.teacherUserId) !== String(byUserId)) throw new AppError('Only the teacher of this lecture can take its attendance', 403);
  if (!isValidDateString(lectureDate)) throw new AppError('Date must look like 2026-11-16', 400);
  if (weekdayOf(lectureDate) !== slot.dayOfWeek) throw new AppError('This lecture is not held on that day of the week', 400);
  const today = todayAtCollege(now);
  if (lectureDate > today) throw new AppError('Attendance cannot be taken for a future date', 400);
  if (daysBetween(lectureDate, today) > TEACHING_RULES.attendanceEditDays) throw new AppError('This lecture is too old to change', 409);

  const roster = await this.rosterForSlot(slot, { session });
  const rosterIds = new Set(roster.map((r) => String(r._id)));
  const given = new Map();
  for (const r of records || []) {
    if (!rosterIds.has(String(r.studentId))) throw new AppError('A student in the list does not attend this lecture', 400);
    if (!ATTENDANCE_STATUS_VALUES.includes(r.status)) throw new AppError('Status must be present, absent or leave', 400);
    given.set(String(r.studentId), r.status);
  }
  const full = roster.map((r) => ({ studentId: r._id, status: given.get(String(r._id)) || ATTENDANCE_STATUS.ABSENT }));

  const doc = await this.findOneAndUpdate(
    { slotId, lectureDate },
    {
      $set: {
        academicYearId: slot.academicYearId, programId: slot.programId, departmentId: slot.departmentId, semester: slot.semester,
        division: slot.division, subjectId: slot.subjectId, period: slot.period, teacherUserId: slot.teacherUserId,
        records: full, markedByUserId: byUserId,
      },
    },
    { upsert: true, new: true, runValidators: true, session, setDefaultsOnInsert: true }
  );
  return doc;
};

/** A student's attendance in a subject (or all subjects): lectures held, present, and the percentage. */
attendanceSchema.statics.summaryForStudent = async function summaryForStudent(studentId, { subjectId, academicYearId } = {}) {
  const match = { 'records.studentId': new mongoose.Types.ObjectId(String(studentId)) };
  if (subjectId) match.subjectId = new mongoose.Types.ObjectId(String(subjectId));
  if (academicYearId) match.academicYearId = new mongoose.Types.ObjectId(String(academicYearId));
  const rows = await this.aggregate([
    { $match: match },
    { $unwind: '$records' },
    { $match: { 'records.studentId': match['records.studentId'] } },
    { $group: { _id: '$subjectId', held: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$records.status', ATTENDANCE_STATUS.PRESENT] }, 1, 0] } }, leave: { $sum: { $cond: [{ $eq: ['$records.status', ATTENDANCE_STATUS.LEAVE] }, 1, 0] } } } },
  ]);
  return rows.map((r) => ({ subjectId: r._id, held: r.held, present: r.present, leave: r.leave, percentage: r.held ? Math.round((r.present * 10000) / r.held) / 100 : 0 }));
};

export default mongoose.model('Attendance', attendanceSchema);

import mongoose from 'mongoose';
import { EXAM_STATUS, EXAM_STATUS_VALUES } from '../utils/constants.js';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const scheduleItemSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true, match: [timePattern, 'Start time must be HH:mm'] },
    endTime: { type: String, required: true, match: [timePattern, 'End time must be HH:mm'] },
    room: { type: String, trim: true },
  },
  { _id: false }
);

// One exam session for one class and semester, for example "End Semester Exam, Nov 2026".
// Students can fill the exam form only while the exam is "open" and today is inside the form dates.
const examSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    semester: { type: Number, required: true, min: 1, max: 12, validate: { validator: Number.isInteger, message: 'Semester must be a whole number' } },
    formOpensAt: { type: Date, required: true },
    formClosesAt: { type: Date, required: true },
    status: { type: String, enum: EXAM_STATUS_VALUES, default: EXAM_STATUS.DRAFT, index: true },
    schedule: { type: [scheduleItemSchema], default: [] },
  },
  { timestamps: true }
);

examSchema.index({ academicYearId: 1, programId: 1, semester: 1, name: 1 }, { unique: true });

examSchema.pre('validate', function checkDates() {
  if (this.formOpensAt && this.formClosesAt && this.formClosesAt <= this.formOpensAt) {
    this.invalidate('formClosesAt', 'The form must close after it opens');
  }

  const seen = new Set();
  for (const item of this.schedule || []) {
    if (item.startTime && item.endTime && item.endTime <= item.startTime) {
      this.invalidate('schedule', 'Each paper must end after it starts');
    }
    const key = String(item.subjectId);
    if (seen.has(key)) this.invalidate('schedule', 'A subject can appear only once in the schedule');
    seen.add(key);
  }
});

/** True when students may fill or submit the form right now. */
examSchema.methods.isOpen = function isOpen(now = new Date()) {
  return this.status === EXAM_STATUS.OPEN && now >= this.formOpensAt && now <= this.formClosesAt;
};

export default mongoose.model('Exam', examSchema);

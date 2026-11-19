import mongoose from 'mongoose';
import { HALL_TICKET_STATUS, HALL_TICKET_STATUS_VALUES } from '../utils/constants.js';

const { Schema } = mongoose;

const scheduledSubjectSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    code: { type: String, trim: true },
    name: { type: String, trim: true },
    date: Date,
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    room: { type: String, trim: true },
  },
  { _id: false }
);

// A student's admit card for one exam. The schedule is copied when the ticket is issued, so a later edit
// to the exam schedule cannot silently change a ticket the student already downloaded.
const hallTicketSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    examFormId: { type: Schema.Types.ObjectId, ref: 'ExamForm', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    examName: { type: String, trim: true },
    programName: { type: String, trim: true },
    enrollmentNumber: { type: String, trim: true },
    fullName: { type: String, trim: true },
    semester: { type: Number, min: 1, max: 12 },
    seatNumber: { type: String, trim: true },
    room: { type: String, trim: true },
    status: { type: String, enum: HALL_TICKET_STATUS_VALUES, default: HALL_TICKET_STATUS.PENDING, index: true },
    schedule: { type: [scheduledSubjectSchema], default: [] },
    issuedAt: Date,
    issuedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    blockedReason: { type: String, trim: true },
  },
  { timestamps: true }
);

hallTicketSchema.index({ examId: 1, studentId: 1 }, { unique: true });
hallTicketSchema.index(
  { examId: 1, seatNumber: 1 },
  { unique: true, partialFilterExpression: { seatNumber: { $type: 'string' } } }
);

export default mongoose.model('HallTicket', hallTicketSchema);

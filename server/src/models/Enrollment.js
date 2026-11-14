import mongoose from 'mongoose';
import { ENROLLMENT_STATUS, ENROLLMENT_STATUS_VALUES } from '../utils/constants.js';

// "This student studies this subject in this semester." The exam form offers these subjects to tick.
const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    status: { type: String, enum: ENROLLMENT_STATUS_VALUES, default: ENROLLMENT_STATUS.ENROLLED },
  },
  { timestamps: true }
);

// A student is enrolled in a subject once per semester.
enrollmentSchema.index({ studentId: 1, subjectId: 1, semester: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);

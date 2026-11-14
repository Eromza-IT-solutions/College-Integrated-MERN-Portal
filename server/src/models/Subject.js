import mongoose from 'mongoose';
import { SUBJECT_CATEGORIES } from '../utils/constants.js';

// A subject taught in one class and semester, for example "Financial Accounting" in F.Y.B.Com, semester 1.
// Students are linked to subjects through Enrollment.
const subjectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12, validate: { validator: Number.isInteger, message: 'Semester must be a whole number' } },
    category: { type: String, required: true, enum: SUBJECT_CATEGORIES }, // major, minor, SEC, AEC ...
    credits: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// The same code cannot be used twice in one class and semester.
subjectSchema.index({ programId: 1, semester: 1, code: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);

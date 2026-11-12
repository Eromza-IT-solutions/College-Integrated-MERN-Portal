import mongoose from 'mongoose';
import { ACADEMIC_YEAR_STATUS, ACADEMIC_YEAR_STATUS_VALUES } from '../utils/constants.js';

const academicYearSchema = new mongoose.Schema(
  {
    // Like "2026-27". Once data points to it, do not change it.
    label: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{4}-\d{2}$/, 'Label must look like 2026-27'],
    },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startDate || value > this.startDate;
        },
        message: 'endDate must be after startDate',
      },
    },
    status: {
      type: String,
      required: true,
      enum: ACADEMIC_YEAR_STATUS_VALUES,
      default: ACADEMIC_YEAR_STATUS.UPCOMING,
    },
    // Set automatically from status, so the two can never disagree.
    isCurrent: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

academicYearSchema.pre('validate', function setIsCurrent() {
  this.isCurrent = this.status === ACADEMIC_YEAR_STATUS.CURRENT;
});

// Only one year can be current: a unique index that applies only to documents where isCurrent is true.
academicYearSchema.index(
  { isCurrent: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } }
);

export default mongoose.model('AcademicYear', academicYearSchema);

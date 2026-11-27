import mongoose from 'mongoose';
import { PROGRAM_LEVELS, PROGRAM_FACULTIES, PROGRAM_YEARS, YEAR_LABELS } from '../utils/constants.js';

// A program the college offers, for example "B.A. English" (code BDPAEN) or "M.Sc. Computer Science" (code MDPSCS).
// The catalog comes from the college list "Programs offered under autonomy (NEP)": 59 programs.
// A student studies a program for several years (F.Y., S.Y., T.Y. ...); the year of study is kept on the application, student and fee.
// The portal's read-only "Section" and "Class" fields come from this record, so they are not copied onto each application.
const programSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    faculty: { type: String, enum: PROGRAM_FACULTIES },
    level: { type: String, required: true, enum: PROGRAM_LEVELS },
    // Number of years of study. Starts from the level (PROGRAM_YEARS) when not given.
    durationYears: { type: Number, min: 1, max: 10, validate: { validator: Number.isInteger, message: 'Duration must be a whole number of years' } },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

programSchema.pre('validate', function setDuration() {
  if (this.durationYears == null && this.level) this.durationYears = PROGRAM_YEARS[this.level];
});

programSchema.index({ level: 1, faculty: 1 });

/** The college's name for a year of study: "F.Y." for the first year of a degree, "I" for the first year of a master's. */
programSchema.methods.yearLabel = function yearLabel(yearOfStudy) {
  const labels = YEAR_LABELS[this.level];
  return labels && labels[yearOfStudy - 1] ? labels[yearOfStudy - 1] : String(yearOfStudy);
};

/** Is this a valid year of study for the program? */
programSchema.methods.hasYear = function hasYear(yearOfStudy) {
  return Number.isInteger(yearOfStudy) && yearOfStudy >= 1 && yearOfStudy <= this.durationYears;
};

export default mongoose.model('Program', programSchema);

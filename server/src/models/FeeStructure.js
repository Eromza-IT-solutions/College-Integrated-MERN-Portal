import mongoose from 'mongoose';
import { PAYMENT_PURPOSE_VALUES, FEES_CATEGORIES, DIVISION_TYPES, DEFAULT_DIVISION } from '../utils/constants.js';

// One line of a fee, for example { key: 'tuitionFee', label: 'Tuition Fee', amountPaise: 800000 }.
const headSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    amountPaise: {
      type: Number, required: true, min: [0, 'A fee line cannot be negative'],
      validate: { validator: Number.isInteger, message: 'A fee line must be a whole number of paise' },
    },
  },
  { _id: false }
);

// How much a program costs for one year of study, division and fees category in one academic year.
// The college fee sheets list about 30 lines per class (tuition, library deposit, gymkhana ...): they are kept in "heads"
// and amountPaise is always their total. Money is kept in paise (1 rupee = 100 paise) as whole numbers, so there are no rounding errors.
const feeStructureSchema = new mongoose.Schema(
  {
    purpose: { type: String, required: true, enum: PAYMENT_PURPOSE_VALUES }, // admission or exam
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    yearOfStudy: { type: Number, default: 1, min: 1, max: 10, validate: { validator: Number.isInteger, message: 'Year of study must be a whole number' } },
    divisionType: { type: String, enum: DIVISION_TYPES, default: DEFAULT_DIVISION }, // P.N.G. or Grantable (girls only)
    feesCategory: { type: String, required: true, enum: FEES_CATEGORIES }, // PAYING, N.R.I. ...
    heads: { type: [headSchema], default: [] },
    amountPaise: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Amount must be a whole number of paise' },
    },
    classLabel: { type: String, trim: true }, // the name on the fee sheet, for example "F.Y. B.A."
    feeGroup: { type: String, trim: true }, // the fee sheet column group this row came from
    label: { type: String, trim: true, default: '' }, // for example "SAMPLE" for demo data
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeStructureSchema.index({ purpose: 1, academicYearId: 1, programId: 1, yearOfStudy: 1, divisionType: 1, feesCategory: 1 }, { unique: true });

feeStructureSchema.pre('validate', function checkTotal() {
  const keys = new Set();
  this.heads.forEach((h, i) => {
    if (keys.has(h.key)) this.invalidate(`heads.${i}.key`, `The fee line "${h.key}" appears twice`);
    keys.add(h.key);
  });
  if (this.heads.length) {
    const total = this.heads.reduce((n, h) => n + (Number.isInteger(h.amountPaise) ? h.amountPaise : 0), 0);
    if (this.amountPaise == null) this.amountPaise = total;
    else if (this.amountPaise !== total) this.invalidate('amountPaise', `The total (${this.amountPaise}) is not the sum of the fee lines (${total})`);
  }
  if (this.amountPaise == null) this.invalidate('amountPaise', 'Amount is required');
});

/**
 * Find the fee for an application or an exam form. Returns null when no fee has been set.
 * Girls-only Grantable fees are not checked here: the application checks the gender.
 */
feeStructureSchema.statics.findFor = function findFor({ purpose, academicYearId, programId, yearOfStudy = 1, divisionType = DEFAULT_DIVISION, feesCategory }, { session } = {}) {
  return this.findOne({ purpose, academicYearId, programId, yearOfStudy, divisionType, feesCategory, isActive: true }).session(session || null);
};

export default mongoose.model('FeeStructure', feeStructureSchema);

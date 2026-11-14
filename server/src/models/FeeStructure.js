import mongoose from 'mongoose';
import { PAYMENT_PURPOSE_VALUES, FEES_CATEGORIES } from '../utils/constants.js';

// How much a class costs for one fees category in one academic year.
// Money is kept in paise (1 rupee = 100 paise) as whole numbers, so there are no rounding errors.
const feeStructureSchema = new mongoose.Schema(
  {
    purpose: { type: String, required: true, enum: PAYMENT_PURPOSE_VALUES }, // admission or exam
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    feesCategory: { type: String, required: true, enum: FEES_CATEGORIES }, // PAYING, N.R.I. ...
    amountPaise: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Amount must be a whole number of paise' },
    },
    label: { type: String, trim: true, default: '' }, // for example "SAMPLE" for demo data
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeStructureSchema.index({ purpose: 1, academicYearId: 1, programId: 1, feesCategory: 1 }, { unique: true });

export default mongoose.model('FeeStructure', feeStructureSchema);

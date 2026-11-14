import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import {
  PAYMENT_PURPOSE, PAYMENT_PURPOSE_VALUES, PAYMENT_STATUS, PAYMENT_STATUS_VALUES, PAYMENT_GATEWAY_VALUES, PAYMENT_GATEWAY,
} from '../utils/constants.js';

const { Schema } = mongoose;

// One attempt to pay a fee, for admission or for an exam form.
// Admission and exam payments share this model; "purpose" tells them apart.
const paymentSchema = new Schema(
  {
    purpose: { type: String, required: true, enum: PAYMENT_PURPOSE_VALUES },
    payerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', index: true }, // for admission payments
    examFormId: { type: Schema.Types.ObjectId, index: true }, // for exam payments (exam form model comes later)

    amountPaise: {
      type: Number,
      required: true,
      min: [1, 'Amount must be more than zero'],
      validate: { validator: Number.isInteger, message: 'Amount must be a whole number of paise' },
    },
    // Total of refunds that are requested or approved. Updated atomically so a payment can never be over-refunded.
    reservedRefundPaise: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: PAYMENT_STATUS_VALUES, default: PAYMENT_STATUS.CREATED, index: true },
    isTestMode: { type: Boolean, default: true }, // the demo only uses test payments
    gateway: { type: String, enum: PAYMENT_GATEWAY_VALUES, default: PAYMENT_GATEWAY.FAKE },
    gatewayOrderId: { type: String, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    paidAt: Date,
    failureReason: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ receiptNumber: 1 }, { unique: true, partialFilterExpression: { receiptNumber: { $type: 'string' } } });
paymentSchema.index({ gateway: 1, gatewayOrderId: 1 }, { unique: true, partialFilterExpression: { gatewayOrderId: { $type: 'string' } } });
paymentSchema.index({ gateway: 1, gatewayPaymentId: 1 }, { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } });

paymentSchema.pre('validate', function checks() {
  if (this.purpose === PAYMENT_PURPOSE.ADMISSION && !this.applicationId) this.invalidate('applicationId', 'An admission payment needs an application');
  if (this.purpose === PAYMENT_PURPOSE.EXAM && !this.examFormId) this.invalidate('examFormId', 'An exam payment needs an exam form');
  if (!this.isNew && (this.isModified('amountPaise') || this.isModified('purpose'))) {
    this.invalidate('amountPaise', 'The amount and purpose of a payment cannot be changed');
  }
  if (this.reservedRefundPaise > this.amountPaise) this.invalidate('reservedRefundPaise', 'Refunds cannot be more than the amount paid');
});

/**
 * The gateway confirmed the money. Safe to call twice (gateways retry): the second call changes nothing.
 * Gives the payment a receipt number the first time.
 */
paymentSchema.statics.markPaid = async function markPaid(id, { gatewayPaymentId, session } = {}) {
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Payment not found', 404);
  if (current.status === PAYMENT_STATUS.FAILED) throw new AppError('A failed payment cannot be marked paid', 409);

  if (current.status === PAYMENT_STATUS.CREATED) {
    // Only one caller can win this change from "created" to "paid".
    await this.findOneAndUpdate(
      { _id: id, status: PAYMENT_STATUS.CREATED },
      { $set: { status: PAYMENT_STATUS.PAID, paidAt: new Date(), ...(gatewayPaymentId ? { gatewayPaymentId } : {}) } },
      { new: true, session }
    );
  }
  return this.ensureReceipt(id, { session });
};

/** Give a paid payment its receipt number if it has none yet. Also repairs a payment that was paid but crashed before numbering. */
paymentSchema.statics.ensureReceipt = async function ensureReceipt(id, { session } = {}) {
  const payment = await this.findById(id).session(session || null);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== PAYMENT_STATUS.PAID) throw new AppError('Only a paid payment gets a receipt', 409);
  if (payment.receiptNumber) return payment;

  const Counter = this.db.model('Counter');
  const year = await this.db.model('AcademicYear').findById(payment.academicYearId).session(session || null);
  if (!year) throw new AppError('Academic year not found', 404);
  const seq = await Counter.next(`receipt:${year.label}`, { session });
  const receiptNumber = Counter.format({ prefix: 'RCT', yearLabel: year.label, seq });
  // Only fill it if nobody else did in the meantime.
  const updated = await this.findOneAndUpdate(
    { _id: id, receiptNumber: { $exists: false } },
    { $set: { receiptNumber } },
    { new: true, session }
  );
  return updated || this.findById(id).session(session || null);
};

/** The gateway said the payment did not go through. Only a payment that is still "created" can fail. */
paymentSchema.statics.markFailed = async function markFailed(id, reason = 'Payment failed', { session } = {}) {
  const updated = await this.findOneAndUpdate(
    { _id: id, status: PAYMENT_STATUS.CREATED },
    { $set: { status: PAYMENT_STATUS.FAILED, failureReason: reason } },
    { new: true, session }
  );
  if (updated) return updated;
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Payment not found', 404);
  throw new AppError(`A ${current.status} payment cannot be marked failed`, 409);
};

export default mongoose.model('Payment', paymentSchema);

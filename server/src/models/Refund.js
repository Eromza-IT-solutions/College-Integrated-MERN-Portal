import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { PAYMENT_PURPOSE_VALUES, PAYMENT_STATUS, REFUND_STATUS, REFUND_STATUS_VALUES } from '../utils/constants.js';

const { Schema } = mongoose;

// Giving money back for a paid payment.
// Rule from the permission matrix: Admission Admin or Examination Admin raises it, Super Admin approves it,
// and the person who raised a refund can never be the one who approves it.
const refundSchema = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    purpose: { type: String, required: true, enum: PAYMENT_PURPOSE_VALUES }, // copied from the payment
    amountPaise: {
      type: Number,
      required: true,
      min: [1, 'Amount must be more than zero'],
      validate: { validator: Number.isInteger, message: 'Amount must be a whole number of paise' },
    },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: REFUND_STATUS_VALUES, default: REFUND_STATUS.REQUESTED, index: true },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decidedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: Date,
    decisionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

refundSchema.pre('validate', function checks() {
  if (this.status === REFUND_STATUS.REJECTED && !this.decisionNote) this.invalidate('decisionNote', 'Say why the refund was rejected');
  if (this.decidedByUserId && String(this.decidedByUserId) === String(this.requestedByUserId)) {
    this.invalidate('decidedByUserId', 'The person who raised a refund cannot decide it');
  }
});

/**
 * Raise a refund. The amount is reserved on the payment in one atomic step, so two refunds raised at the
 * same moment can never add up to more than was paid.
 */
refundSchema.statics.request = async function request({ paymentId, amountPaise, reason, requestedByUserId }, { session } = {}) {
  const Payment = this.db.model('Payment');
  if (!Number.isInteger(amountPaise) || amountPaise < 1) throw new AppError('Refund amount must be a whole number above zero', 400);

  const payment = await Payment.findOneAndUpdate(
    {
      _id: paymentId,
      status: PAYMENT_STATUS.PAID,
      $expr: { $lte: [{ $add: ['$reservedRefundPaise', amountPaise] }, '$amountPaise'] },
    },
    { $inc: { reservedRefundPaise: amountPaise } },
    { new: true, session }
  );
  if (!payment) {
    const exists = await Payment.findById(paymentId).session(session || null);
    if (!exists) throw new AppError('Payment not found', 404);
    if (exists.status !== PAYMENT_STATUS.PAID) throw new AppError('Only a paid payment can be refunded', 409);
    throw new AppError('Refund is more than the amount still refundable', 409);
  }
  try {
    const [refund] = await this.create([{ paymentId, purpose: payment.purpose, amountPaise, reason, requestedByUserId }], { session });
    return refund;
  } catch (err) {
    await Payment.updateOne({ _id: paymentId }, { $inc: { reservedRefundPaise: -amountPaise } }, { session }); // give the reservation back
    throw err;
  }
};

/** Approve or reject a requested refund. Only a refund that is still "requested" can be decided. */
refundSchema.statics.decide = async function decide(id, { approve, decidedByUserId, note }, { session } = {}) {
  const refund = await this.findById(id).session(session || null);
  if (!refund) throw new AppError('Refund not found', 404);
  if (refund.status !== REFUND_STATUS.REQUESTED) throw new AppError(`A ${refund.status} refund cannot be decided again`, 409);
  if (String(refund.requestedByUserId) === String(decidedByUserId)) throw new AppError('The person who raised a refund cannot decide it', 403);
  if (!approve && !note) throw new AppError('Say why the refund was rejected', 400);

  const decided = await this.findOneAndUpdate(
    { _id: id, status: REFUND_STATUS.REQUESTED },
    { $set: { status: approve ? REFUND_STATUS.APPROVED : REFUND_STATUS.REJECTED, decidedByUserId, decidedAt: new Date(), decisionNote: note } },
    { new: true, session }
  );
  if (!decided) throw new AppError('Refund was already decided', 409);
  if (!approve) {
    // A rejected refund frees its amount again.
    await this.db.model('Payment').updateOne({ _id: refund.paymentId }, { $inc: { reservedRefundPaise: -refund.amountPaise } }, { session });
  }
  return decided;
};

export default mongoose.model('Refund', refundSchema);

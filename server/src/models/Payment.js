import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import {
  PAYMENT_PURPOSE, PAYMENT_PURPOSE_VALUES, PAYMENT_STATUS, PAYMENT_STATUS_VALUES, PAYMENT_GATEWAY_VALUES, PAYMENT_GATEWAY,
  PAYMENT_METHODS, PAYMENT_CONFIRMED_VIA, PAYMENT_CONFIRMED_VIA_VALUES, RAZORPAY,
} from '../utils/constants.js';
import { verifyCheckoutSignature, eventSummary } from '../utils/razorpay.js';

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
    currency: { type: String, enum: [RAZORPAY.currency], default: RAZORPAY.currency },
    gateway: { type: String, enum: PAYMENT_GATEWAY_VALUES, default: PAYMENT_GATEWAY.RAZORPAY },
    gatewayOrderId: { type: String, trim: true }, // Razorpay order id (order_xxx), created before the student pays
    gatewayPaymentId: { type: String, trim: true }, // Razorpay payment id (pay_xxx), known once the student pays
    orderCreatedAt: Date,
    gatewayMethod: { type: String, enum: PAYMENT_METHODS }, // card, upi, netbanking ... as reported by Razorpay
    confirmedVia: { type: String, enum: PAYMENT_CONFIRMED_VIA_VALUES }, // who told us it was paid: the browser (checkout) or Razorpay (webhook)
    signatureVerifiedAt: Date, // set when the checkout signature was checked and was valid
    // A student can try several times on one order. A failed attempt does not end the payment; it is counted here.
    failedAttempts: { type: Number, default: 0, min: 0 },
    gatewayErrorCode: { type: String, trim: true },
    gatewayEventIds: { type: [String], default: [] }, // webhook event ids already handled (Razorpay may deliver the same one twice)
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
 * Gives the payment a receipt number the first time. "fields" are extra values saved together with the paid status.
 */
paymentSchema.statics.markPaid = async function markPaid(id, { gatewayPaymentId, fields, session } = {}) {
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Payment not found', 404);
  if (current.status === PAYMENT_STATUS.FAILED) throw new AppError('A failed payment cannot be marked paid', 409);

  if (current.status === PAYMENT_STATUS.CREATED) {
    // Only one caller can win this change from "created" to "paid".
    await this.findOneAndUpdate(
      { _id: id, status: PAYMENT_STATUS.CREATED },
      { $set: { ...(fields || {}), status: PAYMENT_STATUS.PAID, paidAt: new Date(), ...(gatewayPaymentId ? { gatewayPaymentId } : {}) } },
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

/** Razorpay's payment methods we know; anything else is stored as "other". */
const methodOf = (m) => (PAYMENT_METHODS.includes(m) ? m : 'other');

/**
 * Save the Razorpay order id on a payment, once. The same order id again is fine (a retry); a different one is refused,
 * because a payment is tied to one order. Only a payment that is still "created" can get an order.
 */
paymentSchema.statics.attachGatewayOrder = async function attachGatewayOrder(id, { orderId, session } = {}) {
  if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId)) throw new AppError('That is not a Razorpay order id', 400);
  const updated = await this.findOneAndUpdate(
    { _id: id, status: PAYMENT_STATUS.CREATED, gateway: PAYMENT_GATEWAY.RAZORPAY, gatewayOrderId: { $exists: false } },
    { $set: { gatewayOrderId: orderId, orderCreatedAt: new Date() } },
    { new: true, session }
  );
  if (updated) return updated;
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Payment not found', 404);
  if (current.gatewayOrderId === orderId) return current;
  if (current.gateway !== PAYMENT_GATEWAY.RAZORPAY) throw new AppError('This payment does not use Razorpay', 409);
  if (current.gatewayOrderId) throw new AppError('This payment already has a different order', 409);
  throw new AppError(`A ${current.status} payment cannot get a new order`, 409);
};

/**
 * The student's browser says the payment went through. We believe it only if the signature is valid, which needs the
 * secret key. Marks the payment paid (safe to call twice). A wrong signature changes nothing.
 */
paymentSchema.statics.confirmCheckout = async function confirmCheckout(id, { orderId, paymentId, signature, keySecret, method, session } = {}) {
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Payment not found', 404);
  if (current.gateway !== PAYMENT_GATEWAY.RAZORPAY) throw new AppError('This payment does not use Razorpay', 409);
  if (!current.gatewayOrderId || current.gatewayOrderId !== orderId) throw new AppError('This payment does not belong to that order', 409);
  if (!verifyCheckoutSignature({ orderId, paymentId, signature, keySecret })) throw new AppError('The payment signature is not valid', 400);
  if (current.status === PAYMENT_STATUS.PAID && current.gatewayPaymentId && current.gatewayPaymentId !== paymentId) {
    throw new AppError('A different payment has already settled this order', 409);
  }
  return this.markPaid(id, {
    gatewayPaymentId: paymentId,
    fields: { confirmedVia: PAYMENT_CONFIRMED_VIA.CHECKOUT, signatureVerifiedAt: new Date(), ...(method ? { gatewayMethod: methodOf(method) } : {}) },
    session,
  });
};

/**
 * Handle one Razorpay webhook. The caller must already have checked the webhook signature on the raw body.
 * eventId is the X-Razorpay-Event-Id header. Handling is safe to repeat: Razorpay may send the same event twice.
 *  - payment.captured / order.paid: the amount must match exactly, then the payment is marked paid.
 *  - payment.failed: only the attempt is recorded. The payment stays "created" because the student can try again on the same order.
 * Returns { handled, ... }. An unknown order or event is ignored (not an error), so Razorpay stops retrying it.
 */
paymentSchema.statics.applyWebhookEvent = async function applyWebhookEvent(event, { eventId, session } = {}) {
  const info = eventSummary(event);
  if (!info || !info.orderId) return { handled: false, reason: 'no payment in this event' };
  const known = [RAZORPAY.events.PAYMENT_CAPTURED, RAZORPAY.events.ORDER_PAID, RAZORPAY.events.PAYMENT_FAILED];
  if (!known.includes(info.name)) return { handled: false, reason: `event ${info.name} is not used` };

  const payment = await this.findOne({ gateway: PAYMENT_GATEWAY.RAZORPAY, gatewayOrderId: info.orderId }).session(session || null);
  if (!payment) return { handled: false, reason: 'unknown order' };
  if (eventId && (payment.gatewayEventIds || []).includes(eventId)) return { handled: true, duplicate: true, payment };

  let result;
  if (info.name === RAZORPAY.events.PAYMENT_FAILED) {
    result = await this.findOneAndUpdate(
      { _id: payment._id, status: PAYMENT_STATUS.CREATED },
      {
        $set: { failureReason: info.errorDescription || 'Payment attempt failed', ...(info.errorCode ? { gatewayErrorCode: info.errorCode } : {}), ...(info.method ? { gatewayMethod: methodOf(info.method) } : {}) },
        $inc: { failedAttempts: 1 },
      },
      { new: true, session }
    );
    result = result || payment; // already paid or failed: nothing to record
  } else {
    if (info.amountPaise !== payment.amountPaise || info.currency !== RAZORPAY.currency) {
      throw new AppError('The amount Razorpay reports does not match this payment', 409);
    }
    if (payment.status === PAYMENT_STATUS.PAID && payment.gatewayPaymentId && payment.gatewayPaymentId !== info.paymentId) {
      throw new AppError('A different payment has already settled this order', 409);
    }
    result = await this.markPaid(payment._id, {
      gatewayPaymentId: info.paymentId,
      fields: { confirmedVia: PAYMENT_CONFIRMED_VIA.WEBHOOK, ...(info.method ? { gatewayMethod: methodOf(info.method) } : {}) },
      session,
    });
  }
  if (eventId) await this.updateOne({ _id: payment._id }, { $addToSet: { gatewayEventIds: eventId } }, { session });
  return { handled: true, payment: result };
};

export default mongoose.model('Payment', paymentSchema);

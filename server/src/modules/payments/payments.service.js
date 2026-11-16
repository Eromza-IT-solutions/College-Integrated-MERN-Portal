import AppError from '../../utils/AppError.js';
import Payment from '../../models/Payment.js';
import Application from '../../models/Application.js';
import ExamForm from '../../models/ExamForm.js';
import Student from '../../models/Student.js';
import { PAYMENT_PURPOSE, PAYMENT_STATUS, APPLICATION_STATUS, EXAM_FORM_STATUS } from '../../utils/constants.js';
import { verifyWebhookSignature, isTestKeyId } from '../../utils/razorpay.js';
import { startCheckout } from '../../services/razorpayService.js';

/**
 * What the Razorpay payment routes do. The routes only check who is calling (requirePermission) and pass plain values here.
 * actorId is the signed-in user's id. A payment that is not the caller's is reported as "not found", never "forbidden",
 * so nobody can find out which ids exist.
 */

/** The fields a client may see. Gateway bookkeeping stays on the server. */
const publicView = (p) => ({
  id: String(p._id), purpose: p.purpose, status: p.status, amountPaise: p.amountPaise, currency: p.currency,
  receiptNumber: p.receiptNumber || null, paidAt: p.paidAt || null, failedAttempts: p.failedAttempts || 0, failureReason: p.failureReason || null,
});

/** Finds this form's open payment, or makes one. If the fee changed since, the old open payment is closed and a new one made. */
async function findOrCreateOpenPayment(filter, data, amountPaise) {
  let open = await Payment.findOne({ ...filter, status: PAYMENT_STATUS.CREATED });
  if (open && open.amountPaise !== amountPaise) {
    await Payment.markFailed(open._id, 'The fee changed, a new payment was started');
    open = null;
  }
  if (open) return open;
  try {
    return await Payment.create({ ...data, amountPaise });
  } catch (err) {
    if (err.code !== 11000) throw err;
    return Payment.findOne({ ...filter, status: PAYMENT_STATUS.CREATED }); // someone else created it a moment ago
  }
}

/** What has to be true before a student or applicant may pay for this target. Returns what the payment needs. */
async function admissionTarget(applicationId, actorId) {
  const app = await Application.findById(applicationId);
  if (!app || String(app.applicantUserId) !== String(actorId)) throw new AppError('Application not found', 404);
  if (app.status !== APPLICATION_STATUS.APPROVED) throw new AppError('This application is not waiting for payment', 409);
  if (!(app.feeAmountPaise > 0)) throw new AppError('There is no fee to pay for this application', 409);
  if (app.feeDueAt && app.feeDueAt.getTime() < Date.now()) throw new AppError('The fee due date has passed', 409);
  return {
    filter: { purpose: PAYMENT_PURPOSE.ADMISSION, applicationId: app._id },
    data: { purpose: PAYMENT_PURPOSE.ADMISSION, payerUserId: actorId, academicYearId: app.academicYearId, feeStructureId: app.feeStructureId, applicationId: app._id },
    amountPaise: app.feeAmountPaise,
  };
}

async function examTarget(examFormId, actorId) {
  const form = await ExamForm.findById(examFormId);
  const student = form && (await Student.findById(form.studentId));
  if (!form || !student || String(student.userId) !== String(actorId)) throw new AppError('Exam form not found', 404);
  if (form.status !== EXAM_FORM_STATUS.PENDING_PAYMENT) throw new AppError('This exam form is not waiting for payment', 409);
  if (!(form.feeAmountPaise > 0)) throw new AppError('There is no fee to pay for this exam form', 409);
  const exam = await form.constructor.db.model('Exam').findById(form.examId);
  return {
    filter: { purpose: PAYMENT_PURPOSE.EXAM, examFormId: form._id },
    data: { purpose: PAYMENT_PURPOSE.EXAM, payerUserId: actorId, academicYearId: exam && exam.academicYearId, feeStructureId: form.feeStructureId, examFormId: form._id },
    amountPaise: form.feeAmountPaise,
  };
}

/** The student pressed "Pay": make (or reuse) the open payment and the Razorpay order. Returns what Razorpay Checkout needs. */
async function beginPayment({ purpose, targetId, actorId, razorpay, fetchImpl }) {
  const target = purpose === PAYMENT_PURPOSE.ADMISSION ? await admissionTarget(targetId, actorId) : await examTarget(targetId, actorId);
  const payment = await findOrCreateOpenPayment(target.filter, { ...target.data, isTestMode: isTestKeyId(razorpay.keyId) }, target.amountPaise);
  const checkout = await startCheckout(payment._id, { keyId: razorpay.keyId, keySecret: razorpay.keySecret, fetchImpl });
  return { paymentId: String(payment._id), ...checkout };
}

/** A paid payment moves its application or exam form forward. Safe to repeat (both methods are). */
async function settle(payment) {
  if (payment.purpose === PAYMENT_PURPOSE.ADMISSION) {
    const app = await Application.findById(payment.applicationId);
    if (!app) throw new AppError('Application not found', 404);
    await app.markFeePaid({ paymentId: payment._id });
  } else {
    const form = await ExamForm.findById(payment.examFormId);
    if (!form) throw new AppError('Exam form not found', 404);
    await form.markPaid(payment._id);
  }
}

/**
 * The browser says Razorpay Checkout finished. Valid signature -> paid -> application/exam form moves forward.
 * If the money is in but the form can no longer move (for example the admission was cancelled meanwhile), the
 * payment still stays paid and "settled: false" with a message tells the person to contact the office.
 */
async function confirmPayment({ payment, body, razorpay }) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, method } = body || {};
  if ([orderId, paymentId, signature].some((v) => typeof v !== 'string' || !v)) throw new AppError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required', 400);
  const paid = await Payment.confirmCheckout(payment._id, { orderId, paymentId, signature, keySecret: razorpay.keySecret, method });
  try {
    await settle(paid);
    return { payment: paid, settled: true };
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    return { payment: paid, settled: false, message: 'Your payment was received but the form could not be updated. Please contact the college office with your receipt number.' };
  }
}

/**
 * Razorpay's own message. Answers with what to tell Razorpay: only a bad signature is an error (401). Everything we
 * cannot or need not act on is answered "received" so Razorpay does not keep retrying it for a day. Truly unexpected
 * errors still throw (500) so Razorpay does retry them.
 */
async function handleWebhook({ rawBody, signature, eventId, razorpay, log = console }) {
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: razorpay.webhookSecret })) throw new AppError('Invalid webhook signature', 401);
  let event;
  try { event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)); } catch { throw new AppError('Webhook body is not JSON', 400); }
  let result;
  try {
    result = await Payment.applyWebhookEvent(event, { eventId });
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    log.error(`[razorpay webhook] needs attention: ${err.message} (event ${eventId || 'unknown'})`);
    return { received: true, needsAttention: err.message };
  }
  if (result.handled && result.payment && result.payment.status === PAYMENT_STATUS.PAID) {
    try {
      await settle(result.payment);
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      log.error(`[razorpay webhook] payment ${result.payment._id} is paid but could not be settled: ${err.message}`);
      return { received: true, needsAttention: err.message };
    }
  }
  return { received: true };
}

export { publicView, beginPayment, confirmPayment, handleWebhook, settle };

import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import { auditSafe } from '../../services/auditService.js';
import { getGateway } from '../../services/payment/index.js';
import { getActor } from '../../middleware/requirePermission.js';
import { isInScope, scopeFilter } from '../../utils/scope.js';
import Payment from '../../models/Payment.js';
import Application from '../../models/Application.js';
import ExamForm from '../../models/ExamForm.js';
import Exam from '../../models/Exam.js';
import Student from '../../models/Student.js';
import FeeStructure from '../../models/FeeStructure.js';
import AcademicYear from '../../models/AcademicYear.js';
import User from '../../models/User.js';
import {
  PAYMENT_PURPOSE, PAYMENT_STATUS, APPLICATION_STATUS, EXAM_FORM_STATUS, AUDIT_OUTCOME,
} from '../../utils/constants.js';

// PROPOSED (team to confirm): the admission fee can be paid once the application is sent in or approved.
// A draft is not paid for yet, a returned or rejected application should not collect money.
const ADMISSION_PAYABLE = [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.APPROVED];

const OWNER = { ownerField: 'payerUserId' };

// ---------------------------------------------------------------------------------------------
// 1. Order creation
// ---------------------------------------------------------------------------------------------

/** Admission: find the application, check it is the payer's own, and work out the fee on the server. */
async function admissionTarget(req, applicationId) {
  const application = await Application.findById(applicationId);
  // "Not yours" and "does not exist" look the same on purpose.
  if (!application || !isInScope(req, application, { ownerField: 'applicantUserId' })) throw new AppError('Application not found', 404);
  if (!ADMISSION_PAYABLE.includes(application.status)) {
    throw new AppError(`The admission fee cannot be paid while the application is ${application.status}`, 409);
  }
  const fee = await FeeStructure.findOne({
    purpose: PAYMENT_PURPOSE.ADMISSION, academicYearId: application.academicYearId,
    programId: application.programId, feesCategory: application.feesCategory, isActive: true,
  });
  if (!fee) throw new AppError('No admission fee is set for this class and fees category', 409);
  return {
    fee,
    amountPaise: fee.amountPaise,
    academicYearId: application.academicYearId,
    link: { applicationId: application._id },
    existingFilter: { applicationId: application._id, purpose: PAYMENT_PURPOSE.ADMISSION },
  };
}

/** Exam: find the form, check it belongs to this student, and use the fee that was fixed when "Continue" was pressed. */
async function examTarget(req, examFormId) {
  const form = await ExamForm.findById(examFormId);
  const student = form && (await Student.findById(form.studentId));
  if (!form || !student || !isInScope(req, student)) throw new AppError('Exam form not found', 404);
  if (form.status !== EXAM_FORM_STATUS.PENDING_PAYMENT) {
    throw new AppError(`An exam form that is ${form.status} is not waiting for payment`, 409);
  }
  const exam = await Exam.findById(form.examId);
  if (!exam || !exam.isOpen()) throw new AppError('The exam form is not open', 409);
  if (!form.feeStructureId || !Number.isInteger(form.feeAmountPaise) || form.feeAmountPaise < 1) {
    throw new AppError('This exam form has no fee to pay', 409);
  }
  return {
    fee: { _id: form.feeStructureId },
    amountPaise: form.feeAmountPaise,
    academicYearId: exam.academicYearId,
    link: { examFormId: form._id },
    existingFilter: { examFormId: form._id, purpose: PAYMENT_PURPOSE.EXAM },
  };
}

function orderReply(payment, gateway) {
  return {
    paymentId: payment._id,
    purpose: payment.purpose,
    status: payment.status,
    amountPaise: payment.amountPaise,
    currency: 'INR',
    gateway: payment.gateway,
    gatewayOrderId: payment.gatewayOrderId,
    // Public key for the Razorpay checkout window. The secret key never leaves the server.
    keyId: gateway.publicKeyId,
    isTestMode: payment.isTestMode,
  };
}

/**
 * Create the payment record and the gateway order for a fee. Returns { payment, reused }.
 * - The amount comes from the server (fee structure / exam form), never from the browser.
 * - Already paid: 409. Still waiting from an earlier click: the same order is returned (no duplicate orders).
 * - A waiting order with an old amount or an old gateway is closed (failed) and a new one is made.
 */
async function createOrder(req, { purpose, applicationId, examFormId }) {
  const actor = getActor(req);
  const gateway = getGateway();
  const target = purpose === PAYMENT_PURPOSE.ADMISSION ? await admissionTarget(req, applicationId) : await examTarget(req, examFormId);

  if (target.amountPaise < 1) throw new AppError('Nothing to pay: the fee is zero', 409);

  const earlier = await Payment.find(target.existingFilter);
  if (earlier.some((p) => p.status === PAYMENT_STATUS.PAID)) throw new AppError('This fee is already paid', 409);

  for (const waiting of earlier.filter((p) => p.status === PAYMENT_STATUS.CREATED)) {
    if (waiting.amountPaise === target.amountPaise && waiting.gateway === gateway.name && waiting.gatewayOrderId) {
      return { payment: waiting, reused: true, gateway };
    }
    await Payment.markFailed(waiting._id, 'Replaced by a new order because the fee or gateway changed');
  }

  // Our own id first, so the gateway receipt can carry it (Razorpay allows up to 40 characters).
  const _id = new mongoose.Types.ObjectId();
  let order;
  try {
    order = await gateway.createOrder({
      amountPaise: target.amountPaise,
      receipt: `pay_${_id}`,
      notes: { purpose, paymentId: String(_id) },
    });
  } catch (err) {
    await auditSafe(req, {
      action: 'paymentOrderCreated', entityType: 'payment', outcome: AUDIT_OUTCOME.FAILED,
      details: { purpose, amountPaise: target.amountPaise, reason: err.message },
    });
    throw err;
  }

  const payment = await Payment.create({
    _id,
    purpose,
    payerUserId: actor.id,
    academicYearId: target.academicYearId,
    feeStructureId: target.fee._id,
    ...target.link,
    amountPaise: target.amountPaise,
    gateway: gateway.name,
    gatewayOrderId: order.gatewayOrderId,
  });

  await auditSafe(req, {
    action: 'paymentOrderCreated', entityType: 'payment', entityId: payment._id,
    details: { purpose, amountPaise: payment.amountPaise, gatewayOrderId: order.gatewayOrderId },
  });
  return { payment, reused: false, gateway };
}

// ---------------------------------------------------------------------------------------------
// 2. Settling a payment (shared by browser verification and the gateway webhook)
// ---------------------------------------------------------------------------------------------

/**
 * The gateway has confirmed the money. Safe to run twice and from two places at once:
 * Payment.markPaid only changes a "created" payment, and ExamForm.markPaid ignores a repeat.
 */
async function settlePaid(req, payment, gatewayPaymentId, { source }) {
  const alreadyPaid = payment.status === PAYMENT_STATUS.PAID;
  const paid = await Payment.markPaid(payment._id, { gatewayPaymentId });

  if (paid.purpose === PAYMENT_PURPOSE.EXAM) {
    try {
      const form = await ExamForm.findById(paid.examFormId);
      if (!form) throw new AppError('Exam form not found', 404);
      await form.markPaid(paid._id);
    } catch (err) {
      // The money is safely recorded. Say loudly that the form was not updated, then let the caller see the error.
      await auditSafe(req, {
        action: 'paymentVerified', entityType: 'payment', entityId: paid._id, outcome: AUDIT_OUTCOME.FAILED,
        details: { source, reason: `Paid, but the exam form was not updated: ${err.message}` },
      });
      throw err;
    }
  }

  if (!alreadyPaid) {
    await auditSafe(req, {
      action: 'paymentVerified', entityType: 'payment', entityId: paid._id,
      details: { source, gatewayPaymentId: paid.gatewayPaymentId, amountPaise: paid.amountPaise, receiptNumber: paid.receiptNumber },
    });
  }
  return { payment: paid, alreadyPaid };
}

/**
 * Browser verification: the checkout window gives the browser { payment id, signature }. We rebuild the signature
 * ourselves from the order id WE stored and compare. Only a correct signature can mark a payment paid.
 */
async function verifyPayment(req, payment, { gatewayPaymentId, signature }) {
  if (!isInScope(req, payment, OWNER)) throw new AppError('Payment not found', 404);
  const gateway = getGateway();

  if (payment.status === PAYMENT_STATUS.FAILED) throw new AppError('This payment has failed and cannot be completed. Start a new payment.', 409);
  if (payment.status === PAYMENT_STATUS.PAID && payment.gatewayPaymentId && payment.gatewayPaymentId !== gatewayPaymentId) {
    throw new AppError('This payment was already completed with a different gateway payment', 409);
  }
  if (!payment.gatewayOrderId || payment.gateway !== gateway.name) throw new AppError('This payment cannot be verified here', 409);

  const genuine = gateway.verifyPaymentSignature({ orderId: payment.gatewayOrderId, paymentId: gatewayPaymentId, signature });
  if (!genuine) {
    await auditSafe(req, {
      action: 'paymentVerificationFailed', entityType: 'payment', entityId: payment._id, outcome: AUDIT_OUTCOME.FAILED,
      details: { reason: 'signature does not match', gatewayPaymentId },
    });
    throw new AppError('Payment signature is not valid', 400, undefined, 'PAYMENT_SIGNATURE_INVALID');
  }
  return settlePaid(req, payment, gatewayPaymentId, { source: 'browser' });
}

// ---------------------------------------------------------------------------------------------
// 3. Looking at payments and receipts
// ---------------------------------------------------------------------------------------------

function toClient(p) {
  return {
    _id: p._id, purpose: p.purpose, status: p.status, amountPaise: p.amountPaise,
    reservedRefundPaise: p.reservedRefundPaise, gateway: p.gateway, gatewayOrderId: p.gatewayOrderId,
    gatewayPaymentId: p.gatewayPaymentId, receiptNumber: p.receiptNumber, paidAt: p.paidAt,
    failureReason: p.failureReason, applicationId: p.applicationId, examFormId: p.examFormId,
    payerUserId: p.payerUserId, isTestMode: p.isTestMode, createdAt: p.createdAt,
  };
}

function getOwnPayment(req, payment) {
  if (!isInScope(req, payment, OWNER)) throw new AppError('Payment not found', 404);
  return toClient(payment);
}

async function listPayments(req, { purpose, status, page, limit }) {
  const filter = { ...scopeFilter(req, OWNER), purpose, ...(status ? { status } : {}) };
  const [rows, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  return { rows: rows.map(toClient), total, page, limit };
}

/** The receipt of a paid payment, ready for the Receipt screen. */
async function getReceipt(req, payment) {
  if (!isInScope(req, payment, OWNER)) throw new AppError('Payment not found', 404);
  if (payment.status !== PAYMENT_STATUS.PAID) throw new AppError('A receipt is available only after the payment is paid', 409);
  const complete = payment.receiptNumber ? payment : await Payment.ensureReceipt(payment._id); // repairs a paid payment that has no number yet
  const [payer, year] = await Promise.all([
    User.findById(complete.payerUserId).select('fullName'),
    AcademicYear.findById(complete.academicYearId),
  ]);
  return {
    receiptNumber: complete.receiptNumber,
    purpose: complete.purpose,
    amountPaise: complete.amountPaise,
    currency: 'INR',
    paidAt: complete.paidAt,
    academicYear: year ? year.label : null,
    payerName: payer ? payer.fullName : null,
    gatewayPaymentId: complete.gatewayPaymentId,
    isTestMode: complete.isTestMode,
    paymentId: complete._id,
  };
}

export {
  createOrder, verifyPayment, settlePaid, orderReply, getOwnPayment, listPayments, getReceipt, toClient, ADMISSION_PAYABLE,
};

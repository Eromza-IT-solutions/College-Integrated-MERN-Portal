import express from 'express';
import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import Payment from '../../models/Payment.js';
import { requirePermission, getActor } from '../../middleware/requirePermission.js';
import { isInScope } from '../../utils/scope.js';
import { PAYMENT_PURPOSE } from '../../utils/constants.js';
import { beginPayment, confirmPayment, handleWebhook, publicView } from './payments.service.js';

/**
 * Payment routes, mounted at /api/v1/payments.
 *   POST /admission/:applicationId/checkout   the applicant presses Pay
 *   POST /exam/:examFormId/checkout           the student presses Pay on an exam form
 *   POST /:id/confirm                         the browser reports Razorpay Checkout finished (signature checked)
 *   GET  /:id                                 status of a payment (the screen can poll this after paying)
 *   POST /webhook/razorpay                    Razorpay's own message. No login; protected by its signature.
 *                                             app.js must give this path express.raw() BEFORE express.json().
 * razorpay = { keyId, keySecret, webhookSecret } from env.razorpay. fetchImpl is only replaced in tests.
 */
function buildRouter({ razorpay, fetchImpl, log } = {}) {
  const router = express.Router();
  const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

  // Loads the payment, then applies the permission rule of its own kind (admissionPayments or examPayments).
  const forPayment = (action) => asyncHandler(async (req, res, next) => {
    if (!getActor(req)) throw new AppError('Please sign in', 401); // before looking anything up, so a stranger learns nothing
    const payment = mongoose.isValidObjectId(req.params.id) ? await Payment.findById(req.params.id) : null;
    if (!payment) throw new AppError('Payment not found', 404);
    req.payment = payment;
    return requirePermission(`${payment.purpose}Payments`, action)(req, res, next);
  });
  const ownOrAll = (req) => {
    if (!isInScope(req, req.payment, { ownerField: 'payerUserId' })) throw new AppError('Payment not found', 404);
  };

  router.post('/admission/:applicationId/checkout', requirePermission('admissionPayments', 'create'), asyncHandler(async (req, res) => {
    const data = await beginPayment({ purpose: PAYMENT_PURPOSE.ADMISSION, targetId: req.params.applicationId, actorId: req.user.id, razorpay, fetchImpl });
    ok(res, data, 201);
  }));

  router.post('/exam/:examFormId/checkout', requirePermission('examPayments', 'create'), asyncHandler(async (req, res) => {
    const data = await beginPayment({ purpose: PAYMENT_PURPOSE.EXAM, targetId: req.params.examFormId, actorId: req.user.id, razorpay, fetchImpl });
    ok(res, data, 201);
  }));

  router.post('/:id/confirm', forPayment('create'), asyncHandler(async (req, res) => {
    ownOrAll(req);
    const r = await confirmPayment({ payment: req.payment, body: req.body, razorpay });
    ok(res, { payment: publicView(r.payment), settled: r.settled, ...(r.message ? { message: r.message } : {}) });
  }));

  router.get('/:id', forPayment('view'), asyncHandler(async (req, res) => {
    ownOrAll(req);
    ok(res, publicView(req.payment));
  }));

  router.post('/webhook/razorpay', asyncHandler(async (req, res) => {
    const out = await handleWebhook({
      rawBody: req.body, signature: req.get('x-razorpay-signature'), eventId: req.get('x-razorpay-event-id'), razorpay, log,
    });
    res.status(200).json({ success: true, ...out });
  }));

  return router;
}

export default buildRouter;

import asyncHandler from '../../utils/asyncHandler.js';
import {
  createOrder, verifyPayment, orderReply, getOwnPayment, listPayments, getReceipt,
} from './payments.service.js';
import { handleWebhook } from './webhook.service.js';
import { requestRefund, decideRefund, listRefunds, refundToClient } from './refunds.service.js';
import {
  orderBody, verifyBody, refundBody, decisionBody, listQuery, parse,
} from './payments.validation.js';
import { sendPdf, pdfFilename } from '../../utils/pdf.js';
import { receiptPdf } from '../../utils/pdfDocuments.js';

const ok = (req, res, data, status = 200, meta = {}) => res.status(status).json({ success: true, data, meta: { ...meta, requestId: req.id } });
const paged = ({ total, page, limit }) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

// POST /api/v1/payments/orders   { purpose, applicationId | examFormId }
const postOrder = asyncHandler(async (req, res) => {
  const body = parse(orderBody, req.body);
  const { payment, reused, gateway } = await createOrder(req, body);
  ok(req, res, orderReply(payment, gateway), reused ? 200 : 201, { reused });
});

// POST /api/v1/payments/:id/verify   { gatewayPaymentId, signature }
const postVerify = asyncHandler(async (req, res) => {
  const body = parse(verifyBody, req.body);
  const { payment, alreadyPaid } = await verifyPayment(req, req.payment, body);
  ok(req, res, { paymentId: payment._id, status: payment.status, receiptNumber: payment.receiptNumber, paidAt: payment.paidAt }, 200, { alreadyPaid });
});

// GET /api/v1/payments?purpose=admission|exam&status=&page=&limit=
const getPayments = asyncHandler(async (req, res) => {
  const q = parse(listQuery, req.query);
  const result = await listPayments(req, q);
  ok(req, res, result.rows, 200, paged(result));
});

// GET /api/v1/payments/:id
const getPayment = asyncHandler(async (req, res) => ok(req, res, getOwnPayment(req, req.payment)));

// GET /api/v1/payments/:id/receipt?format=pdf
const getPaymentReceipt = asyncHandler(async (req, res) => {
  const receipt = await getReceipt(req, req.payment);
  if (req.query.format === 'pdf') {
    sendPdf(res, receiptPdf(receipt), pdfFilename(`receipt-${receipt.receiptNumber || receipt.paymentId}`));
    return;
  }
  ok(req, res, receipt);
});

// POST /api/v1/payments/webhook   (called by the gateway; no sign-in; needs req.rawBody from app.js)
const postWebhook = asyncHandler(async (req, res) => {
  const result = await handleWebhook(req, {
    rawBody: req.rawBody,
    signature: req.get('x-razorpay-signature'),
    eventId: req.get('x-razorpay-event-id'),
  });
  ok(req, res, { received: true, ...result });
});

// POST /api/v1/refunds   { paymentId, amountPaise, reason }
const postRefund = asyncHandler(async (req, res) => {
  const body = parse(refundBody, req.body);
  const refund = await requestRefund(req, body);
  ok(req, res, refundToClient(refund), 201);
});

// POST /api/v1/refunds/:id/decision   { approve, note? }
const postRefundDecision = asyncHandler(async (req, res) => {
  const body = parse(decisionBody, req.body);
  const { refund, gatewayRefundId } = await decideRefund(req, req.refund._id, body);
  ok(req, res, { ...refundToClient(refund), gatewayRefundId });
});

// GET /api/v1/refunds?purpose=admission|exam&status=&page=&limit=
const getRefunds = asyncHandler(async (req, res) => {
  const q = parse(listQuery, req.query);
  const result = await listRefunds(q);
  ok(req, res, result.rows, 200, paged(result));
});

export { postOrder, postVerify, getPayments, getPayment, getPaymentReceipt, postWebhook, postRefund, postRefundDecision, getRefunds };

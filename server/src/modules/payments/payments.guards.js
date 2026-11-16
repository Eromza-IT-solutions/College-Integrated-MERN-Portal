import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import Payment from '../../models/Payment.js';
import Refund from '../../models/Refund.js';
import { requirePermission, getActor } from '../../middleware/requirePermission.js';
import { PAYMENT_PURPOSE } from '../../utils/constants.js';
import { idParam, parse } from './payments.validation.js';

// The permission matrix has separate resources for admission and exam money, so which one applies
// depends on the record. These guards find the record first, then run the normal requirePermission().
const PAYMENT_RESOURCE = { [PAYMENT_PURPOSE.ADMISSION]: 'admissionPayments', [PAYMENT_PURPOSE.EXAM]: 'examPayments' };
const REFUND_RESOURCE = { [PAYMENT_PURPOSE.ADMISSION]: 'admissionRefunds', [PAYMENT_PURPOSE.EXAM]: 'examRefunds' };

// One requirePermission() per resource and action, built once when the server starts.
const built = new Map();
function guardFor(resource, action) {
  const key = `${resource}|${action}`;
  if (!built.has(key)) built.set(key, requirePermission(resource, action));
  return built.get(key);
}

function signedIn(req) {
  if (!getActor(req)) throw new AppError('Please sign in', 401);
}

function run(guard, req, res) {
  return new Promise((resolve, reject) => guard(req, res, (err) => (err ? reject(err) : resolve())));
}

/** The purpose is in the body (create an order) or the query (lists): pick the right resource from it. */
function byPurpose(resourceMap, action, where = 'body') {
  return asyncHandler(async (req, res, next) => {
    signedIn(req);
    const purpose = (req[where] || {}).purpose;
    const resource = resourceMap[purpose];
    if (!resource) {
      throw new AppError('Invalid request', 400, [{ field: 'purpose', message: `purpose must be one of: ${Object.keys(resourceMap).join(', ')}` }], 'VALIDATION_ERROR');
    }
    await run(guardFor(resource, action), req, res);
    next();
  });
}

/** For /payments/:id routes: load the payment, then check the permission for its purpose. Leaves it in req.payment. */
function paymentAccess(action) {
  return asyncHandler(async (req, res, next) => {
    signedIn(req);
    const id = parse(idParam, req.params.id);
    const payment = await Payment.findById(id);
    if (!payment) throw new AppError('Payment not found', 404);
    await run(guardFor(PAYMENT_RESOURCE[payment.purpose], action), req, res);
    req.payment = payment;
    next();
  });
}

/** Refund request: the payment is named in the body; the refund permission follows the payment's purpose. */
function refundCreateAccess() {
  return asyncHandler(async (req, res, next) => {
    signedIn(req);
    const paymentId = parse(idParam, (req.body || {}).paymentId);
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    await run(guardFor(REFUND_RESOURCE[payment.purpose], 'create'), req, res);
    req.payment = payment;
    next();
  });
}

/** For /refunds/:id routes: load the refund, then check the permission for its purpose. Leaves it in req.refund. */
function refundAccess(action) {
  return asyncHandler(async (req, res, next) => {
    signedIn(req);
    const id = parse(idParam, req.params.id);
    const refund = await Refund.findById(id);
    if (!refund) throw new AppError('Refund not found', 404);
    await run(guardFor(REFUND_RESOURCE[refund.purpose], action), req, res);
    req.refund = refund;
    next();
  });
}

export { PAYMENT_RESOURCE, REFUND_RESOURCE, byPurpose, paymentAccess, refundCreateAccess, refundAccess };

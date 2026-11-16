import express from 'express';
import { byPurpose, paymentAccess, PAYMENT_RESOURCE } from './payments.guards.js';
import {
  postOrder, postVerify, getPayments, getPayment, getPaymentReceipt, postWebhook,
} from './payments.controller.js';

const router = express.Router();

// Called by the gateway, not by a person: no sign-in, the signature is the proof. Must stay above "/:id".
router.post('/webhook', postWebhook);

router.post('/orders', byPurpose(PAYMENT_RESOURCE, 'create'), postOrder);
router.get('/', byPurpose(PAYMENT_RESOURCE, 'view', 'query'), getPayments);
router.get('/:id', paymentAccess('view'), getPayment);
router.get('/:id/receipt', paymentAccess('view'), getPaymentReceipt);
router.post('/:id/verify', paymentAccess('create'), postVerify); // only someone who may pay can verify a payment

export default router;

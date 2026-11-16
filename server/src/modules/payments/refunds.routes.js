import express from 'express';
import { byPurpose, refundCreateAccess, refundAccess, REFUND_RESOURCE } from './payments.guards.js';
import { postRefund, postRefundDecision, getRefunds } from './payments.controller.js';

const router = express.Router();

router.post('/', refundCreateAccess(), postRefund);
router.get('/', byPurpose(REFUND_RESOURCE, 'view', 'query'), getRefunds);
router.post('/:id/decision', refundAccess('approve'), postRefundDecision);

export default router;

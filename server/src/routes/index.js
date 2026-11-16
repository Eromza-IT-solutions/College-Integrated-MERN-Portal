// Mounts every feature's routes under /api/v1.
// Each module keeps its own routes file; add them here as they are built:
//   router.use('/auth', require('../modules/auth/auth.routes'));
import express from 'express';
import mongoose from 'mongoose';
import env from '../config/env.js';
import buildPaymentsRouter from '../modules/payments/payments.routes.js';
import buildWebsiteRouter from '../modules/website/website.routes.js';

const router = express.Router();

// Quick check that the server and database are up.
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    },
    meta: { requestId: req.id },
  });
});

router.use('/payments', buildPaymentsRouter({ razorpay: env.razorpay }));
router.use('/website', buildWebsiteRouter());

export default router;

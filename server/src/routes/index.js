// Mounts every feature's routes under /api/v1.
// Each module keeps its own routes file; add them here as they are built:
//   router.use('/auth', authRoutes);
import express from 'express';
import mongoose from 'mongoose';

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

export default router;

// URLs for authentication. Mounted at /api/v1/auth in routes/index.js.
import express from 'express';
import { login, me, logout, forgotPassword, resetPassword } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginLimiter, forgotPasswordIpLimiter, forgotPasswordEmailLimiter, resetPasswordLimiter } from '../../middleware/rateLimiters.js';

const router = express.Router();

router.post('/login', loginLimiter, login); // POST /api/v1/auth/login
router.post('/logout', logout); // POST /api/v1/auth/logout
router.get('/me', authenticate, me); // GET  /api/v1/auth/me  (login required)
router.post('/forgot-password', forgotPasswordIpLimiter, forgotPasswordEmailLimiter, forgotPassword); // POST /api/v1/auth/forgot-password
router.post('/reset-password', resetPasswordLimiter, resetPassword); // POST /api/v1/auth/reset-password

export default router;

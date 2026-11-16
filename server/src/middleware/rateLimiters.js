// Rate limiting = "no more than N requests of this kind from this source in this time".
// It slows down people (and programs) that guess passwords or spam the "forgot password" button.
//
// How it fits in: the limiter sits in front of the route, like authenticate does.
//   router.post('/login', loginLimiter, login);
// Over the limit  -> the route never runs; the visitor gets 429 "Too many attempts" and a Retry-After header.
//
// The counters live in MongoDB (services/attemptCounter.js), so they are shared by every server instance.
import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import AuditLog from '../models/AuditLog.js';
import { AUDIT_OUTCOME } from '../utils/constants.js';
import * as counter from '../services/attemptCounter.js';
import { fingerprintIdentifier } from '../utils/identifierFingerprint.js';

// Adapter that lets express-rate-limit keep its numbers in our MongoDB counter.
class MongoRateLimitStore {
  constructor(prefix) { this.prefix = prefix; }
  init(options) { this.windowMs = options.windowMs; }
  async increment(key) {
    const { count, resetAt } = await counter.hit(this.prefix + key, this.windowMs);
    return { totalHits: count, resetTime: new Date(resetAt) };
  }
  async decrement(key) { await counter.undo(this.prefix + key); }
  async resetKey(key) { await counter.reset(this.prefix + key); }
}

// The automated test-suite fires hundreds of logins from one address, so limits are off there
// unless a test switches them on on purpose.
const enabled = () => env.nodeEnv !== 'test' || process.env.RATE_LIMIT_IN_TESTS === 'true';

/** Builds one limiter. `name` keeps the counters of different limiters apart. */
export function createLimiter({ name, windowMs, limit, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7', // RateLimit-* headers so clients can see how many attempts remain
    legacyHeaders: false,
    skipSuccessfulRequests, // true: only failed requests (status 400 or above) count
    keyGenerator, // omit to use the visitor's IP address
    store: new MongoRateLimitStore(`${name}:`),
    skip: () => !enabled(),
    handler: (req, res, next) => {
      const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfter));
      // Record the event once per blocking period (the first blocked request), not once per blocked request,
      // so an attack cannot flood the audit log.
      const firstBlocked = req.rateLimit.used === req.rateLimit.limit + 1;
      const done = firstBlocked
        ? AuditLog.record({
            action: 'rateLimited',
            entityType: 'auth',
            outcome: AUDIT_OUTCOME.DENIED,
            ip: req.ip,
            details: { limiter: name, retryAfterSeconds: retryAfter },
          }).catch((err) => console.error('Could not write audit log:', err.message))
        : Promise.resolve();
      done.then(() => next(new AppError('Too many attempts. Please wait a while and try again.', 429, undefined, 'RATE_LIMITED')));
    },
  });
}

const { security } = env;

// Sign-in: counts FAILED attempts per IP address. A successful sign-in does not use up the allowance.
export const loginLimiter = createLimiter({
  name: 'login-ip',
  windowMs: security.loginIpWindowMs,
  limit: security.loginIpMax,
  skipSuccessfulRequests: true,
});

// "Forgot password": limited per IP address AND per email address. The per-email limit stops someone using many
// different IPs to flood one person's inbox. It counts known and unknown emails alike, so it reveals nothing.
export const forgotPasswordIpLimiter = createLimiter({
  name: 'forgot-ip',
  windowMs: security.forgotWindowMs,
  limit: security.forgotIpMax,
});
export const forgotPasswordEmailLimiter = createLimiter({
  name: 'forgot-email',
  windowMs: security.forgotWindowMs,
  limit: security.forgotEmailMax,
  keyGenerator: (req) => (typeof req.body?.email === 'string' && req.body.email.trim() ? `e:${fingerprintIdentifier(req.body.email)}` : `ip:${req.ip}`),
});

// "Reset password": per IP address (the links themselves are 256-bit random and cannot be guessed).
export const resetPasswordLimiter = createLimiter({
  name: 'reset-ip',
  windowMs: security.resetWindowMs,
  limit: security.resetIpMax,
});

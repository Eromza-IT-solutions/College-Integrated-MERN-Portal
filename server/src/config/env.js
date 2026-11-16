// Reads .env and stops the server early, with a clear message, if something is missing.
import 'dotenv/config';
import crypto from 'node:crypto';

const nodeEnv = process.env.NODE_ENV || 'development';
// RATE_LIMIT_HASH_SECRET is also required in production (checked below); elsewhere a safe value is derived.
const required = nodeEnv === 'test' ? [] : ['MONGODB_URI', 'SESSION_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

// In production the secret that signs the login cookie must be long and random.
if (nodeEnv === 'production' && process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

// Secret key for the private fingerprints of typed identifiers (see utils/identifierFingerprint.js).
//   production      : RATE_LIMIT_HASH_SECRET is REQUIRED and must be at least 32 characters.
//   other (not test): used if set (and then it must also be 32+ characters); if not set, a key is DERIVED from
//                     SESSION_SECRET so development works with no extra setup.
//   test            : whatever is set, or the derived key.
// The derived key is a one-way function of SESSION_SECRET with a fixed label, so it cannot be used to recover
// SESSION_SECRET and is a different value from it.
const configuredHashSecret = process.env.RATE_LIMIT_HASH_SECRET || '';
if (nodeEnv === 'production' && !configuredHashSecret) {
  console.error('Missing environment variable: RATE_LIMIT_HASH_SECRET (required in production, 32+ characters).');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}
if (nodeEnv !== 'test' && configuredHashSecret && configuredHashSecret.length < 32) {
  console.error('RATE_LIMIT_HASH_SECRET must be at least 32 characters.');
  process.exit(1);
}
const rateLimitHashSecret =
  configuredHashSecret ||
  crypto.createHmac('sha256', process.env.SESSION_SECRET || 'test-only-secret-not-for-real-use').update('eromza:rate-limit-hash:v1').digest('hex');

// Reads a number from .env; falls back to a default when it is missing or not a positive number.
function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  rateLimitHashSecret, // never log or return this
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Name of the login cookie, and how long a user may stay idle before it expires (default 30 minutes).
  sessionName: process.env.SESSION_NAME || 'icms.sid',
  sessionMaxAgeMs: positiveNumber(process.env.SESSION_MAX_AGE_MS, 30 * 60 * 1000),
  // Brute-force protection. Every value can be changed in .env; the defaults are sensible for a college portal.
  security: {
    loginIpMax: positiveNumber(process.env.RATE_LIMIT_LOGIN_MAX, 20), // FAILED sign-ins allowed per IP address ...
    loginIpWindowMs: positiveNumber(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000), // ... in this time
    forgotIpMax: positiveNumber(process.env.RATE_LIMIT_FORGOT_IP_MAX, 5), // "forgot password" requests per IP ...
    forgotEmailMax: positiveNumber(process.env.RATE_LIMIT_FORGOT_EMAIL_MAX, 3), // ... and per email address ...
    forgotWindowMs: positiveNumber(process.env.RATE_LIMIT_FORGOT_WINDOW_MS, 60 * 60 * 1000), // ... in this time
    resetIpMax: positiveNumber(process.env.RATE_LIMIT_RESET_MAX, 10), // "reset password" requests per IP ...
    resetWindowMs: positiveNumber(process.env.RATE_LIMIT_RESET_WINDOW_MS, 60 * 60 * 1000), // ... in this time
    lockoutThreshold: positiveNumber(process.env.LOGIN_LOCKOUT_THRESHOLD, 5), // wrong passwords in a row before an account locks
    lockoutMs: positiveNumber(process.env.LOGIN_LOCKOUT_MS, 15 * 60 * 1000), // how long the lock lasts
  },
  // Outgoing email (password reset links). Real sending is on only when SMTP_HOST and EMAIL_FROM are both set.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: positiveNumber(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587 (STARTTLS)
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  },
};

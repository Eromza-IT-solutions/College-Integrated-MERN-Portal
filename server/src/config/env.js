
// Reads .env and stops the server early, with a clear message, if something is missing.
import 'dotenv/config';
import crypto from 'node:crypto';
import dns from 'node:dns';

const nodeEnv = process.env.NODE_ENV || 'development';

// RATE_LIMIT_HASH_SECRET is also required in production.
const required = nodeEnv === 'test' ? [] : ['MONGODB_URI', 'SESSION_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

// In production, the session secret must be at least 32 characters.
if (nodeEnv === 'production' && process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

// Private fingerprint secret for login identifiers.
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
  crypto.createHmac(
    'sha256',
    process.env.SESSION_SECRET || 'test-only-secret-not-for-real-use'
  ).update('eromza:rate-limit-hash:v1').digest('hex');

// Reads a number from .env; falls back to a default.
function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Some local resolvers (e.g. a 127.0.0.1 stub) refuse the SRV lookups needed by mongodb+srv://.
// Use public DNS up front. This file is imported by the server and every script, so all of them benefit.
// Set USE_SYSTEM_DNS=1 to keep the system resolver.
if (process.env.MONGODB_URI?.startsWith('mongodb+srv://') && !process.env.USE_SYSTEM_DNS) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

export default {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  rateLimitHashSecret,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Session configuration.
  sessionName: process.env.SESSION_NAME || 'icms.sid',
  sessionMaxAgeMs: positiveNumber(process.env.SESSION_MAX_AGE_MS, 30 * 60 * 1000),

  // Brute-force protection.
  security: {
    loginIpMax: positiveNumber(process.env.RATE_LIMIT_LOGIN_MAX, 20),
    loginIpWindowMs: positiveNumber(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000),
    forgotIpMax: positiveNumber(process.env.RATE_LIMIT_FORGOT_IP_MAX, 5),
    forgotEmailMax: positiveNumber(process.env.RATE_LIMIT_FORGOT_EMAIL_MAX, 3),
    forgotWindowMs: positiveNumber(process.env.RATE_LIMIT_FORGOT_WINDOW_MS, 60 * 60 * 1000),
    resetIpMax: positiveNumber(process.env.RATE_LIMIT_RESET_MAX, 10),
    resetWindowMs: positiveNumber(process.env.RATE_LIMIT_RESET_WINDOW_MS, 60 * 60 * 1000),
    lockoutThreshold: positiveNumber(process.env.LOGIN_LOCKOUT_THRESHOLD, 5),
    lockoutMs: positiveNumber(process.env.LOGIN_LOCKOUT_MS, 15 * 60 * 1000),
  },

  // Outgoing email configuration.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: positiveNumber(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  },

  // Payment gateway configuration.
  payment: {
    gateway: process.env.PAYMENT_GATEWAY || 'fake',
    keyId: process.env.PAYMENT_KEY_ID || '',
    keySecret: process.env.PAYMENT_KEY_SECRET || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  },

  // Background jobs. They are off in tests so a test run never touches live deadlines or payments.
  jobs: {
    enabled: process.env.JOBS_ENABLED ? process.env.JOBS_ENABLED === 'true' : nodeEnv !== 'test',
    runOnStart: process.env.JOBS_RUN_ON_START === 'true',
    admissionDeadlineIntervalMs: positiveNumber(process.env.ADMISSION_DEADLINE_INTERVAL_MS, 24 * 60 * 60 * 1000),
    paymentReconciliationIntervalMs: positiveNumber(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS, 15 * 60 * 1000),
    paymentReconciliationMinAgeMs: positiveNumber(process.env.PAYMENT_RECONCILIATION_MIN_AGE_MS, 30 * 60 * 1000),
    batchSize: positiveNumber(process.env.JOB_BATCH_SIZE, 100),
  },
};

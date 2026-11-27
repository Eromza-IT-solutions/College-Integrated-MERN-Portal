import 'dotenv/config';
import crypto from 'node:crypto';
import dns from 'node:dns';
import { z } from 'zod';
import { PAYMENT_GATEWAY, PAYMENT_GATEWAY_VALUES, RAZORPAY } from '../utils/constants.js';

const nodeEnv = process.env.NODE_ENV || 'development';
const inTests = nodeEnv === 'test';
const inProduction = nodeEnv === 'production';
const allowedGatewayNames = [...PAYMENT_GATEWAY_VALUES].sort();
const KEY_ID = /^[A-Za-z0-9_-]{1,32}$/;
const validDataKey = (text) => typeof text === 'string' && Buffer.from(text, 'base64').length === 32
  && Buffer.from(text, 'base64').toString('base64') === text;

function requiredText(label, min, message) {
  let schema = z.string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .min(1, `${label} is required`);
  if (min) schema = schema.min(min, message || `${label} must be at least ${min} characters`);
  return schema;
}

function optionalText(label, min, message, fallback = '') {
  let schema = z.string({ invalid_type_error: `${label} must be text` });
  if (min) schema = schema.min(min, message || `${label} must be at least ${min} characters`);
  return schema.default(fallback);
}

function strictPositiveNumber(label, fallback) {
  return z.coerce.number({
    required_error: `${label} is required`,
    invalid_type_error: `${label} must be a positive whole number`,
  })
    .int(`${label} must be a positive whole number`)
    .positive(`${label} must be a positive whole number`)
    .default(fallback);
}

const envSchema = z.object({
  NODE_ENV: optionalText('NODE_ENV').default('development'),
  MONGODB_URI: inTests ? optionalText('MONGODB_URI') : requiredText('MONGODB_URI'),
  SESSION_SECRET: inTests
    ? optionalText('SESSION_SECRET')
    : requiredText('SESSION_SECRET', inProduction ? 32 : 1, 'SESSION_SECRET must be at least 32 characters in production.'),
  RATE_LIMIT_HASH_SECRET: optionalText('RATE_LIMIT_HASH_SECRET'),
  LOGIN_ID_HASH_SECRET: inTests
    ? optionalText('LOGIN_ID_HASH_SECRET')
    : requiredText('LOGIN_ID_HASH_SECRET', 16, 'LOGIN_ID_HASH_SECRET must be at least 16 characters.'),
  FIELD_ENCRYPTION_KEY: inTests
    ? optionalText('FIELD_ENCRYPTION_KEY')
    : requiredText('FIELD_ENCRYPTION_KEY', 44, 'FIELD_ENCRYPTION_KEY must be 32 bytes encoded as base64.'),
  FIELD_ENCRYPTION_KEY_ID: optionalText('FIELD_ENCRYPTION_KEY_ID', 1, 'FIELD_ENCRYPTION_KEY_ID must be 1-32 letters, digits, _ or -.', 'v1'),
  FIELD_ENCRYPTION_PREVIOUS_KEYS: optionalText('FIELD_ENCRYPTION_PREVIOUS_KEYS').default('{}'),
  PAYMENT_GATEWAY: inTests
    ? optionalText('PAYMENT_GATEWAY', 0, undefined, PAYMENT_GATEWAY.FAKE)
    : requiredText('PAYMENT_GATEWAY'),
  PAYMENT_KEY_ID: optionalText('PAYMENT_KEY_ID'),
  PAYMENT_KEY_SECRET: optionalText('PAYMENT_KEY_SECRET'),
  PAYMENT_WEBHOOK_SECRET: optionalText('PAYMENT_WEBHOOK_SECRET'),
  PAYMENT_RECONCILIATION_INTERVAL_MS: strictPositiveNumber('PAYMENT_RECONCILIATION_INTERVAL_MS', 15 * 60 * 1000),
  PAYMENT_RECONCILIATION_MIN_AGE_MS: strictPositiveNumber('PAYMENT_RECONCILIATION_MIN_AGE_MS', 30 * 60 * 1000),
}).strict().superRefine((config, ctx) => {
  if (config.RATE_LIMIT_HASH_SECRET && config.RATE_LIMIT_HASH_SECRET.length < 32) {
    ctx.addIssue({
      code: 'custom',
      path: ['RATE_LIMIT_HASH_SECRET'],
      message: 'RATE_LIMIT_HASH_SECRET must be at least 32 characters.',
    });
  }

  if (inProduction && !config.RATE_LIMIT_HASH_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['RATE_LIMIT_HASH_SECRET'],
      message: 'RATE_LIMIT_HASH_SECRET is required in production (at least 32 characters).',
    });
  }

  if (config.FIELD_ENCRYPTION_KEY) {
    const decoded = Buffer.from(config.FIELD_ENCRYPTION_KEY, 'base64');
    if (decoded.length !== 32 || decoded.toString('base64') !== config.FIELD_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['FIELD_ENCRYPTION_KEY'],
        message: 'FIELD_ENCRYPTION_KEY must be exactly 32 bytes encoded as standard base64.',
      });
    }
  }

  if (!KEY_ID.test(config.FIELD_ENCRYPTION_KEY_ID)) {
    ctx.addIssue({
      code: 'custom',
      path: ['FIELD_ENCRYPTION_KEY_ID'],
      message: 'FIELD_ENCRYPTION_KEY_ID must be 1-32 letters, digits, _ or -.',
    });
  }

  let previousKeys;
  try {
    previousKeys = JSON.parse(config.FIELD_ENCRYPTION_PREVIOUS_KEYS || '{}');
  } catch {
    previousKeys = null;
  }
  if (!previousKeys || Array.isArray(previousKeys) || typeof previousKeys !== 'object') {
    ctx.addIssue({
      code: 'custom',
      path: ['FIELD_ENCRYPTION_PREVIOUS_KEYS'],
      message: 'FIELD_ENCRYPTION_PREVIOUS_KEYS must be a JSON object of key IDs to base64 keys.',
    });
  } else {
    for (const [id, value] of Object.entries(previousKeys)) {
      if (!KEY_ID.test(id) || !validDataKey(value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['FIELD_ENCRYPTION_PREVIOUS_KEYS'],
          message: 'FIELD_ENCRYPTION_PREVIOUS_KEYS contains an invalid key ID or key (values are never printed).',
        });
        break;
      }
      if (id === config.FIELD_ENCRYPTION_KEY_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['FIELD_ENCRYPTION_PREVIOUS_KEYS'],
          message: 'FIELD_ENCRYPTION_PREVIOUS_KEYS must not repeat the current FIELD_ENCRYPTION_KEY_ID.',
        });
        break;
      }
    }
  }

  if (!PAYMENT_GATEWAY_VALUES.includes(config.PAYMENT_GATEWAY)) {
    ctx.addIssue({
      code: 'custom',
      path: ['PAYMENT_GATEWAY'],
      message: `PAYMENT_GATEWAY must be one of: ${allowedGatewayNames.join(', ')}`,
    });
    return;
  }

  if (inProduction && config.PAYMENT_GATEWAY === PAYMENT_GATEWAY.FAKE) {
    ctx.addIssue({
      code: 'custom',
      path: ['PAYMENT_GATEWAY'],
      message: 'PAYMENT_GATEWAY=fake is not allowed when NODE_ENV=production',
    });
  }

  if (config.PAYMENT_GATEWAY === PAYMENT_GATEWAY.RAZORPAY) {
    const paymentFields = [
      ['PAYMENT_KEY_ID', config.PAYMENT_KEY_ID],
      ['PAYMENT_KEY_SECRET', config.PAYMENT_KEY_SECRET],
      ['PAYMENT_WEBHOOK_SECRET', config.PAYMENT_WEBHOOK_SECRET],
    ];
    for (const [name, value] of paymentFields) {
      if (!value) {
        ctx.addIssue({ code: 'custom', path: [name], message: `${name} is required when PAYMENT_GATEWAY=razorpay` });
      }
    }
    if (config.PAYMENT_KEY_ID && !config.PAYMENT_KEY_ID.startsWith(RAZORPAY.testKeyPrefix)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENT_KEY_ID'],
        message: `PAYMENT_KEY_ID must start with ${RAZORPAY.testKeyPrefix}`,
      });
    }
  }
});

const watchedKeys = [
  'NODE_ENV',
  'MONGODB_URI',
  'SESSION_SECRET',
  'RATE_LIMIT_HASH_SECRET',
  'LOGIN_ID_HASH_SECRET',
  'FIELD_ENCRYPTION_KEY',
  'FIELD_ENCRYPTION_KEY_ID',
  'FIELD_ENCRYPTION_PREVIOUS_KEYS',
  'PAYMENT_GATEWAY',
  'PAYMENT_KEY_ID',
  'PAYMENT_KEY_SECRET',
  'PAYMENT_WEBHOOK_SECRET',
  'PAYMENT_RECONCILIATION_INTERVAL_MS',
  'PAYMENT_RECONCILIATION_MIN_AGE_MS',
];

const input = Object.fromEntries(
  watchedKeys.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]])
);

const parsed = envSchema.safeParse(input);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.') || 'environment'}: ${issue.message}`);
  }
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const config = parsed.data;
const fieldEncryptionPreviousKeys = JSON.parse(config.FIELD_ENCRYPTION_PREVIOUS_KEYS || '{}');

const rateLimitHashSecret =
  config.RATE_LIMIT_HASH_SECRET ||
  crypto.createHmac(
    'sha256',
    config.SESSION_SECRET || 'test-only-secret-not-for-real-use'
  ).update('eromza:rate-limit-hash:v1').digest('hex');

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

if (config.MONGODB_URI?.startsWith('mongodb+srv://') && !process.env.USE_SYSTEM_DNS) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

export default {
  nodeEnv: config.NODE_ENV,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: config.MONGODB_URI,
  sessionSecret: config.SESSION_SECRET,
  loginIdHashSecret: config.LOGIN_ID_HASH_SECRET,
  fieldEncryptionKey: config.FIELD_ENCRYPTION_KEY
    || crypto.createHash('sha256').update('eromza:field-encryption:test-only').digest('base64'),
  fieldEncryptionKeyId: config.FIELD_ENCRYPTION_KEY_ID,
  fieldEncryptionPreviousKeys,
  rateLimitHashSecret,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  sessionName: process.env.SESSION_NAME || 'icms.sid',
  sessionMaxAgeMs: positiveNumber(process.env.SESSION_MAX_AGE_MS, 30 * 60 * 1000),

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

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: positiveNumber(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  },

  payment: {
    gateway: config.PAYMENT_GATEWAY,
    keyId: config.PAYMENT_KEY_ID,
    keySecret: config.PAYMENT_KEY_SECRET,
    webhookSecret: config.PAYMENT_WEBHOOK_SECRET,
  },

  jobs: {
    enabled: process.env.JOBS_ENABLED ? process.env.JOBS_ENABLED === 'true' : nodeEnv !== 'test',
    runOnStart: process.env.JOBS_RUN_ON_START === 'true',
    admissionDeadlineIntervalMs: positiveNumber(process.env.ADMISSION_DEADLINE_INTERVAL_MS, 24 * 60 * 60 * 1000),
    paymentReconciliationIntervalMs: config.PAYMENT_RECONCILIATION_INTERVAL_MS,
    paymentReconciliationMinAgeMs: config.PAYMENT_RECONCILIATION_MIN_AGE_MS,
    batchSize: positiveNumber(process.env.JOB_BATCH_SIZE, 100),
  },
};

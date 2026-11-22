import { jest } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

jest.setTimeout(60000);

const serverDir = fileURLToPath(new URL('..', import.meta.url));
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

const validProductionPayment = {
  PAYMENT_GATEWAY: 'razorpay',
  PAYMENT_KEY_ID: 'rzp_test_validkey123',
  PAYMENT_KEY_SECRET: 'valid-payment-key-secret-for-tests',
  PAYMENT_WEBHOOK_SECRET: 'valid-webhook-secret-for-tests',
};

const validFieldEncryptionKey = Buffer.alloc(32, 7).toString('base64');

const baseEnv = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
  SESSION_SECRET: 'session-secret-long-enough-for-env-tests-0123456789',
  RATE_LIMIT_HASH_SECRET: 'rate-limit-hash-secret-long-enough-for-env-tests',
  LOGIN_ID_HASH_SECRET: 'login-id-hash-secret-long-enough',
  FIELD_ENCRYPTION_KEY: validFieldEncryptionKey,
  ...validProductionPayment,
};

function loadEnv(vars = {}) {
  const childEnv = { ...process.env, DOTENV_CONFIG_PATH: 'no-such-file.env' };
  for (const key of watchedKeys) delete childEnv[key];
  Object.assign(childEnv, baseEnv, vars);
  for (const key of Object.keys(childEnv)) if (childEnv[key] === undefined) delete childEnv[key];

  const script = "import('./src/config/env.js').then((m) => console.log('CONFIG=' + JSON.stringify({ gateway: m.default.payment.gateway, intervalMs: m.default.jobs.paymentReconciliationIntervalMs, minAgeMs: m.default.jobs.paymentReconciliationMinAgeMs, loginIdHashSecretConfigured: Boolean(m.default.loginIdHashSecret), fieldEncryptionKeyConfigured: Boolean(m.default.fieldEncryptionKey) })))";
  try {
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: serverDir,
      env: childEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: String(err.stdout || ''), stderr: String(err.stderr || '') };
  }
}

describe('startup environment validation', () => {
  test('production accepts a complete Razorpay test-mode configuration', () => {
    const result = loadEnv();
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('"gateway":"razorpay"');
    expect(result.stdout).toContain('"intervalMs":900000');
    expect(result.stdout).toContain('"minAgeMs":1800000');
    expect(result.stdout).toContain('"loginIdHashSecretConfigured":true');
    expect(result.stdout).toContain('"fieldEncryptionKeyConfigured":true');
  });

  test('PAYMENT_GATEWAY is required outside tests', () => {
    const result = loadEnv({ NODE_ENV: 'development', PAYMENT_GATEWAY: undefined });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_GATEWAY is required/);
  });

  test('unknown PAYMENT_GATEWAY values are refused with the allowed values', () => {
    const result = loadEnv({ NODE_ENV: 'development', PAYMENT_GATEWAY: 'paypal' });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_GATEWAY must be one of: fake, razorpay/);
  });

  test('production refuses the fake gateway', () => {
    const result = loadEnv({ PAYMENT_GATEWAY: 'fake' });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_GATEWAY=fake is not allowed when NODE_ENV=production/);
  });

  test('Razorpay credentials are required when the gateway is Razorpay', () => {
    const result = loadEnv({ PAYMENT_KEY_SECRET: undefined });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_KEY_SECRET is required when PAYMENT_GATEWAY=razorpay/);
  });

  test('live Razorpay keys are refused without printing their value', () => {
    const secretLiveKey = 'rzp_live_secret_value_123';
    const result = loadEnv({ PAYMENT_KEY_ID: secretLiveKey });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_KEY_ID must start with rzp_test_/);
    expect(result.stderr).not.toContain(secretLiveKey);
  });

  test('malformed PAYMENT_RECONCILIATION_INTERVAL_MS fails startup', () => {
    const result = loadEnv({ PAYMENT_RECONCILIATION_INTERVAL_MS: 'soon' });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_RECONCILIATION_INTERVAL_MS must be a positive whole number/);
  });

  test('malformed PAYMENT_RECONCILIATION_MIN_AGE_MS fails startup', () => {
    const result = loadEnv({ PAYMENT_RECONCILIATION_MIN_AGE_MS: '1.5' });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/PAYMENT_RECONCILIATION_MIN_AGE_MS must be a positive whole number/);
  });

  test('LOGIN_ID_HASH_SECRET is required outside tests', () => {
    const result = loadEnv({ LOGIN_ID_HASH_SECRET: undefined });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/LOGIN_ID_HASH_SECRET is required/);
  });

  test('short LOGIN_ID_HASH_SECRET is refused without printing its value', () => {
    const shortSecret = 'short-login-sec';
    const result = loadEnv({ LOGIN_ID_HASH_SECRET: shortSecret });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/LOGIN_ID_HASH_SECRET must be at least 16 characters/);
    expect(result.stderr).not.toContain(shortSecret);
  });

  test('FIELD_ENCRYPTION_KEY is required outside tests', () => {
    const result = loadEnv({ FIELD_ENCRYPTION_KEY: undefined });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/FIELD_ENCRYPTION_KEY is required/);
  });

  test('short FIELD_ENCRYPTION_KEY is refused without printing its value', () => {
    const shortKey = Buffer.alloc(16, 3).toString('base64');
    const result = loadEnv({ FIELD_ENCRYPTION_KEY: shortKey });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/FIELD_ENCRYPTION_KEY must be 32 bytes encoded as base64/);
    expect(result.stderr).not.toContain(shortKey);
  });

  test('malformed FIELD_ENCRYPTION_KEY is refused without printing its value', () => {
    const badKey = 'this-is-not-canonical-base64-at-all!!';
    const result = loadEnv({ FIELD_ENCRYPTION_KEY: badKey });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/FIELD_ENCRYPTION_KEY must be exactly 32 bytes encoded as standard base64/);
    expect(result.stderr).not.toContain(badKey);
  });

  test('FIELD_ENCRYPTION_KEY_ID accepts a short label', () => {
    const result = loadEnv({ FIELD_ENCRYPTION_KEY_ID: 'v2' });
    expect(result.code).toBe(0);
  });

  test('malformed FIELD_ENCRYPTION_KEY_ID is refused', () => {
    const result = loadEnv({ FIELD_ENCRYPTION_KEY_ID: 'bad id!' });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/FIELD_ENCRYPTION_KEY_ID must be 1-32 letters/);
  });

  test('valid previous keys are accepted and invalid ones are refused without printing values', () => {
    const oldKey = Buffer.alloc(32, 9).toString('base64');
    expect(loadEnv({
      FIELD_ENCRYPTION_KEY_ID: 'v2',
      FIELD_ENCRYPTION_PREVIOUS_KEYS: JSON.stringify({ v1: oldKey }),
    }).code).toBe(0);

    const result = loadEnv({ FIELD_ENCRYPTION_PREVIOUS_KEYS: '{"v1":"not-a-key"}' });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/FIELD_ENCRYPTION_PREVIOUS_KEYS contains an invalid key ID or key/);
    expect(result.stderr).not.toContain('not-a-key');
  });
});

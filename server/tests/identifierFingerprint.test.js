import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import env from '../src/config/env.js';
import { canonicalIdentifier, fingerprintIdentifier } from '../src/utils/identifierFingerprint.js';

jest.setTimeout(60000);

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

describe('canonicalIdentifier: one standard spelling per person', () => {
  test.each([
    ['Aman@Demo.example', { type: 'email', value: 'aman@demo.example' }],
    ['  AMAN@demo.EXAMPLE  ', { type: 'email', value: 'aman@demo.example' }],
    ['9876543210', { type: 'mobile', value: '9876543210' }],
    ['98765 43210', { type: 'mobile', value: '9876543210' }],
    ['98765-43210', { type: 'mobile', value: '9876543210' }],
    ['+91 98765 43210', { type: 'mobile', value: '9876543210' }],
    ['+919876543210', { type: 'mobile', value: '9876543210' }],
    ['123456789012', { type: 'aadhaar', value: '123456789012' }],
    ['1234 5678 9012', { type: 'aadhaar', value: '123456789012' }],
    ['1234-5678-9012', { type: 'aadhaar', value: '123456789012' }],
    ['  Some Random TEXT ', { type: 'other', value: 'some random text' }],
    ['12345', { type: 'other', value: '12345' }],
    ['', { type: 'other', value: '' }],
  ])('%j', (input, expected) => {
    expect(canonicalIdentifier(input)).toEqual(expected);
  });

  test('odd inputs never throw', () => {
    for (const odd of [undefined, null, 12345, {}, [], true]) expect(() => canonicalIdentifier(odd)).not.toThrow();
  });
});

describe('fingerprintIdentifier', () => {
  test('is 32 hexadecimal characters and repeatable', () => {
    const f = fingerprintIdentifier('9876543210');
    expect(f).toMatch(/^[0-9a-f]{32}$/);
    expect(fingerprintIdentifier('9876543210')).toBe(f);
  });

  test('every spelling of the same MOBILE number gives the same fingerprint', () => {
    const spellings = ['9876543210', '98765 43210', '98765-43210', '+91 98765 43210', '+91 98765-43210', '+919876543210', ' 9876543210 '];
    expect(new Set(spellings.map(fingerprintIdentifier)).size).toBe(1);
  });

  test('every spelling of the same AADHAAR number gives the same fingerprint', () => {
    const spellings = ['123456789012', '1234 5678 9012', '1234-5678-9012', ' 1234 5678 9012 '];
    expect(new Set(spellings.map(fingerprintIdentifier)).size).toBe(1);
  });

  test('every spelling of the same EMAIL gives the same fingerprint', () => {
    const spellings = ['aman@demo.example', 'Aman@Demo.example', ' AMAN@DEMO.EXAMPLE ', '\taman@demo.example\n'];
    expect(new Set(spellings.map(fingerprintIdentifier)).size).toBe(1);
  });

  test('different people give different fingerprints', () => {
    const all = ['9876543210', '9876543211', '123456789012', '123456789013', 'a@demo.example', 'b@demo.example', 'some text'];
    expect(new Set(all.map(fingerprintIdentifier)).size).toBe(all.length);
  });

  test('the TYPE is part of the fingerprint: text that merely looks like another kind never collides', () => {
    expect(fingerprintIdentifier('mobile:9876543210')).not.toBe(fingerprintIdentifier('9876543210'));
    expect(fingerprintIdentifier('aadhaar:123456789012')).not.toBe(fingerprintIdentifier('123456789012'));
    expect(fingerprintIdentifier('other:hello')).not.toBe(fingerprintIdentifier('hello'));
  });

  test('it is KEYED: not a plain SHA-256, so it cannot be matched by hashing guesses', () => {
    const f = fingerprintIdentifier('9876543210');
    for (const guess of ['9876543210', 'mobile:9876543210', 'other:9876543210']) expect(f).not.toBe(sha256(guess).slice(0, 32));
    expect(f).not.toBe(crypto.createHash('sha256').update('9876543210'.trim().toLowerCase()).digest('hex').slice(0, 32)); // the OLD scheme
  });

  test('a different secret gives a different fingerprint (and the original is restored afterwards)', () => {
    const original = env.rateLimitHashSecret;
    const before = fingerprintIdentifier('9876543210');
    env.rateLimitHashSecret = 'a-completely-different-test-secret-0123456789';
    const other = fingerprintIdentifier('9876543210');
    env.rateLimitHashSecret = original;
    expect(other).not.toBe(before);
    expect(fingerprintIdentifier('9876543210')).toBe(before);
  });

  test('it does not contain the input, and odd or huge inputs are safe', () => {
    expect(fingerprintIdentifier('9876543210')).not.toContain('98765');
    for (const odd of [undefined, null, 42, {}, 'x'.repeat(1_000_000)]) expect(fingerprintIdentifier(odd)).toMatch(/^[0-9a-f]{32}$/);
  });

  test('the secret is never the SESSION_SECRET itself', () => {
    expect(env.rateLimitHashSecret).not.toBe(env.sessionSecret);
    expect(env.rateLimitHashSecret.length).toBeGreaterThanOrEqual(32);
  });
});

// ---- the environment rules, checked in a separate Node process so process.exit() cannot stop the test run ----
describe('RATE_LIMIT_HASH_SECRET configuration (env.js)', () => {
  const serverDir = fileURLToPath(new URL('..', import.meta.url));
  const FAKE_SESSION_SECRET = 'fake-session-secret-for-this-test-only-0123456789';
  const FAKE_HASH_SECRET = 'fake-hash-secret-for-this-test-only-0123456789abc';
  const FAKE_LOGIN_HASH_SECRET = 'fake-login-hash-secret-for-tests';
  const VALID_PRODUCTION_PAYMENT_ENV = {
    PAYMENT_GATEWAY: 'razorpay',
    PAYMENT_KEY_ID: 'rzp_test_validkey',
    PAYMENT_KEY_SECRET: 'valid-payment-key-secret',
    PAYMENT_WEBHOOK_SECRET: 'valid-webhook-secret',
  };
  const VALID_DEVELOPMENT_PAYMENT_ENV = { PAYMENT_GATEWAY: 'fake' };

  function loadEnvIn(vars) {
    const childEnv = { ...process.env, DOTENV_CONFIG_PATH: 'no-such-file.env', MONGODB_URI: 'mongodb://127.0.0.1:1/unused', SESSION_SECRET: FAKE_SESSION_SECRET };
    delete childEnv.RATE_LIMIT_HASH_SECRET;
    delete childEnv.LOGIN_ID_HASH_SECRET;
    delete childEnv.PAYMENT_GATEWAY;
    delete childEnv.PAYMENT_KEY_ID;
    delete childEnv.PAYMENT_KEY_SECRET;
    delete childEnv.PAYMENT_WEBHOOK_SECRET;
    Object.assign(childEnv, vars);
    const defaultPaymentEnv = childEnv.NODE_ENV === 'production' ? VALID_PRODUCTION_PAYMENT_ENV : VALID_DEVELOPMENT_PAYMENT_ENV;
    for (const [key, value] of Object.entries(defaultPaymentEnv)) {
      if (childEnv[key] === undefined) childEnv[key] = value;
    }
    if (childEnv.LOGIN_ID_HASH_SECRET === undefined) childEnv.LOGIN_ID_HASH_SECRET = FAKE_LOGIN_HASH_SECRET;
    for (const k of Object.keys(childEnv)) if (childEnv[k] === undefined) delete childEnv[k];
    try {
      const stdout = execFileSync(
        process.execPath,
        ['--input-type=module', '-e', "import('./src/config/env.js').then((m) => console.log('SECRET=' + m.default.rateLimitHashSecret))"],
        { cwd: serverDir, env: childEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
      return { code: 0, stdout, stderr: '' };
    } catch (err) {
      return { code: err.status, stdout: String(err.stdout || ''), stderr: String(err.stderr || '') };
    }
  }

  test('production WITHOUT the secret: the server refuses to start, with a clear message', () => {
    const r = loadEnvIn({ NODE_ENV: 'production' });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/RATE_LIMIT_HASH_SECRET/);
    expect(r.stderr).toMatch(/required in production/);
  });

  test('production with a SHORT secret: refused', () => {
    const r = loadEnvIn({ NODE_ENV: 'production', RATE_LIMIT_HASH_SECRET: 'y'.repeat(31) }); // one character too short
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/at least 32 characters/);
  });

  test('production with a secret of exactly 32 characters: accepted and used', () => {
    const exactly32 = 'x'.repeat(32);
    const r = loadEnvIn({ NODE_ENV: 'production', RATE_LIMIT_HASH_SECRET: exactly32 });
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe(`SECRET=${exactly32}`);
  });

  test('production: the error messages never print the secret values', () => {
    const r = loadEnvIn({ NODE_ENV: 'production', RATE_LIMIT_HASH_SECRET: 'short-but-secret-value' });
    expect(r.code).toBe(1);
    expect(r.stderr).not.toContain('short-but-secret-value');
    expect(r.stderr).not.toContain(FAKE_SESSION_SECRET);
  });

  test('development without the secret: a value is derived from SESSION_SECRET (different from it, and repeatable)', () => {
    const expected = crypto.createHmac('sha256', FAKE_SESSION_SECRET).update('eromza:rate-limit-hash:v1').digest('hex');
    const a = loadEnvIn({ NODE_ENV: 'development' });
    const b = loadEnvIn({ NODE_ENV: 'development' });
    expect(a.code).toBe(0);
    expect(a.stdout.trim()).toBe(`SECRET=${expected}`);
    expect(b.stdout).toBe(a.stdout);
    expect(a.stdout).not.toContain(FAKE_SESSION_SECRET);
  });

  test('a different SESSION_SECRET gives a different derived value', () => {
    const a = loadEnvIn({ NODE_ENV: 'development' });
    const b = loadEnvIn({ NODE_ENV: 'development', SESSION_SECRET: 'another-fake-session-secret-0123456789-abcdef' });
    expect(a.stdout).not.toBe(b.stdout);
  });

  test('development with the secret set: it is used instead of the derived one', () => {
    const r = loadEnvIn({ NODE_ENV: 'development', RATE_LIMIT_HASH_SECRET: FAKE_HASH_SECRET });
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe(`SECRET=${FAKE_HASH_SECRET}`);
  });

  test('development with a too-short secret set: refused (a weak key is worse than none)', () => {
    const r = loadEnvIn({ NODE_ENV: 'development', RATE_LIMIT_HASH_SECRET: 'short' });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/at least 32 characters/);
  });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import app from '../src/app.js';
import env from '../src/config/env.js';
import { createSessionMiddleware } from '../src/config/session.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import authRoutes from '../src/modules/auth/auth.routes.js';
import User from '../src/models/User.js';
import AuthToken from '../src/models/AuthToken.js';
import AuditLog from '../src/models/AuditLog.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import { emailMode, setEmailTransportForTests } from '../src/services/emailService.js';
import { validatePassword } from '../src/utils/passwordPolicy.js';

const OLD_PASSWORD = 'Correct-Horse-Battery-9';
const NEW_PASSWORD = 'Brand-New-Secret-77x';
const store = new session.MemoryStore();
store.setMaxListeners(0);

function testApp() {
  const a = express();
  a.use(requestId);
  a.use(express.json());
  a.use(createSessionMiddleware({ store }));
  a.use('/api/v1/auth', authRoutes);
  a.use(errorHandler);
  return a;
}

// A fake mail server: remembers every message instead of sending it.
let sent;
let failSending = false;
const fakeTransport = { sendMail: async (msg) => { if (failSending) throw new Error('SMTP down'); sent.push(msg); } };
const waitFor = async (cond, ms = 2000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 10)); } };
const tokenFrom = (msg) => msg.text.match(/token=([0-9a-f]{64})/)[1];

let mongod;
let oldHash;
const forgot = (email) => request(testApp()).post('/api/v1/auth/forgot-password').send({ email });
const reset = (token, password = NEW_PASSWORD, a = testApp()) => request(a).post('/api/v1/auth/reset-password').send({ token, password });
const loginWith = (agent, identifier, password) => agent.post('/api/v1/auth/login').send({ identifier, password });

// A fresh user for each test, so tests cannot affect each other.
let counter = 0;
async function newUser(extra = {}) {
  counter += 1;
  return User.create({ fullName: `Test Person ${counter}`, email: `user${counter}@demo.example`, passwordHash: oldHash, role: 'student', status: 'active', ...extra });
}
// Asks for a reset link and returns the raw token that the "email" contained.
async function requestToken(user) {
  const before = sent.length;
  expect((await forgot(user.email)).status).toBe(200);
  await waitFor(() => sent.length > before);
  return tokenFrom(sent[sent.length - 1]);
}

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri());
  oldHash = await hashPassword(OLD_PASSWORD);
}, 120000);
afterAll(async () => {
  setEmailTransportForTests(null);
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(() => { sent = []; failSending = false; setEmailTransportForTests(fakeTransport); });

describe('POST /auth/forgot-password', () => {
  test('registered email: generic 200, and an email with a one-time link is sent', async () => {
    const user = await newUser();
    const res = await forgot(user.email.toUpperCase());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    await waitFor(() => sent.length === 1);
    expect(sent[0].to).toBe(user.email);
    expect(sent[0].text).toContain(`${env.clientOrigin}/reset-password?token=`);
    expect(sent[0].html).toContain('/reset-password?token=');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('the response never contains the token, and only a HASH of it is stored', async () => {
    const user = await newUser();
    const res = await forgot(user.email);
    await waitFor(() => sent.length === 1);
    const raw = tokenFrom(sent[0]);
    expect(JSON.stringify(res.body)).not.toContain(raw);
    const rows = await AuthToken.find({ userId: user._id }).lean();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(raw);
    expect(rows[0].tokenHash).toBe(AuthToken.hash(raw));
    expect(rows[0].expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
    expect(rows[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
  });

  test('unknown email gives the very same answer and sends nothing', async () => {
    const user = await newUser();
    const known = await forgot(user.email);
    const unknown = await forgot('nobody-here@demo.example');
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toEqual(known.body.data);
    await new Promise((r) => setTimeout(r, 100));
    expect(sent).toHaveLength(1); // only the real account got an email
  });

  test.each([['deactivated'], ['locked'], ['pending']])('a %s account gets the same answer but no email and no token', async (status) => {
    const user = await newUser({ status });
    const res = await forgot(user.email);
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    expect(sent).toHaveLength(0);
    expect(await AuthToken.countDocuments({ userId: user._id })).toBe(0);
  });

  test.each([[{}], [{ email: '' }], [{ email: 'not-an-email' }], [{ email: ['a@b.co'] }], [{ email: { $ne: null } }]])('bad body %j gives 400', async (body) => {
    const res = await request(testApp()).post('/api/v1/auth/forgot-password').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('asking again makes the earlier link stop working; only the newest works', async () => {
    const user = await newUser();
    const first = await requestToken(user);
    const second = await requestToken(user);
    expect((await reset(first)).status).toBe(400);
    expect((await reset(second)).status).toBe(200);
  });

  test('an email failure does not change the answer or crash', async () => {
    failSending = true;
    const user = await newUser();
    const res = await forgot(user.email);
    expect(res.status).toBe(200);
  });

  test('with no SMTP configured the request still answers 200, and the mode is "disabled" outside development', async () => {
    setEmailTransportForTests(null);
    expect(emailMode()).toBe('disabled'); // NODE_ENV is "test"
    const user = await newUser();
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await forgot(user.email);
    expect(res.status).toBe(200);
    await waitFor(() => errors.mock.calls.length > 0);
    expect(errors.mock.calls[0][0]).toMatch(/NOT sent \(SMTP is not configured\)/);
    expect(JSON.stringify(errors.mock.calls)).not.toMatch(/token=/); // no link in the logs
    errors.mockRestore();
  });

  test('audit rows exist and contain neither the email nor the token', async () => {
    await AuditLog.collection.deleteMany({});
    const user = await newUser();
    await forgot(user.email);
    await forgot('ghost@demo.example');
    await waitFor(() => sent.length === 1);
    const rows = await AuditLog.find({ action: 'passwordResetRequested' }).lean();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.outcome).sort()).toEqual(['failed', 'success']);
    const dump = JSON.stringify(rows);
    for (const secret of [user.email, 'ghost@demo.example', tokenFrom(sent[0])]) expect(dump).not.toContain(secret);
  });
});

describe('POST /auth/reset-password', () => {
  test('valid token: password changes, old password stops working, new one works', async () => {
    const user = await newUser({ mustChangePassword: true });
    const token = await requestToken(user);
    const res = await reset(token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const fresh = await User.findById(user._id).select('+passwordHash');
    expect(await verifyPassword(NEW_PASSWORD, fresh.passwordHash)).toBe(true);
    expect(fresh.passwordHash).not.toContain(NEW_PASSWORD);
    expect(fresh.mustChangePassword).toBe(false);
    expect(fresh.passwordChangedAt).toBeInstanceOf(Date);

    expect((await loginWith(request(testApp()), user.email, OLD_PASSWORD)).status).toBe(401);
    expect((await loginWith(request(testApp()), user.email, NEW_PASSWORD)).status).toBe(200);
  });

  test('a token can be used only once', async () => {
    const user = await newUser();
    const token = await requestToken(user);
    expect((await reset(token)).status).toBe(200);
    const again = await reset(token, 'Another-Fine-Secret-55y');
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect((await loginWith(request(testApp()), user.email, NEW_PASSWORD)).status).toBe(200); // password was not changed again
  });

  test('two simultaneous uses of one token: exactly one succeeds', async () => {
    const user = await newUser();
    const token = await requestToken(user);
    const results = await Promise.all([reset(token, 'First-Winner-Secret-1a'), reset(token, 'Second-Winner-Secret-2b')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  test('wrong, made-up and malformed tokens are rejected with the same generic error', async () => {
    for (const t of ['a'.repeat(64), 'not-a-real-token-at-all', '0123456789']) {
      const res = await reset(t);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    }
  });

  test('an expired token is rejected', async () => {
    const user = await newUser();
    const token = await requestToken(user);
    await AuthToken.updateOne({ tokenHash: AuthToken.hash(token) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await reset(token);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect((await loginWith(request(testApp()), user.email, OLD_PASSWORD)).status).toBe(200); // password untouched
  });

  test('a token made for another purpose (email verification) cannot reset a password', async () => {
    const user = await newUser();
    const raw = await AuthToken.issue(user._id, 'emailVerification');
    expect((await reset(raw)).status).toBe(400);
  });

  test('a weak password is refused and does NOT use up the link', async () => {
    const user = await newUser();
    const token = await requestToken(user);
    for (const weak of ['short', 'aaaaaaaaaaaaaaaa', 'Password-Is-Long-Enough-1']) {
      const res = await reset(token, weak);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    }
    expect((await reset(token)).status).toBe(200); // the same link still works with a good password
  });

  test.each([[{}], [{ token: 'x'.repeat(64) }], [{ password: NEW_PASSWORD }], [{ token: { $ne: null }, password: NEW_PASSWORD }], [{ token: 'x'.repeat(300), password: NEW_PASSWORD }]])('bad body %j gives 400', async (body) => {
    const res = await request(testApp()).post('/api/v1/auth/reset-password').send(body);
    expect(res.status).toBe(400);
  });

  test('account deactivated after the link was sent: reset is refused', async () => {
    const user = await newUser();
    const token = await requestToken(user);
    await User.updateOne({ _id: user._id }, { $set: { status: 'deactivated' } });
    expect((await reset(token)).status).toBe(400);
    const fresh = await User.findById(user._id).select('+passwordHash');
    expect(await verifyPassword(OLD_PASSWORD, fresh.passwordHash)).toBe(true);
  });

  test('a "password changed" notice is emailed', async () => {
    const user = await newUser();
    const token = await requestToken(user);
    await reset(token);
    await waitFor(() => sent.length === 2);
    expect(sent[1].subject).toMatch(/password was changed/i);
    expect(sent[1].text).not.toContain(NEW_PASSWORD);
  });

  test('audit rows are written and never contain the token or the password', async () => {
    await AuditLog.collection.deleteMany({});
    const user = await newUser();
    const token = await requestToken(user);
    await reset('b'.repeat(64)); // failed attempt
    await reset(token);
    const rows = await AuditLog.find({ action: { $in: ['passwordResetCompleted', 'passwordResetFailed'] } }).lean();
    expect(rows.map((r) => r.action).sort()).toEqual(['passwordResetCompleted', 'passwordResetFailed']);
    const dump = JSON.stringify(rows);
    for (const secret of [token, 'b'.repeat(64), NEW_PASSWORD]) expect(dump).not.toContain(secret);
  });
});

describe('a reset signs the user out everywhere', () => {
  test('sessions started before the reset stop working; a new login works', async () => {
    const user = await newUser();
    const laptop = request.agent(testApp());
    const phone = request.agent(testApp());
    expect((await loginWith(laptop, user.email, OLD_PASSWORD)).status).toBe(200);
    expect((await loginWith(phone, user.email, OLD_PASSWORD)).status).toBe(200);
    expect((await laptop.get('/api/v1/auth/me')).status).toBe(200);

    await new Promise((r) => setTimeout(r, 5)); // make sure the reset happens after those logins
    await reset(await requestToken(user));

    expect((await laptop.get('/api/v1/auth/me')).status).toBe(401);
    expect((await phone.get('/api/v1/auth/me')).status).toBe(401);

    const again = request.agent(testApp());
    expect((await loginWith(again, user.email, NEW_PASSWORD)).status).toBe(200);
    expect((await again.get('/api/v1/auth/me')).status).toBe(200);
  });

  test("another user's sessions are not affected", async () => {
    const a = await newUser();
    const b = await newUser();
    const agentB = request.agent(testApp());
    await loginWith(agentB, b.email, OLD_PASSWORD);
    await new Promise((r) => setTimeout(r, 5));
    await reset(await requestToken(a));
    expect((await agentB.get('/api/v1/auth/me')).status).toBe(200);
  });
});

describe('password policy and wiring', () => {
  test('the shared policy rejects weak passwords', () => {
    expect(validatePassword('short')).toMatch(/12 characters/);
    expect(validatePassword('aaaaaaaaaaaaaaaa')).toMatch(/varied/);
    expect(validatePassword('My-Admin-Pass-12345')).toMatch(/common words/);
    expect(validatePassword('x'.repeat(129))).toMatch(/at most/);
    expect(validatePassword('jonathan-Pw-4455-zz', 'jonathan@demo.example')).toMatch(/email name/);
    expect(validatePassword(NEW_PASSWORD)).toBeNull();
  });

  test('both endpoints are mounted in the real app', async () => {
    expect((await request(app).post('/api/v1/auth/forgot-password').send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/auth/reset-password').send({})).status).toBe(400);
  });
});

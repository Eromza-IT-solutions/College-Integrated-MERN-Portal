import crypto from 'node:crypto';
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import env from '../src/config/env.js';
import { createSessionMiddleware } from '../src/config/session.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import authRoutes from '../src/modules/auth/auth.routes.js';
import User from '../src/models/User.js';
import AuthToken from '../src/models/AuthToken.js';
import AuditLog from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { setEmailTransportForTests } from '../src/services/emailService.js';
import * as counter from '../src/services/attemptCounter.js';

jest.setTimeout(90000);

const PASSWORD = 'Correct-Horse-Battery-9';
const WRONG = 'wrong-password-123';
const THRESHOLD = env.security.lockoutThreshold; // 5
const store = new session.MemoryStore();
store.setMaxListeners(0);

// 'trust proxy' lets the tests pretend to come from different IP addresses with the X-Forwarded-For header.
function testApp() {
  const a = express();
  a.set('trust proxy', 'loopback'); // believe X-Forwarded-For only from this machine (never use plain true)
  a.use(requestId);
  a.use(express.json());
  a.use(createSessionMiddleware({ store }));
  a.use('/api/v1/auth', authRoutes);
  a.use(errorHandler);
  return a;
}

let mongod;
let hash;
let counterN = 0;
let sent;
const rateLimits = () => mongoose.connection.collection('rate_limits');

const newUser = (extra = {}) => {
  counterN += 1;
  return User.create({ fullName: `Sec Person ${counterN}`, email: `sec${counterN}@demo.example`, passwordHash: hash, role: 'student', status: 'active', ...extra });
};
const login = (identifier, password, { app = testApp(), ip } = {}) => {
  const r = request(app).post('/api/v1/auth/login');
  if (ip) r.set('X-Forwarded-For', ip);
  return r.send({ identifier, password });
};
const forgot = (email, ip, app = testApp()) => {
  const r = request(app).post('/api/v1/auth/forgot-password');
  if (ip) r.set('X-Forwarded-For', ip);
  return r.send({ email });
};
const dbUser = (id) => User.findById(id);
const strip = (body) => ({ ...body, meta: undefined }); // compare answers without the per-request id

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri());
  hash = await hashPassword(PASSWORD);
}, 120000);
afterAll(async () => {
  delete process.env.RATE_LIMIT_IN_TESTS;
  setEmailTransportForTests(null);
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  sent = [];
  setEmailTransportForTests({ sendMail: async (m) => { sent.push(m); } });
  await rateLimits().deleteMany({});
  await AuditLog.collection.deleteMany({});
});

// ================================================================================================
describe('account lockout', () => {
  test('wrong passwords are counted; the account locks on the 5th and the 6th attempt is refused', async () => {
    const user = await newUser();
    for (let i = 1; i <= THRESHOLD; i += 1) {
      const res = await login(user.email, WRONG);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS'); // the 5th still answers like the others
      expect((await dbUser(user._id)).failedLoginCount).toBe(i);
    }
    const locked = await dbUser(user._id);
    expect(locked.lockedUntil.getTime() - Date.now()).toBeGreaterThan(env.security.lockoutMs - 5000);
    expect(locked.lockedUntil.getTime() - Date.now()).toBeLessThanOrEqual(env.security.lockoutMs);

    const refused = await login(user.email, WRONG);
    expect(refused.status).toBe(429);
    expect(refused.body.error.code).toBe('LOGIN_LOCKED');
    expect(refused.body.error.message).toMatch(/15 minutes/);
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(880);
    expect(Number(refused.headers['retry-after'])).toBeLessThanOrEqual(900);
  });

  test('while locked even the CORRECT password is refused, with no session, and the counter stops growing', async () => {
    const user = await newUser();
    for (let i = 0; i < THRESHOLD; i += 1) await login(user.email, WRONG);
    const res = await login(user.email, PASSWORD);
    expect(res.status).toBe(429);
    expect(res.headers['set-cookie']).toBeUndefined();
    await login(user.email, PASSWORD);
    expect((await dbUser(user._id)).failedLoginCount).toBe(THRESHOLD);
  });

  test('a correct sign-in before the limit resets the counter', async () => {
    const user = await newUser();
    for (let i = 0; i < THRESHOLD - 1; i += 1) await login(user.email, WRONG);
    expect((await dbUser(user._id)).failedLoginCount).toBe(THRESHOLD - 1);
    expect((await login(user.email, PASSWORD)).status).toBe(200);
    const fresh = await dbUser(user._id);
    expect(fresh.failedLoginCount).toBe(0);
    expect(fresh.lockedUntil).toBeNull();
    for (let i = 0; i < THRESHOLD - 1; i += 1) expect((await login(user.email, WRONG)).status).toBe(401); // a fresh allowance
    expect((await login(user.email, PASSWORD)).status).toBe(200); // still not locked
  });

  test('when the lock time has passed, the correct password works again', async () => {
    const user = await newUser();
    for (let i = 0; i < THRESHOLD; i += 1) await login(user.email, WRONG);
    expect((await login(user.email, PASSWORD)).status).toBe(429);
    await User.updateOne({ _id: user._id }, { $set: { lockedUntil: new Date(Date.now() - 1000) } }); // time passes
    expect((await login(user.email, PASSWORD)).status).toBe(200);
    const fresh = await dbUser(user._id);
    expect(fresh.failedLoginCount).toBe(0);
    expect(fresh.lockedUntil).toBeNull();
  });

  test('after the lock ends, counting starts again from 1 (not from 5)', async () => {
    const user = await newUser();
    await User.updateOne({ _id: user._id }, { $set: { failedLoginCount: THRESHOLD, lockedUntil: new Date(Date.now() - 1000) } });
    const res = await login(user.email, WRONG);
    expect(res.status).toBe(401);
    const fresh = await dbUser(user._id);
    expect(fresh.failedLoginCount).toBe(1);
    expect(fresh.lockedUntil).toBeNull();
  });

  test('the lock belongs to the account: it holds for email, mobile and Aadhaar alike', async () => {
    process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing';
    const user = await newUser({ mobile: `98${String(10000000 + counterN).slice(-8)}` });
    user.setAadhaar(`1111 2222 ${String(3000 + counterN)}`);
    await user.save();
    for (let i = 0; i < THRESHOLD; i += 1) await login(user.email, WRONG);
    expect((await login(user.mobile, PASSWORD)).status).toBe(429);
    expect((await login(`1111 2222 ${3000 + counterN}`, PASSWORD)).status).toBe(429);
    expect((await login(user.email.toUpperCase(), PASSWORD)).status).toBe(429);
  });

  test("one user's lock does not affect another user", async () => {
    const a = await newUser();
    const b = await newUser();
    for (let i = 0; i < THRESHOLD; i += 1) await login(a.email, WRONG);
    expect((await login(a.email, PASSWORD)).status).toBe(429);
    expect((await login(b.email, PASSWORD)).status).toBe(200);
  });

  test('NON-EXISTENT accounts lock exactly the same way, so "locked" cannot be used to find real accounts', async () => {
    const real = await newUser();
    const ghost = 'nobody-at-all@demo.example';
    const realAnswers = [];
    const ghostAnswers = [];
    for (let i = 0; i <= THRESHOLD; i += 1) {
      realAnswers.push(await login(real.email, WRONG));
      ghostAnswers.push(await login(ghost, WRONG));
    }
    expect(realAnswers.map((r) => r.status)).toEqual(ghostAnswers.map((r) => r.status));
    expect(realAnswers.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 429]);
    expect(strip(realAnswers[THRESHOLD].body)).toEqual(strip(ghostAnswers[THRESHOLD].body));
    expect(strip(realAnswers[0].body)).toEqual(strip(ghostAnswers[0].body));
    expect(Math.abs(Number(realAnswers[THRESHOLD].headers['retry-after']) - Number(ghostAnswers[THRESHOLD].headers['retry-after']))).toBeLessThanOrEqual(2);
  });

  test('a non-existent identifier does not stay locked forever', async () => {
    const ghost = 'ghost-two@demo.example';
    for (let i = 0; i < THRESHOLD; i += 1) await login(ghost, WRONG);
    expect((await login(ghost, WRONG)).status).toBe(429);
    await rateLimits().updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } }); // time passes
    expect((await login(ghost, WRONG)).status).toBe(401);
  });

  test('12 guesses fired at the same instant: only 5 are ever checked, the rest are refused', async () => {
    const user = await newUser();
    const results = await Promise.all(Array.from({ length: 12 }, () => login(user.email, WRONG)));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(THRESHOLD);
    expect(statuses.filter((s) => s === 429)).toHaveLength(12 - THRESHOLD);
    expect((await dbUser(user._id)).lockedUntil).toBeInstanceOf(Date);
    expect((await login(user.email, PASSWORD)).status).toBe(429);
  });

  test('a correct password on an inactive account is never counted as a guess', async () => {
    const user = await newUser({ status: 'deactivated' });
    for (let i = 0; i < THRESHOLD + 2; i += 1) expect((await login(user.email, PASSWORD)).status).toBe(403);
    expect((await dbUser(user._id)).failedLoginCount).toBe(0);
  });

  test('wrong passwords on an inactive account lock it like any other (its status stays hidden)', async () => {
    const user = await newUser({ status: 'deactivated' });
    for (let i = 0; i < THRESHOLD; i += 1) expect((await login(user.email, WRONG)).status).toBe(401);
    expect((await login(user.email, WRONG)).status).toBe(429);
  });

  test('a password reset clears the lock', async () => {
    const user = await newUser();
    for (let i = 0; i < THRESHOLD; i += 1) await login(user.email, WRONG);
    expect((await login(user.email, PASSWORD)).status).toBe(429);
    const token = await AuthToken.issue(user._id, 'passwordReset');
    const res = await request(testApp()).post('/api/v1/auth/reset-password').send({ token, password: 'Brand-New-Secret-77x' });
    expect(res.status).toBe(200);
    const fresh = await dbUser(user._id);
    expect(fresh.failedLoginCount).toBe(0);
    expect(fresh.lockedUntil).toBeNull();
    expect((await login(user.email, 'Brand-New-Secret-77x')).status).toBe(200);
  });

  test('someone already signed in stays signed in when strangers lock the account', async () => {
    const user = await newUser();
    const agent = request.agent(testApp());
    expect((await agent.post('/api/v1/auth/login').send({ identifier: user.email, password: PASSWORD })).status).toBe(200);
    for (let i = 0; i < THRESHOLD; i += 1) await login(user.email, WRONG); // an attacker from elsewhere
    expect((await agent.get('/api/v1/auth/me')).status).toBe(200);
  });

  test('an administrator-set "locked" status is not touched by the temporary lock logic', async () => {
    const user = await newUser({ status: 'locked' });
    expect((await login(user.email, PASSWORD)).status).toBe(403);
    expect((await dbUser(user._id)).status).toBe('locked');
  });

  test('audit log: failures, the lock event and blocked attempts, without passwords or identifiers', async () => {
    const user = await newUser();
    const ghost = 'audit-ghost@demo.example';
    for (let i = 0; i <= THRESHOLD; i += 1) { await login(user.email, WRONG); await login(ghost, WRONG); }
    const rows = await AuditLog.find({}).lean();
    const count = (action) => rows.filter((r) => r.action === action).length;
    expect(count('loginFailed')).toBe(THRESHOLD * 2);
    expect(count('accountLocked')).toBe(2);
    expect(count('loginBlocked')).toBe(2);

    const known = rows.find((r) => r.action === 'accountLocked' && r.details.subject === 'knownAccount');
    expect(String(known.actorUserId)).toBe(String(user._id));
    expect(known.details.failedAttempts).toBe(THRESHOLD);
    expect(known.outcome).toBe('denied');
    expect(rows.find((r) => r.action === 'accountLocked' && r.details.subject === 'unknownIdentifier').actorUserId).toBeNull();
    expect(rows.filter((r) => r.action === 'loginBlocked').map((r) => r.details.reason).sort()).toEqual(['accountLocked', 'identifierLocked']);

    const dump = JSON.stringify(rows);
    for (const secret of [WRONG, PASSWORD, user.email, ghost]) expect(dump).not.toContain(secret);
  });
});

// ================================================================================================
describe('rate limiting by IP address (shared counters in MongoDB)', () => {
  beforeAll(() => { process.env.RATE_LIMIT_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.RATE_LIMIT_IN_TESTS; });

  const failures = (n, ip, app) => Promise.all(Array.from({ length: n }, () => login('', '', { ip, app }))); // empty body: 400, counts as failed

  test('after the allowed number of FAILED sign-ins the IP gets 429 with Retry-After and an audit event', async () => {
    const ip = '10.0.0.1';
    const app = testApp();
    for (let i = 0; i < env.security.loginIpMax; i += 1) expect((await login('', '', { ip, app })).status).toBe(400);
    const blocked = await login('', '', { ip, app });
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.body.meta.requestId).toBeTruthy();
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['ratelimit']).toBeTruthy();
  });

  test('a blocked IP cannot sign in even with the right password; other IPs are unaffected', async () => {
    const user = await newUser();
    const app = testApp();
    await failures(env.security.loginIpMax, '10.0.0.2', app);
    const blocked = await login(user.email, PASSWORD, { ip: '10.0.0.2', app });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['set-cookie']).toBeUndefined();
    expect((await login(user.email, PASSWORD, { ip: '10.0.0.3', app })).status).toBe(200);
  });

  test('blocked requests never reach the login code (no failed-login audit rows, no account counting)', async () => {
    const user = await newUser();
    const app = testApp();
    await failures(env.security.loginIpMax, '10.0.0.4', app);
    await AuditLog.collection.deleteMany({});
    for (let i = 0; i < 3; i += 1) await login(user.email, WRONG, { ip: '10.0.0.4', app });
    expect(await AuditLog.countDocuments({ action: 'loginFailed' })).toBe(0);
    expect((await dbUser(user._id)).failedLoginCount).toBe(0);
  });

  test('SUCCESSFUL sign-ins do not use up the allowance', async () => {
    const user = await newUser();
    const app = testApp();
    for (let i = 0; i < env.security.loginIpMax + 3; i += 1) expect((await login(user.email, PASSWORD, { ip: '10.0.0.5', app })).status).toBe(200);
  });

  test('the counters are shared between server instances (they live in the database)', async () => {
    const instanceA = testApp();
    const instanceB = testApp();
    const half = env.security.loginIpMax / 2;
    for (let i = 0; i < half; i += 1) { await login('', '', { ip: '10.0.0.6', app: instanceA }); await login('', '', { ip: '10.0.0.6', app: instanceB }); }
    expect((await login('', '', { ip: '10.0.0.6', app: instanceA })).status).toBe(429);
    expect((await login('', '', { ip: '10.0.0.6', app: instanceB })).status).toBe(429);
  });

  test('the block ends when the time window ends', async () => {
    const app = testApp();
    await failures(env.security.loginIpMax, '10.0.0.7', app);
    expect((await login('', '', { ip: '10.0.0.7', app })).status).toBe(429);
    await rateLimits().updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } }); // the window passes
    expect((await login('', '', { ip: '10.0.0.7', app })).status).toBe(400); // allowed again
  });

  test('exactly ONE audit row is written per blocking period, however many requests are blocked', async () => {
    const app = testApp();
    await failures(env.security.loginIpMax, '10.0.0.8', app);
    for (let i = 0; i < 6; i += 1) await login('', '', { ip: '10.0.0.8', app });
    const rows = await AuditLog.find({ action: 'rateLimited' }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].details.limiter).toBe('login-ip');
    expect(rows[0].ip).toBe('10.0.0.8');
    expect(rows[0].outcome).toBe('denied');
  });

  test('forgot-password: limited per IP address', async () => {
    const app = testApp();
    for (let i = 0; i < env.security.forgotIpMax; i += 1) expect((await forgot(`person${i}@demo.example`, '10.0.1.1', app)).status).toBe(200);
    const blocked = await forgot('another@demo.example', '10.0.1.1', app);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect((await forgot('another@demo.example', '10.0.1.2', app)).status).toBe(200); // a different IP is fine
  });

  test('forgot-password: limited per email address across many IPs, identically for real and unknown emails', async () => {
    const real = await newUser();
    const run = async (email, prefix) => {
      const statuses = [];
      for (let i = 0; i <= env.security.forgotEmailMax; i += 1) statuses.push((await forgot(email, `${prefix}.${i}`)).status);
      return statuses;
    };
    const realStatuses = await run(real.email, '10.1.2');
    const ghostStatuses = await run('no-such-person@demo.example', '10.1.3');
    expect(realStatuses).toEqual([200, 200, 200, 429]);
    expect(ghostStatuses).toEqual(realStatuses); // no clue about which email exists
  });

  test('forgot-password: the email limit ignores letter case and padding, and a blocked request sends nothing', async () => {
    const user = await newUser();
    await forgot(user.email, '10.2.0.1');
    await forgot(user.email.toUpperCase(), '10.2.0.2');
    await forgot(`  ${user.email}  `, '10.2.0.3');
    await new Promise((r) => setTimeout(r, 150));
    const sentBefore = sent.length;
    const tokensBefore = await AuthToken.countDocuments({ userId: user._id });
    expect((await forgot(user.email, '10.2.0.4')).status).toBe(429);
    await new Promise((r) => setTimeout(r, 150));
    expect(sent.length).toBe(sentBefore);
    expect(await AuthToken.countDocuments({ userId: user._id })).toBe(tokensBefore);
  });

  test('the database never stores the raw email address in a rate-limit key', async () => {
    const email = 'private.person@demo.example';
    await forgot(email, '10.2.1.1');
    const keys = JSON.stringify(await rateLimits().find({}).toArray());
    expect(keys).not.toContain('private.person');
    expect(keys).toContain('forgot-email:');
  });

  test('reset-password: limited per IP address', async () => {
    const app = testApp();
    for (let i = 0; i < env.security.resetIpMax; i += 1) {
      const r = await request(app).post('/api/v1/auth/reset-password').set('X-Forwarded-For', '10.3.0.1').send({ token: 'a'.repeat(64), password: 'Brand-New-Secret-77x' });
      expect(r.status).toBe(400);
    }
    const blocked = await request(app).post('/api/v1/auth/reset-password').set('X-Forwarded-For', '10.3.0.1').send({ token: 'a'.repeat(64), password: 'Brand-New-Secret-77x' });
    expect(blocked.status).toBe(429);
  });

  test('each limiter is separate: using up the login allowance does not block forgot-password', async () => {
    const app = testApp();
    await failures(env.security.loginIpMax, '10.4.0.1', app);
    expect((await login('', '', { ip: '10.4.0.1', app })).status).toBe(429);
    expect((await forgot('someone@demo.example', '10.4.0.1', app)).status).toBe(200);
  });

  test('normal use is never blocked: a few attempts of every kind all succeed', async () => {
    const user = await newUser();
    const app = testApp();
    expect((await login(user.email, WRONG, { ip: '10.5.0.1', app })).status).toBe(401);
    expect((await login(user.email, PASSWORD, { ip: '10.5.0.1', app })).status).toBe(200);
    expect((await forgot(user.email, '10.5.0.1', app)).status).toBe(200);
  });
});

describe('rate limiting is off in the test environment unless a test turns it on', () => {
  test('many failures from one IP are not blocked by default', async () => {
    delete process.env.RATE_LIMIT_IN_TESTS;
    const app = testApp();
    for (let i = 0; i < env.security.loginIpMax + 5; i += 1) expect((await login('', '', { ip: '10.9.9.9', app })).status).toBe(400);
  });
});

// ================================================================================================
describe('attemptCounter (the shared counter underneath)', () => {
  test('counts up, keeps the window start, and starts over after it ends', async () => {
    const a = await counter.hit('unit:a', 60000);
    const b = await counter.hit('unit:a', 60000);
    const c = await counter.hit('unit:a', 60000);
    expect([a.count, b.count, c.count]).toEqual([1, 2, 3]);
    expect(c.resetAt).toBe(a.resetAt); // later hits do not push the end of the window further away
    await rateLimits().updateOne({ _id: 'unit:a' }, { $set: { expiresAt: new Date(Date.now() - 1) } });
    const d = await counter.hit('unit:a', 60000);
    expect(d.count).toBe(1);
    expect(d.resetAt).toBeGreaterThan(Date.now());
  });

  test('20 simultaneous hits get 20 different numbers (no lost updates)', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => counter.hit('unit:race', 60000)));
    expect(results.map((r) => r.count).sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  test('the same key from a brand-new start, fired at once, never fails with a duplicate-key error', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => counter.hit(`unit:fresh${i % 2}`, 60000)));
    expect(results).toHaveLength(8);
  });

  test('undo, reset and extendUntil', async () => {
    await counter.hit('unit:b', 60000);
    await counter.hit('unit:b', 60000);
    await counter.undo('unit:b');
    expect((await counter.hit('unit:b', 60000)).count).toBe(2);
    const later = Date.now() + 5 * 60000;
    await counter.extendUntil('unit:b', later);
    expect((await counter.hit('unit:b', 60000)).resetAt).toBe(later);
    await counter.reset('unit:b');
    expect((await counter.hit('unit:b', 60000)).count).toBe(1);
  });

  test('undo never goes below zero', async () => {
    await counter.hit('unit:c', 60000);
    await counter.undo('unit:c');
    await counter.undo('unit:c');
    await counter.undo('unit:c');
    expect((await counter.hit('unit:c', 60000)).count).toBe(1);
  });

  test('old counters delete themselves: a TTL index exists on expiresAt', async () => {
    await counter.hit('unit:ttl', 60000);
    const indexes = await rateLimits().indexes();
    expect(indexes.find((i) => i.key.expiresAt === 1)?.expireAfterSeconds).toBe(0);
  });
});

// ================================================================================================
// Spelling must never change the outcome. If it did, an attacker could retype a number differently and learn,
// from the changed answer, whether it belongs to a real account.
describe('lockout is consistent however an identifier is spelled', () => {
  const MOBILE_SPELLINGS = (m) => [m, `${m.slice(0, 5)} ${m.slice(5)}`, `+91 ${m.slice(0, 5)} ${m.slice(5)}`, `+91${m}`, `${m.slice(0, 5)}-${m.slice(5)}`];
  const AADHAAR_SPELLINGS = (a) => [a, `${a.slice(0, 4)} ${a.slice(4, 8)} ${a.slice(8)}`, `${a.slice(0, 4)}-${a.slice(4, 8)}-${a.slice(8)}`];
  const EMAIL_SPELLINGS = (e) => [e, e.toUpperCase(), ` ${e} `, e[0].toUpperCase() + e.slice(1)];

  beforeAll(() => { process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing'; });

  // Makes 5 wrong attempts, rotating through the spellings, then tries EVERY spelling (with a wrong password, and
  // with the real password if there is one). Returns the statuses so a real and a made-up identifier can be compared.
  async function hammer(spellings, realPassword) {
    const during = [];
    for (let i = 0; i < THRESHOLD; i += 1) during.push((await login(spellings[i % spellings.length], WRONG)).status);
    const after = [];
    for (const s of spellings) after.push((await login(s, WRONG)).status);
    const afterRight = [];
    if (realPassword) for (const s of spellings) afterRight.push((await login(s, realPassword)).status);
    return { during, after, afterRight };
  }

  test('MOBILE: failures in different spellings add up together, for a real and for a made-up number alike', async () => {
    await newUser({ mobile: '9000011223' });
    const real = await hammer(MOBILE_SPELLINGS('9000011223'), PASSWORD);
    const ghost = await hammer(MOBILE_SPELLINGS('9000099887'));
    const all401 = Array(THRESHOLD).fill(401);
    expect(real.during).toEqual(all401);
    expect(ghost.during).toEqual(all401);
    expect(real.after).toEqual(Array(5).fill(429)); // every spelling is locked
    expect(ghost.after).toEqual(real.after); // the made-up number looks exactly the same
    expect(real.afterRight).toEqual(Array(5).fill(429)); // even the right password, in any spelling
  });

  test('AADHAAR: the same holds for every spelling of an Aadhaar number', async () => {
    const u = await newUser();
    u.setAadhaar('444455556666');
    await u.save();
    const real = await hammer(AADHAAR_SPELLINGS('444455556666'), PASSWORD);
    const ghost = await hammer(AADHAAR_SPELLINGS('777788889999'));
    expect(real.during).toEqual(Array(THRESHOLD).fill(401));
    expect(ghost.during).toEqual(real.during);
    expect(real.after).toEqual(Array(3).fill(429));
    expect(ghost.after).toEqual(real.after);
    expect(real.afterRight).toEqual(Array(3).fill(429));
  });

  test('EMAIL: letter case and surrounding spaces do not matter either', async () => {
    const u = await newUser();
    const real = await hammer(EMAIL_SPELLINGS(u.email), PASSWORD);
    const ghost = await hammer(EMAIL_SPELLINGS('spelling-ghost@demo.example'));
    expect(real.during).toEqual(Array(THRESHOLD).fill(401));
    expect(ghost.during).toEqual(real.during);
    expect(real.after).toEqual(Array(4).fill(429));
    expect(ghost.after).toEqual(real.after);
    expect(real.afterRight).toEqual(Array(4).fill(429));
  });

  test('the 429 answer is identical for every spelling of a real and a made-up number (same body, wait time of the same lock length)', async () => {
    await newUser({ mobile: '9000022334' });
    await hammer(MOBILE_SPELLINGS('9000022334'));
    await hammer(MOBILE_SPELLINGS('9000088776'));
    const realAnswers = [];
    const ghostAnswers = [];
    for (const s of MOBILE_SPELLINGS('9000022334')) realAnswers.push(await login(s, WRONG));
    for (const s of MOBILE_SPELLINGS('9000088776')) ghostAnswers.push(await login(s, WRONG));
    for (let i = 0; i < realAnswers.length; i += 1) {
      expect(realAnswers[i].status).toBe(429);
      expect(strip(realAnswers[i].body)).toEqual(strip(ghostAnswers[i].body));
      // The two locks started a few seconds apart (the test locks one, then the other), so compare each wait time
      // with the lock length instead of with each other.
      for (const answer of [realAnswers[i], ghostAnswers[i]]) {
        expect(Number(answer.headers['retry-after'])).toBeGreaterThan(env.security.lockoutMs / 1000 - 60);
        expect(Number(answer.headers['retry-after'])).toBeLessThanOrEqual(env.security.lockoutMs / 1000);
      }
    }
  });

  test('a lock on one number does not touch a different number, and text that only LOOKS like a number is separate', async () => {
    for (let i = 0; i < THRESHOLD; i += 1) await login('9000033445', WRONG);
    expect((await login('9000033445', WRONG)).status).toBe(429);
    expect((await login('9000033446', WRONG)).status).toBe(401); // next number: fresh counter
    expect((await login('mobile:9000033445', WRONG)).status).toBe(401); // other text: not the same thing
    expect((await login('a-9000033445@demo.example', WRONG)).status).toBe(401);
  });
});

// ================================================================================================
// The privacy promise: the rate_limits collection may count attempts, but it must not hold anything that identifies
// a person's email, mobile number or Aadhaar number.
describe('what the rate_limits collection stores', () => {
  beforeAll(() => {
    process.env.RATE_LIMIT_IN_TESTS = 'true'; // so the IP and per-email counters are written too
    process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing';
  });
  afterAll(() => { delete process.env.RATE_LIMIT_IN_TESTS; });

  const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const IP = '10.77.0.1';

  let realMobileUser;
  beforeAll(async () => {
    realMobileUser = await newUser({ email: 'privacy-probe-real@demo.example', mobile: '9000044556' });
    realMobileUser.setAadhaar('555566667777');
    await realMobileUser.save();
  });
  // each test starts with a clean account (earlier tests made wrong attempts on it)
  beforeEach(() => User.updateOne({ _id: realMobileUser._id }, { $set: { failedLoginCount: 0, lockedUntil: null } }));

  async function exerciseEverything() {
    // wrong sign-ins as a REAL person: by email, by mobile, by Aadhaar
    for (const id of ['privacy-probe-real@demo.example', '90000 44556', '5555-6666-7777']) await login(id, WRONG, { ip: IP });
    // wrong sign-ins as people who do NOT exist: email, mobile, Aadhaar, several spellings
    const ghosts = ['Privacy-Probe-Ghost@Demo.Example', ' privacy-probe-ghost@demo.example ', '9000055667', '+91 90000 55667', '8888-9999-0000', '888899990000', 'random text with probe'];
    for (const id of ghosts) await login(id, WRONG, { ip: IP });
    // forgot-password for a real and for an unknown email, in different cases
    await forgot('Privacy-Probe-Real@Demo.Example', '10.77.0.2');
    await forgot('privacy-probe-nobody@demo.example', '10.77.0.3');
    return { realMobileUser, ghosts };
  }

  const RAW_NEEDLES = [
    // emails (and the parts that make them recognisable)
    'privacy-probe', 'demo.example',
    // mobile numbers, every spelling
    '9000044556', '90000 44556', '90000-44556', '9000055667', '90000 55667', '90000-55667',
    // Aadhaar numbers, every spelling
    '555566667777', '5555 6666 7777', '5555-6666-7777', '888899990000', '8888 9999 0000', '8888-9999-0000',
    // the text typed
    'random text',
  ];

  test('no raw email, mobile or Aadhaar number appears anywhere in the collection', async () => {
    await exerciseEverything();
    const docs = await rateLimits().find({}).toArray();
    expect(docs.length).toBeGreaterThan(0);
    const dump = JSON.stringify(docs).toLowerCase();
    for (const needle of RAW_NEEDLES) expect(dump).not.toContain(needle.toLowerCase());
  });

  test('the OLD plain SHA-256 fingerprints are not used any more', async () => {
    await exerciseEverything();
    const dump = JSON.stringify(await rateLimits().find({}).toArray());
    const typed = ['privacy-probe-ghost@demo.example', 'privacy-probe-nobody@demo.example', 'privacy-probe-real@demo.example', '9000055667', '+91 90000 55667', '888899990000', '8888-9999-0000', 'random text with probe'];
    for (const t of typed) {
      expect(dump).not.toContain(sha256(t.trim().toLowerCase()).slice(0, 32)); // what the old code stored
      expect(dump).not.toContain(sha256(t.trim().toLowerCase()));
    }
  });

  test('every stored key has an expected shape: a private 32-character fingerprint, or a plain IP address', async () => {
    await exerciseEverything();
    const ids = (await rateLimits().find({}).toArray()).map((d) => d._id);
    const allowed = [/^login-ip:[0-9a-f.:]+$/, /^forgot-ip:[0-9a-f.:]+$/, /^reset-ip:[0-9a-f.:]+$/, /^login-unknown:[0-9a-f]{32}$/, /^forgot-email:e:[0-9a-f]{32}$/];
    for (const id of ids) expect(allowed.some((re) => re.test(id))).toBe(true);
  });

  test('IP addresses are still stored in plain form (unchanged), so an IP can still be recognised and blocked', async () => {
    await exerciseEverything();
    const ids = (await rateLimits().find({}).toArray()).map((d) => d._id);
    expect(ids).toContain(`login-ip:${IP}`);
    expect(ids).toContain('forgot-ip:10.77.0.2');
  });

  test('a REAL account keeps its counter on the user record: no fingerprint of its identifiers is written at all', async () => {
    const real = await newUser({ mobile: '9000066778' });
    for (let i = 0; i < THRESHOLD; i += 1) await login('90000 66778', WRONG, { ip: '10.77.0.9' });
    expect((await dbUser(real._id)).failedLoginCount).toBe(THRESHOLD);
    const unknownKeys = (await rateLimits().find({ _id: /^login-unknown:/ }).toArray()).length;
    expect(unknownKeys).toBe(0);
  });

  test('made-up identifiers in all spellings produce exactly ONE counter per person, not one per spelling', async () => {
    for (const id of ['9000077889', '90000 77889', '+91 90000-77889', '+919000077889']) await login(id, WRONG, { ip: '10.77.0.10' });
    expect(await rateLimits().countDocuments({ _id: /^login-unknown:/ })).toBe(1);
  });

  test('the audit log does not hold the typed identifiers either', async () => {
    await exerciseEverything();
    const dump = JSON.stringify(await AuditLog.find({}).lean()).toLowerCase();
    for (const needle of RAW_NEEDLES) expect(dump).not.toContain(needle.toLowerCase());
  });

  test('the secret itself is not stored in the collection', async () => {
    await exerciseEverything();
    const dump = JSON.stringify(await rateLimits().find({}).toArray());
    expect(dump).not.toContain(env.rateLimitHashSecret);
    expect(dump).not.toContain(env.sessionSecret ?? 'no-session-secret-in-test');
  });
});

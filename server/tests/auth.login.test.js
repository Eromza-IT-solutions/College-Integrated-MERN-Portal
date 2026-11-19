import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync } from 'fs';
import app from '../src/app.js';
import { createSessionMiddleware } from '../src/config/session.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import authRoutes from '../src/modules/auth/auth.routes.js';
import User from '../src/models/User.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { clearPermissionCache } from '../src/services/permissionService.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

const PASSWORD = 'Correct-Horse-Battery-9';
const store = new session.MemoryStore(); // kept here so the tests can look inside it
store.setMaxListeners(0); // every test app shares this store; avoids a harmless warning

// The real session setup + the real auth routes, with a throw-away /whoami route to read the session.
function testApp() {
  const a = express();
  a.use(requestId);
  a.use(express.json());
  a.use(createSessionMiddleware({ store }));
  a.get('/whoami', (req, res) => res.json({ userId: req.session.userId ?? null, planted: req.session.planted ?? null }));
  a.get('/plant', (req, res) => { req.session.planted = 'attacker-data'; res.json({ ok: true }); });
  a.use('/api/v1/auth', authRoutes);
  a.use(errorHandler);
  return a;
}

const storeSize = () => new Promise((resolve, reject) => store.length((e, n) => (e ? reject(e) : resolve(n))));
const storeGet = (sid) => new Promise((resolve, reject) => store.get(sid, (e, s) => (e ? reject(e) : resolve(s))));
const sidFrom = (res) => decodeURIComponent(res.headers['set-cookie'][0].split(';')[0].split('=')[1]).slice(2).split('.')[0];

let mongod;
let hash;
const users = {};

beforeAll(async () => {
  process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Permission.insertMany(matrix);
  clearPermissionCache();
  hash = await hashPassword(PASSWORD);

  const make = (key, data) => User.create({ passwordHash: hash, status: 'active', emailVerifiedAt: new Date(), ...data })
    .then((u) => { users[key] = u; return u; });
  const dept = new mongoose.Types.ObjectId();
  await make('superAdmin', { fullName: 'Super Person', email: 'super@demo.example', role: 'superAdmin' });
  await make('websiteAdmin', { fullName: 'Web Person', email: 'web@demo.example', role: 'websiteAdmin' });
  await make('admissionAdmin', { fullName: 'Adm Person', email: 'adm@demo.example', role: 'admissionAdmin' });
  await make('examAdmin', { fullName: 'Exam Person', email: 'exam@demo.example', role: 'examAdmin' });
  await make('hod', { fullName: 'Hod Person', email: 'hod@demo.example', role: 'hod', departmentId: dept });
  await make('teacher', { fullName: 'Teach Person', email: 'teacher@demo.example', role: 'teacher', departmentId: dept });
  await make('applicant', { fullName: 'Applicant Person', email: 'applicant@demo.example', role: 'applicant' });
  const student = await make('student', { fullName: 'Student Person', email: 'student@demo.example', role: 'student', mobile: '9876543210' });
  student.setAadhaar('1234 5678 9012');
  await student.save();
  await make('pending', { fullName: 'Pending Person', email: 'pending@demo.example', role: 'student', status: 'pending' });
  await make('deactivated', { fullName: 'Off Person', email: 'off@demo.example', role: 'student', status: 'deactivated' });
  await make('locked', { fullName: 'Locked Person', email: 'locked@demo.example', role: 'student', status: 'locked' });
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const login = (identifier, password = PASSWORD, agent = request(testApp())) => agent.post('/api/v1/auth/login').send({ identifier, password });

describe('successful login', () => {
  test.each([
    ['super@demo.example', 'superAdmin'],
    ['web@demo.example', 'websiteAdmin'],
    ['adm@demo.example', 'admissionAdmin'],
    ['exam@demo.example', 'examAdmin'],
    ['hod@demo.example', 'hod'],
    ['teacher@demo.example', 'teacher'],
    ['student@demo.example', 'student'],
    ['applicant@demo.example', 'applicant'],
  ])('%s logs in and gets the role from the database', async (email, role) => {
    const res = await login(email);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe(role);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.meta.requestId).toBeTruthy();
    expect(res.headers['cache-control']).toBe('no-store');
    expect(Array.isArray(res.body.data.permissions)).toBe(true);
    expect(res.body.data.permissions.length).toBeGreaterThan(0);
    expect(res.body.data.permissions.every((p) => Object.keys(p).sort().join() === 'action,resource,scope')).toBe(true);
  });

  test('email is case-insensitive; mobile and Aadhaar (with spaces or dashes) also work', async () => {
    for (const id of ['STUDENT@Demo.Example', '9876543210', '+91 98765 43210', '1234 5678 9012', '1234-5678-9012']) {
      const res = await login(id);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('student@demo.example');
    }
  });

  test('a role sent by the browser is ignored', async () => {
    const res = await request(testApp()).post('/api/v1/auth/login').send({ identifier: 'student@demo.example', password: PASSWORD, role: 'superAdmin' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('student');
  });

  test('response never contains the password hash, Aadhaar hash, mobile or Aadhaar digits', async () => {
    const res = await login('student@demo.example');
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/passwordHash|aadhaarHash|aadhaarLast4|mobile|\$2[aby]\$/);
    expect(text).not.toContain(PASSWORD);
    expect(Object.keys(res.body.data.user).sort()).toEqual(['departmentId', 'email', 'fullName', 'id', 'mustChangePassword', 'role']);
  });

  test('updates lastLoginAt', async () => {
    await login('teacher@demo.example');
    expect((await User.findById(users.teacher._id)).lastLoginAt).toBeInstanceOf(Date);
  });
});

describe('session after login', () => {
  test('login sets an HttpOnly cookie, and the session stores only the user id', async () => {
    const agent = request.agent(testApp());
    const res = await login('student@demo.example', PASSWORD, agent);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^icms\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const saved = await storeGet(sidFrom(res));
    expect(saved.userId).toBe(String(users.student._id));
    expect(Object.keys(saved).filter((k) => k !== 'cookie').sort()).toEqual(['loginAt', 'userId']); // no role, no hash

    expect((await agent.get('/whoami')).body.userId).toBe(String(users.student._id)); // the cookie works afterwards
  });

  test('the session id changes at login (session fixation protection)', async () => {
    const agent = request.agent(testApp());
    const before = await agent.get('/plant'); // the visitor already has a session
    const oldSid = sidFrom(before);
    expect((await storeGet(oldSid)).planted).toBe('attacker-data');

    const res = await login('student@demo.example', PASSWORD, agent);
    const newSid = sidFrom(res);
    expect(newSid).not.toBe(oldSid);
    expect(await storeGet(oldSid)).toBeUndefined(); // the old session is destroyed
    expect((await agent.get('/whoami')).body.planted).toBeNull(); // and its data did not carry over
  });

  test('failed logins create no session and no cookie', async () => {
    const before = await storeSize();
    const res = await login('student@demo.example', 'wrong-password-123');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await storeSize()).toBe(before);
  });
});

describe('wrong details', () => {
  test('wrong password and unknown user give the exact same answer', async () => {
    const wrong = await login('student@demo.example', 'wrong-password-123');
    const unknown = await login('nobody@demo.example', 'wrong-password-123');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrong.body.success).toBe(false);
  });

  test.each([['not an email'], ['12345'], ['abc@'], ['0000 0000 0000'], ['9999999999']])('identifier %p gives the same generic 401', async (id) => {
    const res = await login(id);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('right password for a different user does not work', async () => {
    expect((await login('student@demo.example', 'Another-Pass-12345')).status).toBe(401);
  });

  test.each([
    [{}], [{ identifier: 'student@demo.example' }], [{ password: PASSWORD }], [{ identifier: '', password: '' }],
    [{ identifier: '   ', password: PASSWORD }], [{ identifier: ['a@b.co'], password: PASSWORD }],
    [{ identifier: { $ne: null }, password: { $ne: null } }], [{ identifier: 'a'.repeat(300), password: PASSWORD }],
    [{ identifier: 'student@demo.example', password: 'p'.repeat(200) }],
  ])('bad request body %j gives 400 VALIDATION_ERROR', async (body) => {
    const res = await request(testApp()).post('/api/v1/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('database-operator injection is rejected', async () => {
    const res = await request(testApp()).post('/api/v1/auth/login').send({ identifier: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('account status', () => {
  test.each([['pending@demo.example'], ['off@demo.example'], ['locked@demo.example']])('%s with the right password is refused (403)', async (email) => {
    const res = await login(email);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_ACTIVE');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('an inactive account with a WRONG password gets the generic 401, so its status is not revealed', async () => {
    const res = await login('off@demo.example', 'wrong-password-123');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('audit log', () => {
  beforeAll(() => AuditLog.collection.deleteMany({}));

  test('success and failures are recorded with no password and no typed identifier', async () => {
    await login('teacher@demo.example'); // success
    await login('teacher@demo.example', 'wrong-password-123'); // wrong password
    await login('ghost-user@demo.example', 'wrong-password-123'); // unknown user
    await login('off@demo.example'); // inactive
    await login('1234 5678 9013', 'wrong-password-123'); // unknown Aadhaar

    const rows = await AuditLog.find({}).lean();
    const byReason = (r) => rows.find((x) => x.details.reason === r);
    expect(rows.find((x) => x.action === 'loginSuccess' && x.outcome === 'success')).toBeTruthy();
    expect(byReason('wrongPassword').outcome).toBe('failed');
    expect(String(byReason('wrongPassword').actorUserId)).toBe(String(users.teacher._id));
    expect(byReason('unknownUser').actorUserId).toBeNull();
    expect(byReason('accountNotActive').outcome).toBe('denied');
    expect(rows.find((x) => x.details.identifierType === 'aadhaar')).toBeTruthy();

    const dump = JSON.stringify(rows);
    for (const secret of ['wrong-password-123', PASSWORD, 'ghost-user', '1234 5678 9013', '123456789013', 'teacher@demo.example']) {
      expect(dump).not.toContain(secret);
    }
  });
});

describe('wiring in the real app', () => {
  test('POST /api/v1/auth/login is mounted and answers in the standard shape', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.meta.requestId).toBeTruthy();
  });

  test('GET on the login URL is not a login', async () => {
    expect((await request(app).get('/api/v1/auth/login')).status).toBe(404);
  });
});

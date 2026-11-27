import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import { readFileSync } from 'fs';
import app from '../src/app.js';
import { createSessionMiddleware } from '../src/config/session.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { requirePermission } from '../src/middleware/requirePermission.js';
import authRoutes from '../src/modules/auth/auth.routes.js';
import User from '../src/models/User.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { clearPermissionCache } from '../src/services/permissionService.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const PASSWORD = 'Correct-Horse-Battery-9';
const store = new session.MemoryStore();
store.setMaxListeners(0);

// Real session setup + real auth routes + a few protected demo routes that use the middleware.
function testApp() {
  const a = express();
  a.use(requestId);
  a.use(express.json());
  a.use(createSessionMiddleware({ store }));
  a.get('/corrupt', (req, res) => { req.session.userId = 'not-an-object-id'; res.json({ ok: true }); });
  a.get('/notices', authenticate, requirePermission('notices', 'view'), (req, res) => res.json({ scope: req.permission.scope, role: req.user.role }));
  a.post('/refunds/1/approve', authenticate, requirePermission('admissionRefunds', 'approve'), (req, res) => res.json({ ok: true }));
  a.use('/api/v1/auth', authRoutes);
  a.use(errorHandler);
  return a;
}

const storeGet = (sid) => new Promise((resolve, reject) => store.get(sid, (e, s) => (e ? reject(e) : resolve(s))));
const cookieOf = (res) => res.headers['set-cookie'][0].split(';')[0];
const sidOf = (cookie) => decodeURIComponent(cookie.split('=')[1]).slice(2).split('.')[0];

let mongod;
const users = {};

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri());
  await Permission.insertMany(matrix);
  clearPermissionCache();
  const hash = await hashPassword(PASSWORD);
  const make = async (key, data) => { users[key] = await User.create({ passwordHash: hash, status: 'active', ...data }); };
  await make('student', { fullName: 'Student Person', email: 'student@demo.example', role: 'student' });
  await make('student2', { fullName: 'Second Student', email: 'student2@demo.example', role: 'student' });
  await make('superAdmin', { fullName: 'Super Person', email: 'super@demo.example', role: 'superAdmin' });
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// Logs in through the real endpoint. Returns the agent (which keeps the cookie) and the raw cookie.
async function signIn(email = 'student@demo.example') {
  const agent = request.agent(testApp());
  const res = await agent.post('/api/v1/auth/login').send({ identifier: email, password: PASSWORD });
  expect(res.status).toBe(200);
  return { agent, cookie: cookieOf(res) };
}

describe('GET /auth/me', () => {
  test('without a session: 401 in the standard shape', async () => {
    const res = await request(testApp()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.meta.requestId).toBeTruthy();
  });

  test('after login: returns the safe profile and permissions', async () => {
    const { agent } = await signIn();
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({
      id: String(users.student._id), fullName: 'Student Person', email: 'student@demo.example',
      role: 'student', departmentId: null, mustChangePassword: false,
    });
    expect(res.body.data.permissions.length).toBeGreaterThan(0);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('a made-up or garbage cookie is rejected', async () => {
    for (const c of ['icms.sid=garbage', 'icms.sid=s%3Aabc.def', 'icms.sid=']) {
      expect((await request(testApp()).get('/api/v1/auth/me').set('Cookie', c)).status).toBe(401);
    }
  });

  test('a corrupted session value gives 401, not a crash', async () => {
    const agent = request.agent(testApp());
    await agent.get('/corrupt');
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('the role is read from the database on every request', async () => {
    const { agent } = await signIn('student2@demo.example');
    expect((await agent.get('/api/v1/auth/me')).body.data.user.role).toBe('student');
    await User.updateOne({ _id: users.student2._id }, { $set: { role: 'websiteAdmin' } });
    expect((await agent.get('/api/v1/auth/me')).body.data.user.role).toBe('websiteAdmin'); // no re-login needed
    await User.updateOne({ _id: users.student2._id }, { $set: { role: 'student' } });
  });
});

describe('account changes after login end the session', () => {
  test.each([['deactivated'], ['locked']])('account becomes %s: next request is 401, session deleted, cookie cleared', async (status) => {
    const u = await User.create({ fullName: 'Temp', email: `${status}@demo.example`, passwordHash: await hashPassword(PASSWORD), role: 'student', status: 'active' });
    const { agent, cookie } = await signIn(`${status}@demo.example`);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(200);

    await User.updateOne({ _id: u._id }, { $set: { status } });
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie'][0]).toMatch(/icms\.sid=;.*Expires=Thu, 01 Jan 1970/);
    expect(await storeGet(sidOf(cookie))).toBeUndefined();

    await User.updateOne({ _id: u._id }, { $set: { status: 'active' } }); // re-activating does not revive the old session
    expect((await request(testApp()).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  test('account deleted after login: 401', async () => {
    const u = await User.create({ fullName: 'Gone', email: 'gone@demo.example', passwordHash: await hashPassword(PASSWORD), role: 'student', status: 'active' });
    const { agent } = await signIn('gone@demo.example');
    await User.deleteOne({ _id: u._id });
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  test('ends the session: cookie cleared, store row deleted, /me is 401', async () => {
    const { agent, cookie } = await signIn();
    expect(await storeGet(sidOf(cookie))).toBeDefined();

    const res = await agent.post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { loggedOut: true }, meta: { requestId: expect.any(String) } });
    expect(res.headers['set-cookie'][0]).toMatch(/icms\.sid=;.*Expires=Thu, 01 Jan 1970.*HttpOnly.*SameSite=Lax/);
    expect(await storeGet(sidOf(cookie))).toBeUndefined();
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  test('a copied cookie cannot be reused after logout', async () => {
    const { agent, cookie } = await signIn();
    await agent.post('/api/v1/auth/logout');
    const replay = await request(testApp()).get('/api/v1/auth/me').set('Cookie', cookie); // attacker replays the old cookie
    expect(replay.status).toBe(401);
    expect((await request(testApp()).get('/notices').set('Cookie', cookie)).status).toBe(401);
  });

  test('logging out twice, or without ever logging in, is fine', async () => {
    const { agent } = await signIn();
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await request(testApp()).post('/api/v1/auth/logout')).status).toBe(200);
  });

  test('logging out one user does not log out another', async () => {
    const a = await signIn('student@demo.example');
    const b = await signIn('super@demo.example');
    await a.agent.post('/api/v1/auth/logout');
    expect((await b.agent.get('/api/v1/auth/me')).body.data.user.role).toBe('superAdmin');
  });

  test('is recorded in the audit log, only when someone was logged in', async () => {
    await AuditLog.collection.deleteMany({});
    await request(testApp()).post('/api/v1/auth/logout'); // nobody logged in: nothing to record
    const { agent } = await signIn('student@demo.example');
    await agent.post('/api/v1/auth/logout');
    const rows = await AuditLog.find({ action: 'logout' }).lean();
    expect(rows).toHaveLength(1);
    expect(String(rows[0].actorUserId)).toBe(String(users.student._id));
    expect(rows[0].outcome).toBe('success');
  });

  test('GET on the logout URL does nothing', async () => {
    expect((await request(testApp()).get('/api/v1/auth/logout')).status).toBe(404);
  });
});

describe('authenticate + requirePermission together (401 vs 403)', () => {
  test('not signed in: 401', async () => {
    expect((await request(testApp()).get('/notices')).status).toBe(401);
  });

  test('signed in with the right permission: 200, role comes from the database', async () => {
    const { agent } = await signIn();
    const res = await agent.get('/notices');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ scope: 'all', role: 'student' });
  });

  test('signed in but the role lacks the permission: 403', async () => {
    const { agent } = await signIn();
    const res = await agent.post('/refunds/1/approve');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You do not have permission to do this');
  });
});

describe('wiring in the real app', () => {
  test('/api/v1/auth/me and /logout exist', async () => {
    const me = await request(app).get('/api/v1/auth/me');
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHENTICATED');
    expect((await request(app).post('/api/v1/auth/logout')).status).toBe(200);
  });
});

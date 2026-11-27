import request from 'supertest';
import express from 'express';
import { createTestMongo } from './helpers/memoryMongo.js';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import app from '../src/app.js';
import env from '../src/config/env.js';
import { createSessionMiddleware, cookieOptions } from '../src/config/session.js';

// A tiny app that uses the real session setup, with three throw-away routes.
function sessionApp(overrides) {
  const a = express();
  a.use(createSessionMiddleware(overrides));
  a.get('/anonymous', (req, res) => res.json({ ok: true })); // never touches the session
  a.post('/login', (req, res) => { req.session.userId = 'u1'; res.json({ ok: true }); });
  a.get('/me', (req, res) => (req.session.userId ? res.json({ userId: req.session.userId }) : res.status(401).json({ ok: false })));
  a.post('/logout', (req, res) => req.session.destroy(() => res.clearCookie(env.sessionName).json({ ok: true })));
  return a;
}

describe('session cookie settings', () => {
  test('cookie is HttpOnly, SameSite=Lax and carries the configured name', async () => {
    const res = await request(sessionApp()).post('/login');
    const cookie = res.headers['set-cookie'][0];
    expect(cookie.startsWith(`${env.sessionName}=`)).toBe(true);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Expires=/i);
  });

  test('cookieOptions are secure-in-production and not readable by scripts', () => {
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.secure).toBe(env.nodeEnv === 'production');
    expect(cookieOptions.maxAge).toBe(env.sessionMaxAgeMs);
  });

  test('visitors who never log in get no cookie', async () => {
    const res = await request(sessionApp()).get('/anonymous');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('the real app does not set a cookie on a normal request', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('session flow (memory store)', () => {
  test('cookie from login keeps the user logged in; logout ends it', async () => {
    const agent = request.agent(sessionApp()); // an agent remembers cookies, like a browser
    expect((await agent.get('/me')).status).toBe(401);
    await agent.post('/login');
    const me = await agent.get('/me');
    expect(me.status).toBe(200);
    expect(me.body.userId).toBe('u1');
    await agent.post('/logout');
    expect((await agent.get('/me')).status).toBe(401);
  });

  test('a tampered cookie is not accepted', async () => {
    const login = await request(sessionApp()).post('/login');
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const forged = cookie.slice(0, -3) + 'abc';
    expect((await request(sessionApp()).get('/me').set('Cookie', forged)).status).toBe(401);
  });

  test('a session older than its lifetime is rejected', async () => {
    const a = sessionApp({ cookie: { ...cookieOptions, maxAge: 300 } });
    const agent = request.agent(a);
    await agent.post('/login');
    await new Promise((r) => setTimeout(r, 700));
    expect((await agent.get('/me')).status).toBe(401);
  });
});

describe('session flow (real MongoDB store)', () => {
  let mongod;
  let startError = null;
  beforeAll(async () => {
    try {
      mongod = await createTestMongo();
      await mongoose.connect(mongod.getUri());
    } catch (err) {
      startError = err; // e.g. the MongoDB binary could not be downloaded
    }
  }, 120000);
  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  test('session is saved in the "sessions" collection and removed on logout', async () => {
    if (startError) throw new Error(`Could not start in-memory MongoDB: ${startError.message}`);
    const store = MongoStore.create({ client: mongoose.connection.getClient(), collectionName: 'sessions' });
    const agent = request.agent(sessionApp({ store }));
    await agent.post('/login');
    const sessions = mongoose.connection.db.collection('sessions');
    expect(await sessions.countDocuments()).toBe(1);
    expect((await agent.get('/me')).status).toBe(200);
    await agent.post('/logout');
    expect(await sessions.countDocuments()).toBe(0);
    expect((await agent.get('/me')).status).toBe(401);
    await store.close?.();
  });
});

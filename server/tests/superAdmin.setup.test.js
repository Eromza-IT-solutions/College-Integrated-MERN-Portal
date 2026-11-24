import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { createTestMongo } from './helpers/memoryMongo.js';
import app from '../src/app.js';
import env from '../src/config/env.js';
import { originCheck } from '../src/middleware/originCheck.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';
import { createSuperAdmin, validateEmail, validateName } from '../scripts/create-super-admin.js';

const GOOD = 'Correct-Horse-Battery-9';
let mongod;

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('create the first Super Admin', () => {
  test('validators', () => {
    expect(validateEmail('nope')).toBeTruthy();
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateName(' ')).toBeTruthy();
    expect(validateName('Jo')).toBeNull();
  });

  test('a weak password or bad email creates nothing', async () => {
    for (const input of [
      { fullName: 'Admin One', email: 'admin@demo.example', password: 'short' },
      { fullName: 'Admin One', email: 'admin@demo.example', password: 'eromza-eromza-eromza' },
      { fullName: 'Admin One', email: 'not-an-email', password: GOOD },
      { fullName: 'A', email: 'admin@demo.example', password: GOOD },
    ]) {
      const r = await createSuperAdmin(input);
      expect(r.created).toBe(false);
    }
    expect(await User.countDocuments()).toBe(0);
  });

  test('creates one active Super Admin with a hashed password and an audit row', async () => {
    const r = await createSuperAdmin({ fullName: 'Admin One', email: 'Admin@Demo.Example', password: GOOD });
    expect(r.created).toBe(true);
    const user = await User.findOne({ role: 'superAdmin' }).select('+passwordHash');
    expect(user.email).toBe('admin@demo.example');
    expect(user.status).toBe('active');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(user.passwordHash).not.toContain(GOOD);
    const log = await AuditLog.findOne({ action: 'superAdminCreated' });
    expect(log).toBeTruthy();
    expect(JSON.stringify(log)).not.toContain(GOOD);
  });

  test('refuses a second one and records the refusal', async () => {
    const r = await createSuperAdmin({ fullName: 'Admin Two', email: 'two@demo.example', password: GOOD });
    expect(r.created).toBe(false);
    expect(await User.countDocuments({ role: 'superAdmin' })).toBe(1);
    expect(await AuditLog.countDocuments({ action: 'superAdminSetupRefused' })).toBe(1);
  });

  test('the new Super Admin can sign in, and is told their role', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ identifier: 'admin@demo.example', password: GOOD });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.role).toBe('superAdmin');
  });
});

describe('Origin check (CSRF second layer)', () => {
  const ok = (req, res) => res.json({ ok: true });
  const mini = () => {
    const a = express();
    a.use(originCheck('http://localhost:5173/'));
    a.all('/x', ok);
    a.use(errorHandler);
    return a;
  };

  test('a POST from another website is blocked', async () => {
    const res = await request(mini()).post('/x').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_BLOCKED');
  });

  test('look-alike origins are blocked', async () => {
    for (const o of ['http://localhost:5173.evil.example', 'http://localhost:5174', 'null']) {
      expect((await request(mini()).delete('/x').set('Origin', o)).status).toBe(403);
    }
  });

  test('our own frontend, GET requests and header-less clients pass', async () => {
    expect((await request(mini()).post('/x').set('Origin', 'http://localhost:5173')).status).toBe(200);
    expect((await request(mini()).get('/x').set('Origin', 'https://evil.example')).status).toBe(200);
    expect((await request(mini()).post('/x')).status).toBe(200);
  });

  test('is active on the real app: a cross-site login is refused before anything is checked', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Origin', 'https://evil.example')
      .send({ identifier: 'admin@demo.example', password: GOOD });
    expect(res.status).toBe(403);
    expect(res.headers['set-cookie']).toBeUndefined();
    const ok2 = await request(app).post('/api/v1/auth/login').set('Origin', env.clientOrigin)
      .send({ identifier: 'admin@demo.example', password: GOOD });
    expect(ok2.status).toBe(200);
  });
});

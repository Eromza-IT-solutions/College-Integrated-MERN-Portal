import { jest } from '@jest/globals';
import request from 'supertest';
import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { clearPermissionCache } from '../src/services/permissionService.js';

jest.setTimeout(60000);

const OLD = 'Correct-Horse-Battery-9';
const NEW = 'Different-Horse-Battery-8';
const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
let mongod;
let user;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'change_password_test' });
  await Promise.all([User.init(), Permission.init()]);
  await Permission.insertMany(matrix);
  clearPermissionCache();
  user = await User.create({
    fullName: 'First Admin',
    email: 'first@test.edu',
    passwordHash: await hashPassword(OLD),
    role: 'superAdmin',
    status: 'active',
    emailVerifiedAt: new Date(),
    mustChangePassword: true,
  });
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

async function login(password = OLD) {
  return request(app).post('/api/v1/auth/login').send({ identifier: 'first@test.edu', password });
}

describe('change password and forced first login', () => {
  let cookie;

  test('a new account is blocked from the portal until the password is changed', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.data.user.mustChangePassword).toBe(true);
    cookie = res.headers['set-cookie'][0].split(';')[0];

    const blocked = await request(app).get('/api/v1/admin/programs').set('Cookie', cookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  test('the current password must be right, and the new one must differ and be strong', async () => {
    const wrong = await request(app).post('/api/v1/auth/change-password').set('Cookie', cookie)
      .send({ currentPassword: 'Wrong-Horse-Battery-9', newPassword: NEW });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('WRONG_PASSWORD');

    const same = await request(app).post('/api/v1/auth/change-password').set('Cookie', cookie)
      .send({ currentPassword: OLD, newPassword: OLD });
    expect(same.status).toBe(400);
    expect(same.body.error.code).toBe('SAME_PASSWORD');

    const weak = await request(app).post('/api/v1/auth/change-password').set('Cookie', cookie)
      .send({ currentPassword: OLD, newPassword: 'short' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('WEAK_PASSWORD');
  });

  test('changing the password clears the flag, keeps this session and cuts off the old password', async () => {
    const changed = await request(app).post('/api/v1/auth/change-password').set('Cookie', cookie)
      .send({ currentPassword: OLD, newPassword: NEW });
    expect(changed.status).toBe(200);

    const fresh = await User.findById(user._id);
    expect(fresh.mustChangePassword).toBe(false);
    expect(fresh.passwordChangedAt).toBeInstanceOf(Date);

    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.mustChangePassword).toBe(false);

    const allowed = await request(app).get('/api/v1/admin/programs').set('Cookie', cookie);
    expect(allowed.status).toBe(200);

    expect((await login(OLD)).status).toBe(401);
    expect((await login(NEW)).status).toBe(200);
    expect(await AuditLog.countDocuments({ action: 'passwordChanged' })).toBe(1);
  });
});

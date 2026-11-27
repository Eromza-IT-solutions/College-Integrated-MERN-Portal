import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { createTestMongo } from './helpers/memoryMongo.js';
import { createSessionMiddleware } from '../src/config/session.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import authRoutes from '../src/modules/auth/auth.routes.js';
import User from '../src/models/User.js';
import AuthToken from '../src/models/AuthToken.js';
import { setEmailTransportForTests } from '../src/services/emailService.js';

const PASSWORD = 'Correct-Horse-Battery-9';
const store = new session.MemoryStore();
store.setMaxListeners(0);

function testApp() {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use(createSessionMiddleware({ store }));
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

let sent;
const fakeTransport = { sendMail: async (msg) => { sent.push(msg); } };
const waitFor = async (cond, ms = 2000) => {
  const started = Date.now();
  while (!cond()) {
    if (Date.now() - started > ms) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
const tokenFrom = (message) => message.text.match(/token=([0-9a-f]{64})/)[1];

let mongod;
let sequence = 0;
const email = () => `applicant${++sequence}@demo.example`;

beforeAll(async () => {
  mongod = await createTestMongo();
  await mongoose.connect(mongod.getUri());
}, 120000);
afterAll(async () => {
  setEmailTransportForTests(null);
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(() => {
  sent = [];
  setEmailTransportForTests(fakeTransport);
});

const register = (body) => request(testApp()).post('/api/v1/auth/register').send(body);
const verify = (token) => request(testApp()).post('/api/v1/auth/verify-email').send({ token });

describe('POST /auth/register', () => {
  test('creates a pending applicant and emails a one-time verification link', async () => {
    const address = email();
    const res = await register({ fullName: 'Asha Patil', email: address, mobile: '9876543210', password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ fullName: 'Asha Patil', email: address, role: 'applicant' });
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const user = await User.findOne({ email: address }).select('+passwordHash');
    expect(user.status).toBe('pending');
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.role).toBe('applicant');

    await waitFor(() => sent.length === 1);
    expect(sent[0].to).toBe(address);
    expect(sent[0].text).toContain('/verify-email?token=');
    const raw = tokenFrom(sent[0]);
    const tokens = await AuthToken.find({ userId: user._id }).lean();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toBe(AuthToken.hash(raw));
    expect(JSON.stringify(res.body)).not.toContain(raw);
  });

  test.each([
    [{ fullName: 'A', email: 'a@b.co', password: PASSWORD }],
    [{ fullName: 'Asha Patil', email: 'not-an-email', password: PASSWORD }],
    [{ fullName: 'Asha Patil', email: 'a@b.co', mobile: '123', password: PASSWORD }],
    [{ fullName: 'Asha Patil', email: 'a@b.co', password: 'short' }],
  ])('rejects bad input %j', async (body) => {
    expect((await register(body)).status).toBe(400);
  });

  test('refuses a duplicate email or mobile number', async () => {
    const address = email();
    expect((await register({ fullName: 'Asha Patil', email: address, mobile: '9876500000', password: PASSWORD })).status).toBe(201);
    const sameEmail = await register({ fullName: 'Other Person', email: address, password: PASSWORD });
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.error.errors[0].field).toBe('email');
    const sameMobile = await register({ fullName: 'Other Person', email: email(), mobile: '9876500000', password: PASSWORD });
    expect(sameMobile.status).toBe(409);
    expect(sameMobile.body.error.errors[0].field).toBe('mobile');
  });
});

describe('POST /auth/verify-email', () => {
  async function pendingApplicant() {
    const address = email();
    const res = await register({ fullName: 'Asha Patil', email: address, password: PASSWORD });
    expect(res.status).toBe(201);
    await waitFor(() => sent.length > 0);
    return { address, user: await User.findOne({ email: address }), token: tokenFrom(sent[sent.length - 1]) };
  }

  test('activates the account and the applicant can sign in', async () => {
    const { address, user, token } = await pendingApplicant();
    const res = await verify(token);
    expect(res.status).toBe(200);

    const fresh = await User.findById(user._id);
    expect(fresh.status).toBe('active');
    expect(fresh.emailVerifiedAt).toBeInstanceOf(Date);
    expect((await AuthToken.countDocuments({ userId: user._id, usedAt: null }))).toBe(0);

    const login = await request(testApp()).post('/api/v1/auth/login').send({ identifier: address, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('applicant');
  });

  test('the link works only once', async () => {
    const { token } = await pendingApplicant();
    expect((await verify(token)).status).toBe(200);
    expect((await verify(token)).status).toBe(400);
  });

  test('a wrong token is refused', async () => {
    expect((await verify('a'.repeat(64))).status).toBe(400);
  });
});

describe('POST /auth/resend-verification', () => {
  test('sends a new link for a pending account and gives the same answer for unknown email', async () => {
    const address = email();
    await register({ fullName: 'Asha Patil', email: address, password: PASSWORD });
    await waitFor(() => sent.length === 1);

    const known = await request(testApp()).post('/api/v1/auth/resend-verification').send({ email: address });
    const unknown = await request(testApp()).post('/api/v1/auth/resend-verification').send({ email: 'nobody@demo.example' });
    expect(known.status).toBe(200);
    expect(known.body.data).toEqual(unknown.body.data);
    await waitFor(() => sent.length === 2);
  });
});

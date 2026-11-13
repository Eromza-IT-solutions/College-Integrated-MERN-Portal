import request from 'supertest';
import express from 'express';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { requirePermission } from '../src/middleware/requirePermission.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { scopeFilter, isInScope } from '../src/utils/scope.js';
import { readFileSync } from 'fs';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

// No database: the rules come from the real matrix file, and the audit log is a stand-in.
let findCalls;
let audits;
beforeEach(() => {
  clearPermissionCache();
  findCalls = 0;
  audits = [];
  Permission.find = () => ({ lean: async () => { findCalls += 1; return matrix; } });
  AuditLog.record = async (entry) => { audits.push(entry); };
});

function appWith(user) {
  const app = express();
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.get('/notices', requirePermission('notices', 'view'), (req, res) => res.json({ scope: req.permission.scope }));
  app.post('/refunds/:id/approve', requirePermission('admissionRefunds', 'approve'), (req, res) => res.json({ ok: true }));
  app.put('/applications/:id', requirePermission('applications', 'update'), (req, res) => res.json({ scope: req.permission.scope }));
  app.get('/marks', requirePermission('marks', 'view'), (req, res) =>
    res.json({ filter: scopeFilter(req, { ownerField: 'teacherId' }) }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message })); // eslint-disable-line no-unused-vars
  return app;
}
const user = (role, extra = {}) => ({ id: '64b000000000000000000001', role, departmentId: null, ...extra });

describe('requirePermission', () => {
  test('401 when nobody is signed in', async () => {
    const res = await request(appWith(null)).get('/notices');
    expect(res.status).toBe(401);
  });

  test('allowed role passes and gets its scope', async () => {
    const res = await request(appWith(user('student'))).get('/notices');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('all');
  });

  test('role without a rule gets 403 and the denial is logged', async () => {
    const res = await request(appWith(user('student'))).post('/refunds/1/approve');
    expect(res.status).toBe(403);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'permissionDenied', entityType: 'admissionRefunds', outcome: 'denied' });
    expect(audits[0].details).toMatchObject({ role: 'student', attempted: 'approve' });
  });

  test('a failing audit write does not change the answer', async () => {
    AuditLog.record = async () => { throw new Error('db down'); };
    const res = await request(appWith(user('student'))).post('/refunds/1/approve');
    expect(res.status).toBe(403);
  });

  test('rules rely on the database read once, not per request', async () => {
    const app = appWith(user('student'));
    await request(app).get('/notices');
    await request(app).get('/notices');
    expect(findCalls).toBe(1);
  });

  test('unknown role is denied', async () => {
    expect((await request(appWith(user('wizard'))).get('/notices')).status).toBe(403);
  });

  test('typos in a route definition fail at start-up', () => {
    expect(() => requirePermission('Not_camel', 'view')).toThrow();
    expect(() => requirePermission('notices', 'read')).toThrow();
  });
});

describe('decisions recorded in the permission matrix', () => {
  test('refunds: only Super Admin approves; Admission and Examination Admin cannot', async () => {
    expect((await request(appWith(user('superAdmin'))).post('/refunds/1/approve')).status).toBe(200);
    expect((await request(appWith(user('admissionAdmin'))).post('/refunds/1/approve')).status).toBe(403);
    expect((await request(appWith(user('examAdmin'))).post('/refunds/1/approve')).status).toBe(403);
  });

  test('applications: applicant edits own; Admission Admin and Super Admin cannot edit', async () => {
    const res = await request(appWith(user('applicant'))).put('/applications/1');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('own');
    expect((await request(appWith(user('admissionAdmin'))).put('/applications/1')).status).toBe(403);
    expect((await request(appWith(user('superAdmin'))).put('/applications/1')).status).toBe(403);
  });

  test('there is no Accounts Admin role any more', async () => {
    expect((await request(appWith(user('accountsAdmin'))).post('/refunds/1/approve')).status).toBe(403);
  });
});

describe('scope helpers', () => {
  test('own scope limits the query to the user', async () => {
    const res = await request(appWith(user('teacher', { departmentId: '64b0000000000000000000d1' }))).get('/marks');
    expect(res.body.filter).toEqual({ teacherId: '64b000000000000000000001' });
  });

  test('department scope without a department matches nothing', async () => {
    const req = { user: user('hod'), permission: { scope: 'department' } };
    expect(scopeFilter(req)).toEqual({ _id: { $in: [] } });
  });

  test('department scope uses the user department', () => {
    const req = { user: user('hod', { departmentId: 'D1' }), permission: { scope: 'department' } };
    expect(scopeFilter(req)).toEqual({ departmentId: 'D1' });
    expect(isInScope(req, { departmentId: 'D1' })).toBe(true);
    expect(isInScope(req, { departmentId: 'D2' })).toBe(false);
  });

  test('all scope has no limit; own scope checks the owner, also when populated', () => {
    const all = { user: user('superAdmin'), permission: { scope: 'all' } };
    expect(scopeFilter(all)).toEqual({});
    expect(isInScope(all, { userId: 'anyone' })).toBe(true);
    const own = { user: user('student'), permission: { scope: 'own' } };
    expect(isInScope(own, { userId: '64b000000000000000000001' })).toBe(true);
    expect(isInScope(own, { userId: { _id: '64b000000000000000000001' } })).toBe(true);
    expect(isInScope(own, { userId: 'someoneElse' })).toBe(false);
    expect(isInScope(own, null)).toBe(false);
  });

  test('helpers refuse to run before requirePermission', () => {
    expect(() => scopeFilter({ user: user('student') })).toThrow();
  });
});

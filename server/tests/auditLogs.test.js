import request from 'supertest';
import express from 'express';
import { readFileSync } from 'fs';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import auditLogsRoutes from '../src/modules/admin/super/auditLogs.routes.js';
import { audit, auditSafe } from '../src/services/auditService.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

// No database: the permission rules come from the real matrix file, and AuditLog is a stand-in.
let audits; // rows the code tried to write
let lastFind; // what the controller asked the database for
let findCalls;

function stubDatabase({ rows = [], total = rows.length } = {}) {
  clearPermissionCache();
  audits = [];
  findCalls = 0;
  lastFind = null;
  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async (entry, options) => { audits.push({ ...entry, __options: options }); return entry; };
  AuditLog.find = (filter) => {
    findCalls += 1;
    lastFind = { filter };
    const query = {
      sort: (s) => { lastFind.sort = s; return query; },
      skip: (n) => { lastFind.skip = n; return query; },
      limit: (n) => { lastFind.limit = n; return query; },
      populate: () => query,
      lean: async () => rows,
    };
    return query;
  };
  AuditLog.countDocuments = async () => total;
}

function appWith(user) {
  const app = express();
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.use('/audit-logs', auditLogsRoutes);
  app.use(errorHandler);
  return app;
}
const user = (role) => ({ id: '64b000000000000000000001', role, departmentId: null });

const ID_A = '64b0000000000000000000b1';
const ID_B = '64b0000000000000000000b2';
const sampleRow = {
  _id: '64b0000000000000000000a1',
  actorUserId: { _id: '64b000000000000000000002', fullName: 'Aman Khan', role: 'admissionAdmin' },
  action: 'refundRequested',
  entityType: 'refund',
  entityId: ID_A,
  outcome: 'success',
  ip: '10.0.0.5',
  details: { amountPaise: 50000 },
  createdAt: new Date('2026-11-10T09:30:00Z'),
};

beforeEach(() => stubDatabase({ rows: [sampleRow], total: 45 }));

describe('GET /audit-logs', () => {
  test('401 when nobody is signed in', async () => {
    const res = await request(appWith(null)).get('/audit-logs');
    expect(res.status).toBe(401);
    expect(findCalls).toBe(0);
  });

  test.each(['applicant', 'student', 'teacher', 'hod', 'websiteAdmin', 'admissionAdmin', 'examAdmin'])(
    '403 for %s, and the attempt is logged',
    async (role) => {
      const res = await request(appWith(user(role))).get('/audit-logs');
      expect(res.status).toBe(403);
      expect(findCalls).toBe(0);
      expect(audits[0]).toMatchObject({ action: 'permissionDenied', entityType: 'auditLogs', outcome: 'denied' });
    }
  );

  test('Super Admin gets rows in the shape the client screen reads', async () => {
    const res = await request(appWith(user('superAdmin'))).get('/audit-logs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      _id: '64b0000000000000000000a1',
      user: { name: 'Aman Khan', role: 'admissionAdmin' },
      action: 'refundRequested',
      module: 'refund',
      outcome: 'success',
      ip: '10.0.0.5',
      createdAt: '2026-11-10T09:30:00.000Z',
    });
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  test('paging: newest first, and the right rows are skipped', async () => {
    const res = await request(appWith(user('superAdmin'))).get('/audit-logs?page=3&limit=10');
    expect(res.status).toBe(200);
    expect(lastFind).toMatchObject({ skip: 20, limit: 10, sort: { createdAt: -1, _id: -1 } });
    expect(res.body.meta).toMatchObject({ page: 3, limit: 10, totalPages: 5 });
  });

  test('filters are passed to the database exactly', async () => {
    const q = `action=refundRequested&entityType=refund&entityId=${ID_A}&actorUserId=${ID_B}&outcome=success`;
    const res = await request(appWith(user('superAdmin'))).get(`/audit-logs?${q}`);
    expect(res.status).toBe(200);
    expect(lastFind.filter).toEqual({
      action: 'refundRequested', entityType: 'refund', entityId: ID_A, actorUserId: ID_B, outcome: 'success',
    });
  });

  test('a date range becomes a createdAt range', async () => {
    const res = await request(appWith(user('superAdmin'))).get('/audit-logs?from=2026-11-01&to=2026-11-30');
    expect(res.status).toBe(200);
    expect(lastFind.filter.createdAt.$gte.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(lastFind.filter.createdAt.$lte.toISOString()).toBe('2026-11-30T00:00:00.000Z');
  });

  test.each([
    ['limit above 100', '?limit=500'],
    ['page zero', '?page=0'],
    ['id that is not an ObjectId', '?actorUserId=123'],
    ['unknown outcome', '?outcome=maybe'],
    ['query-operator injection', '?action[$ne]=x'],
    ['a date that is not a date', '?from=yesterday'],
    ['from after to', '?from=2026-12-01&to=2026-11-01'],
  ])('400 for %s, and the database is never asked', async (_name, qs) => {
    const res = await request(appWith(user('superAdmin'))).get(`/audit-logs${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(findCalls).toBe(0);
  });
});

describe('audit() and auditSafe()', () => {
  const entry = { action: 'refundDecided', entityType: 'refund', entityId: ID_A, details: { approved: true } };

  test('fills the actor and IP from the request; the outcome defaults to success', async () => {
    await audit({ user: user('superAdmin'), ip: '10.0.0.9' }, entry);
    expect(audits[0]).toMatchObject({
      actorUserId: '64b000000000000000000001', ip: '10.0.0.9', action: 'refundDecided', outcome: 'success',
    });
  });

  test('without a request (a webhook) the actor and IP stay empty', async () => {
    await audit(null, { action: 'paymentWebhookReceived', entityType: 'payment' });
    expect(audits[0]).toMatchObject({ actorUserId: null, ip: null });
  });

  test('passes the transaction session on to AuditLog.record', async () => {
    await audit(null, entry, { session: 'S1' });
    expect(audits[0].__options).toEqual({ session: 'S1' });
  });

  test('audit() throws when the write fails, auditSafe() does not', async () => {
    AuditLog.record = async () => { throw new Error('db down'); };
    const original = console.error;
    console.error = () => {}; // keep the test output clean
    try {
      await expect(audit(null, entry)).rejects.toThrow('db down');
      await expect(auditSafe(null, entry)).resolves.toBeNull();
    } finally {
      console.error = original;
    }
  });
});

import { jest } from '@jest/globals';
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
import { authenticate } from '../src/middleware/authenticate.js';
import { requirePermission } from '../src/middleware/requirePermission.js';
import { checkRecordScope, checkDepartmentAccess, checkResourceOwnership, loadById } from '../src/middleware/authorize.js';
import authRoutes from '../src/modules/auth/auth.routes.js';
import rbacRoutes from '../src/modules/admin/super/rbac.routes.js';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { ROLE_VALUES, PERMISSION_ACTIONS, PERMISSION_SCOPES } from '../src/utils/constants.js';

jest.setTimeout(120000);

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const PASSWORD = 'Correct-Horse-Battery-9';

// A small stand-in record type: owned by a user and belonging to a department, like marks or teaching plans.
const Doc = mongoose.models.RbacDoc || mongoose.model('RbacDoc', new mongoose.Schema({ title: String, userId: mongoose.Schema.Types.ObjectId, departmentId: mongoose.Schema.Types.ObjectId }));

const store = new session.MemoryStore();
store.setMaxListeners(0);

// The real session setup, the real auth and RBAC routes, and a few protected demo routes using the real middleware.
function testApp() {
  const a = express();
  a.use(requestId);
  a.use(express.json());
  a.use(createSessionMiddleware({ store }));
  a.use('/api/v1/auth', authRoutes);
  a.use('/api/v1', rbacRoutes);

  const show = (req, res) => res.json({ ok: true, id: String(req.record?._id ?? ''), scope: req.permission?.scope });
  a.get('/docs/:id', authenticate, requirePermission('marks', 'view'), checkRecordScope(loadById(Doc)), show);
  a.put('/docs/:id', authenticate, requirePermission('marks', 'update'), checkResourceOwnership(loadById(Doc)), show);
  a.post('/docs/:id/approve', authenticate, requirePermission('marks', 'approve'), checkDepartmentAccess(loadById(Doc)), show);
  a.get('/admission-admin', authenticate, requirePermission('applications', 'approve'), show);
  a.get('/exam-admin', authenticate, requirePermission('results', 'create'), show);
  a.post('/notices', authenticate, requirePermission('notices', 'create'), show);
  a.use(errorHandler);
  return a;
}

let mongod;
let hash;
const u = {}; // users by name
const agents = {}; // a logged-in "browser" per user
let deptA;
let deptB;
let docs;
const server = testApp();

async function makeUser(name, role, extra = {}) {
  u[name] = await User.create({ fullName: `Rbac ${name}`, email: `${name}@demo.example`, passwordHash: hash, role, status: 'active', ...extra });
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/login').send({ identifier: u[name].email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login of ${name} failed: ${res.status}`);
  agents[name] = agent;
}
const reseedRules = async () => { await Permission.deleteMany({}); await Permission.insertMany(matrix); clearPermissionCache(); };
const ruleOf = (roleKey, resource, action) => Permission.findOne({ roleKey, resource, action });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  hash = await hashPassword(PASSWORD);
  deptA = new mongoose.Types.ObjectId();
  deptB = new mongoose.Types.ObjectId();
  await makeUser('superAdmin', 'superAdmin');
  await makeUser('websiteAdmin', 'websiteAdmin');
  await makeUser('admissionAdmin', 'admissionAdmin');
  await makeUser('examAdmin', 'examAdmin');
  await makeUser('hodA', 'hod', { departmentId: deptA });
  await makeUser('hodB', 'hod', { departmentId: deptB });
  await makeUser('teacherA', 'teacher', { departmentId: deptA });
  await makeUser('teacherB', 'teacher', { departmentId: deptB });
  await makeUser('student1', 'student');
  await makeUser('student2', 'student');
  await makeUser('applicant', 'applicant');
  docs = {
    teacherA: await Doc.create({ title: 'by teacher A', userId: u.teacherA._id, departmentId: deptA }),
    teacherB: await Doc.create({ title: 'by teacher B', userId: u.teacherB._id, departmentId: deptB }),
    student1: await Doc.create({ title: 'of student 1', userId: u.student1._id, departmentId: deptA }),
    student2: await Doc.create({ title: 'of student 2', userId: u.student2._id, departmentId: deptA }),
  };
}, 180000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  await reseedRules();
  await AuditLog.collection.deleteMany({});
});

const NON_SUPER = ['websiteAdmin', 'admissionAdmin', 'examAdmin', 'hodA', 'teacherA', 'student1', 'applicant'];

// ================================================================================================
describe('who may use the role and permission APIs', () => {
  const calls = (ruleId) => [
    ['get', '/api/v1/roles'],
    ['get', '/api/v1/roles/hod'],
    ['get', '/api/v1/permissions'],
    ['get', '/api/v1/permissions/catalog'],
    ['post', '/api/v1/permissions', { roleKey: 'teacher', resource: 'notices', action: 'create', scope: 'department' }],
    ['put', `/api/v1/permissions/${ruleId}`, { scope: 'all' }],
    ['delete', `/api/v1/permissions/${ruleId}`],
  ];

  test('not signed in: 401 on every endpoint', async () => {
    const rule = await ruleOf('student', 'notices', 'view');
    for (const [method, url, body] of calls(rule._id)) {
      const res = await request(server)[method](url).send(body);
      expect([method, url, res.status]).toEqual([method, url, 401]);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  test('signed in as ANY role except Super Admin: 403 on every endpoint, and nothing changes', async () => {
    const rule = await ruleOf('student', 'notices', 'view');
    for (const name of NON_SUPER) {
      for (const [method, url, body] of calls(rule._id)) {
        const res = await agents[name][method](url).send(body);
        expect([name, method, url, res.status]).toEqual([name, method, url, 403]);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    }
    expect(await Permission.countDocuments()).toBe(matrix.length); // not one rule was added, changed or removed
    expect((await Permission.findById(rule._id)).scope).toBe('all');
  });

  test('nobody can give themselves more power: a student, teacher, HOD and admin each try, and each fail', async () => {
    const tries = [
      ['student1', { roleKey: 'student', resource: 'results', action: 'update', scope: 'all' }],
      ['teacherA', { roleKey: 'teacher', resource: 'marks', action: 'approve', scope: 'all' }],
      ['hodA', { roleKey: 'hod', resource: 'users', action: 'delete', scope: 'all' }],
      ['admissionAdmin', { roleKey: 'admissionAdmin', resource: 'admissionRefunds', action: 'approve', scope: 'all' }],
    ];
    for (const [name, body] of tries) expect((await agents[name].post('/api/v1/permissions').send(body)).status).toBe(403);
    expect(await Permission.countDocuments()).toBe(matrix.length);
  });

  test('a role sent in the request or headers does not make someone a Super Admin', async () => {
    const res = await agents.student1
      .post('/api/v1/permissions')
      .set('X-Role', 'superAdmin')
      .query({ role: 'superAdmin' })
      .send({ roleKey: 'student', resource: 'results', action: 'update', scope: 'all', role: 'superAdmin' });
    expect(res.status).toBe(403);
  });

  test('a Super Admin whose role is changed in the database loses access on the very next request', async () => {
    await makeUser('tempAdmin', 'superAdmin');
    expect((await agents.tempAdmin.get('/api/v1/roles')).status).toBe(200);
    await User.updateOne({ _id: u.tempAdmin._id }, { $set: { role: 'student' } });
    expect((await agents.tempAdmin.get('/api/v1/roles')).status).toBe(403);
    await User.deleteOne({ _id: u.tempAdmin._id });
  });

  test('denied attempts are written to the audit log', async () => {
    await agents.student1.get('/api/v1/roles');
    const rows = await AuditLog.find({ action: 'roleDenied' }).lean();
    expect(rows).toHaveLength(1);
    expect(String(rows[0].actorUserId)).toBe(String(u.student1._id));
    expect(rows[0].details.required).toEqual(['superAdmin']);
  });
});

// ================================================================================================
describe('roles: view only, fixed', () => {
  test('GET /roles lists the 8 roles with counts and no sensitive data', async () => {
    const res = await agents.superAdmin.get('/api/v1/roles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['cache-control']).toBe('no-store');
    const roles = res.body.data.roles;
    expect(roles.map((r) => r.key)).toEqual(ROLE_VALUES);
    for (const r of roles) {
      expect(Object.keys(r).sort()).toEqual(['description', 'key', 'label', 'permissionCount', 'protected', 'userCount']);
      expect(r.permissionCount).toBe(matrix.filter((x) => x.roleKey === r.key).length);
    }
    expect(roles.find((r) => r.key === 'student').userCount).toBe(2);
    expect(roles.find((r) => r.key === 'hod').userCount).toBe(2);
    expect(roles.find((r) => r.key === 'superAdmin')).toMatchObject({ protected: true, userCount: 1, label: 'Super Admin' });
    expect(roles.filter((r) => r.protected)).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|email|\$2[aby]\$/);
  });

  test('descriptions come from the Role collection when it has been seeded', async () => {
    await Role.create({ key: 'hod', label: 'Head of Department', description: 'Head of one department' });
    const hod = (await agents.superAdmin.get('/api/v1/roles')).body.data.roles.find((r) => r.key === 'hod');
    expect(hod.description).toBe('Head of one department');
    await Role.deleteMany({});
  });

  test('GET /roles/:roleKey shows the role\'s rules grouped by resource', async () => {
    const res = await agents.superAdmin.get('/api/v1/roles/hod');
    expect(res.status).toBe(200);
    const role = res.body.data.role;
    expect(role.key).toBe('hod');
    const total = role.permissions.reduce((n, p) => n + p.actions.length, 0);
    expect(total).toBe(matrix.filter((x) => x.roleKey === 'hod').length);
    const plans = role.permissions.find((p) => p.resource === 'teachingPlans');
    expect(plans.actions.find((a) => a.action === 'approve').scope).toBe('department');
    expect(plans.actions[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  test('an unknown role is 404', async () => {
    const res = await agents.superAdmin.get('/api/v1/roles/wizard');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('roles cannot be created, renamed or deleted: those URLs do not exist', async () => {
    const a = agents.superAdmin;
    expect((await a.post('/api/v1/roles').send({ key: 'newRole', label: 'New' })).status).toBe(404);
    expect((await a.put('/api/v1/roles/hod').send({ label: 'Renamed' })).status).toBe(404);
    expect((await a.patch('/api/v1/roles/hod').send({ label: 'Renamed' })).status).toBe(404);
    expect((await a.delete('/api/v1/roles/hod')).status).toBe(404);
    expect((await a.get('/api/v1/roles')).body.data.roles).toHaveLength(8);
  });
});

// ================================================================================================
describe('permission rules: list and catalog', () => {
  test('lists every rule, newest-format fields only', async () => {
    const res = await agents.superAdmin.get('/api/v1/permissions');
    expect(res.status).toBe(200);
    expect(res.body.data.permissions).toHaveLength(matrix.length);
    expect(Object.keys(res.body.data.permissions[0]).sort()).toEqual(['action', 'createdAt', 'id', 'resource', 'roleKey', 'scope', 'updatedAt']);
  });

  test('filters by role, resource and action', async () => {
    const get = async (qs) => (await agents.superAdmin.get(`/api/v1/permissions${qs}`)).body.data.permissions;
    expect(await get('?roleKey=hod')).toHaveLength(matrix.filter((x) => x.roleKey === 'hod').length);
    expect((await get('?resource=notices')).every((p) => p.resource === 'notices')).toBe(true);
    expect((await get('?roleKey=teacher&action=create')).every((p) => p.roleKey === 'teacher' && p.action === 'create')).toBe(true);
    expect(await get('?roleKey=teacher&resource=results')).toEqual([]);
  });

  test('bad filters are refused, including database-operator tricks', async () => {
    for (const qs of ['?roleKey=wizard', '?action=destroy', '?resource=Not_Camel', '?roleKey[$ne]=x', '?roleKey[]=hod&roleKey[]=teacher', '?resource[$regex]=.*']) {
      const res = await agents.superAdmin.get(`/api/v1/permissions${qs}`);
      expect([qs, res.status]).toEqual([qs, 400]);
    }
  });

  test('the catalog offers roles, actions, scopes and known resources', async () => {
    const res = await agents.superAdmin.get('/api/v1/permissions/catalog');
    expect(res.status).toBe(200);
    const c = res.body.data;
    expect(c.roles.map((r) => r.key)).toEqual(ROLE_VALUES);
    expect(c.actions).toEqual(PERMISSION_ACTIONS);
    expect(c.scopes).toEqual(PERMISSION_SCOPES);
    expect(c.resources).toEqual(expect.arrayContaining(['notices', 'marks', 'auditLogs', 'admissionRefunds']));
    expect(c.resources).toEqual([...c.resources].sort());
  });

  test('a resource stays in the catalog even after all its rules were removed (so it can be granted again)', async () => {
    await Permission.deleteMany({ resource: 'reports' });
    expect((await agents.superAdmin.get('/api/v1/permissions/catalog')).body.data.resources).toContain('reports');
  });
});

// ================================================================================================
describe('granting a rule (POST /permissions)', () => {
  const body = { roleKey: 'teacher', resource: 'notices', action: 'create', scope: 'department' };

  test('creates it: 201, stored, and recorded in the audit log', async () => {
    expect(await ruleOf('teacher', 'notices', 'create')).toBeNull();
    const res = await agents.superAdmin.post('/api/v1/permissions').send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.permission).toMatchObject(body);
    expect(await ruleOf('teacher', 'notices', 'create')).toMatchObject({ scope: 'department' });
    const row = await AuditLog.findOne({ action: 'permissionGranted' }).lean();
    expect(String(row.actorUserId)).toBe(String(u.superAdmin._id));
    expect(row).toMatchObject({ entityType: 'permission', outcome: 'success' });
    expect(row.details).toMatchObject({ roleKey: 'teacher', resource: 'notices', action: 'create', scope: 'department' });
    expect(String(row.entityId)).toBe(res.body.data.permission.id);
  });

  test('a second grant of the same rule is 409; the existing rule is untouched', async () => {
    await agents.superAdmin.post('/api/v1/permissions').send(body);
    const again = await agents.superAdmin.post('/api/v1/permissions').send({ ...body, scope: 'all' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('RULE_EXISTS');
    expect((await ruleOf('teacher', 'notices', 'create')).scope).toBe('department');
    expect(await Permission.countDocuments({ roleKey: 'teacher', resource: 'notices', action: 'create' })).toBe(1);
  });

  test('an existing matrix rule cannot be granted again either', async () => {
    const res = await agents.superAdmin.post('/api/v1/permissions').send({ roleKey: 'student', resource: 'notices', action: 'view', scope: 'all' });
    expect(res.status).toBe(409);
  });

  test('Super Admin rules cannot be added to: 403 PROTECTED_ROLE', async () => {
    const res = await agents.superAdmin.post('/api/v1/permissions').send({ roleKey: 'superAdmin', resource: 'notices', action: 'export', scope: 'all' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROTECTED_ROLE');
    expect(await ruleOf('superAdmin', 'notices', 'export')).toBeNull();
  });

  test('an unknown resource (a likely typo) is refused with 400 UNKNOWN_RESOURCE', async () => {
    const res = await agents.superAdmin.post('/api/v1/permissions').send({ ...body, resource: 'noticess' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_RESOURCE');
    expect(await Permission.countDocuments()).toBe(matrix.length);
  });

  test.each([
    ['unknown role', { roleKey: 'wizard' }],
    ['unknown action', { action: 'destroy' }],
    ['unknown scope', { scope: 'everything' }],
    ['bad resource format', { resource: 'Not_Camel' }],
    ['role as a database operator', { roleKey: { $ne: 'superAdmin' } }],
    ['scope as an array', { scope: ['all'] }],
    ['numbers instead of text', { action: 1, scope: 2 }],
    ['extra fields (mass assignment)', { _id: '64b000000000000000000001', createdAt: '2001-01-01', isAdmin: true }],
    ['a role-changing field', { role: 'superAdmin' }],
  ])('invalid request - %s: 400 and nothing stored', async (_name, change) => {
    const res = await agents.superAdmin.post('/api/v1/permissions').send({ ...body, ...change });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await Permission.countDocuments()).toBe(matrix.length);
  });

  test('missing or empty bodies are 400', async () => {
    expect((await agents.superAdmin.post('/api/v1/permissions').send({})).status).toBe(400);
    expect((await agents.superAdmin.post('/api/v1/permissions')).status).toBe(400);
    expect((await agents.superAdmin.post('/api/v1/permissions').send({ roleKey: 'teacher' })).status).toBe(400);
  });
});

// ================================================================================================
describe('changing a rule (PUT /permissions/:id)', () => {
  test('changes the scope: stored, reported, audited with the previous value', async () => {
    const rule = await ruleOf('hod', 'notices', 'create'); // department
    const res = await agents.superAdmin.put(`/api/v1/permissions/${rule._id}`).send({ scope: 'own' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ changed: true, permission: { scope: 'own', roleKey: 'hod', resource: 'notices', action: 'create' } });
    expect((await Permission.findById(rule._id)).scope).toBe('own');
    const row = await AuditLog.findOne({ action: 'permissionScopeChanged' }).lean();
    expect(row.details).toMatchObject({ previousScope: 'department', scope: 'own', roleKey: 'hod' });
    expect(String(row.actorUserId)).toBe(String(u.superAdmin._id));
  });

  test('setting the same scope is a harmless no-op: changed=false and no audit row', async () => {
    const rule = await ruleOf('hod', 'notices', 'create');
    const res = await agents.superAdmin.put(`/api/v1/permissions/${rule._id}`).send({ scope: 'department' });
    expect(res.status).toBe(200);
    expect(res.body.data.changed).toBe(false);
    expect(await AuditLog.countDocuments({ action: 'permissionScopeChanged' })).toBe(0);
  });

  test('only the scope can be changed: the role, resource or action cannot be moved', async () => {
    const rule = await ruleOf('teacher', 'marks', 'view');
    for (const extra of [{ roleKey: 'superAdmin' }, { resource: 'results' }, { action: 'delete' }, { _id: '64b000000000000000000001' }]) {
      const res = await agents.superAdmin.put(`/api/v1/permissions/${rule._id}`).send({ scope: 'all', ...extra });
      expect(res.status).toBe(400);
    }
    expect(await Permission.findById(rule._id)).toMatchObject({ roleKey: 'teacher', resource: 'marks', action: 'view', scope: 'own' });
  });

  test.each([[{ scope: 'galaxy' }], [{ scope: ['all'] }], [{ scope: { $ne: 'own' } }], [{}]])('invalid body %j is 400', async (b) => {
    const rule = await ruleOf('teacher', 'marks', 'view');
    expect((await agents.superAdmin.put(`/api/v1/permissions/${rule._id}`).send(b)).status).toBe(400);
    expect((await Permission.findById(rule._id)).scope).toBe('own');
  });

  test('a Super Admin rule cannot be changed: 403 PROTECTED_ROLE', async () => {
    const rule = await ruleOf('superAdmin', 'users', 'delete');
    const res = await agents.superAdmin.put(`/api/v1/permissions/${rule._id}`).send({ scope: 'own' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROTECTED_ROLE');
    expect((await Permission.findById(rule._id)).scope).toBe('all');
  });

  test('unknown, malformed or injected ids are 404', async () => {
    for (const id of [new mongoose.Types.ObjectId().toString(), 'not-an-id', '123', '%7B%24ne%3A1%7D']) {
      const res = await agents.superAdmin.put(`/api/v1/permissions/${id}`).send({ scope: 'all' });
      expect([id, res.status]).toEqual([id, 404]);
    }
  });
});

// ================================================================================================
describe('revoking a rule (DELETE /permissions/:id)', () => {
  test('removes it: gone from the database, audited', async () => {
    const rule = await ruleOf('teacher', 'timetable', 'view');
    const res = await agents.superAdmin.delete(`/api/v1/permissions/${rule._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ revoked: true, permission: { roleKey: 'teacher', resource: 'timetable', action: 'view' } });
    expect(await Permission.findById(rule._id)).toBeNull();
    const row = await AuditLog.findOne({ action: 'permissionRevoked' }).lean();
    expect(row.details).toMatchObject({ roleKey: 'teacher', resource: 'timetable', action: 'view', scope: 'own' });
    expect(String(row.actorUserId)).toBe(String(u.superAdmin._id));
  });

  test('revoking twice: the second time is 404', async () => {
    const rule = await ruleOf('teacher', 'timetable', 'view');
    expect((await agents.superAdmin.delete(`/api/v1/permissions/${rule._id}`)).status).toBe(200);
    expect((await agents.superAdmin.delete(`/api/v1/permissions/${rule._id}`)).status).toBe(404);
  });

  test('a Super Admin rule cannot be revoked: 403 PROTECTED_ROLE, still in place', async () => {
    const rule = await ruleOf('superAdmin', 'auditLogs', 'view');
    const res = await agents.superAdmin.delete(`/api/v1/permissions/${rule._id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROTECTED_ROLE');
    expect(await Permission.findById(rule._id)).not.toBeNull();
    expect(await Permission.countDocuments({ roleKey: 'superAdmin' })).toBe(matrix.filter((x) => x.roleKey === 'superAdmin').length);
  });

  test('unknown or malformed ids are 404; nothing is deleted', async () => {
    for (const id of [new mongoose.Types.ObjectId().toString(), 'nope']) expect((await agents.superAdmin.delete(`/api/v1/permissions/${id}`)).status).toBe(404);
    expect(await Permission.countDocuments()).toBe(matrix.length);
  });

  test('the audit trail holds no secrets and records exactly who did it', async () => {
    const a = await agents.superAdmin.post('/api/v1/permissions').send({ roleKey: 'teacher', resource: 'notices', action: 'create', scope: 'department' });
    const id = a.body.data.permission.id;
    await agents.superAdmin.put(`/api/v1/permissions/${id}`).send({ scope: 'own' });
    await agents.superAdmin.delete(`/api/v1/permissions/${id}`);
    const rows = await AuditLog.find({ entityType: 'permission' }).sort({ createdAt: 1 }).lean();
    expect(rows.map((r) => r.action)).toEqual(['permissionGranted', 'permissionScopeChanged', 'permissionRevoked']);
    for (const r of rows) expect(String(r.actorUserId)).toBe(String(u.superAdmin._id));
    expect(JSON.stringify(rows)).not.toMatch(/passwordHash|\$2[aby]\$|sid|cookie/i);
  });
});

// ================================================================================================
describe('changes take effect straight away', () => {
  test('grant -> allowed at once; change scope -> narrower at once; revoke -> denied at once', async () => {
    expect((await agents.student1.post('/notices')).status).toBe(403); // students cannot create notices
    const granted = await agents.superAdmin.post('/api/v1/permissions').send({ roleKey: 'student', resource: 'notices', action: 'create', scope: 'own' });
    expect(granted.status).toBe(201);
    const allowed = await agents.student1.post('/notices');
    expect(allowed.status).toBe(200);
    expect(allowed.body.scope).toBe('own');

    await agents.superAdmin.put(`/api/v1/permissions/${granted.body.data.permission.id}`).send({ scope: 'all' });
    expect((await agents.student1.post('/notices')).body.scope).toBe('all');

    await agents.superAdmin.delete(`/api/v1/permissions/${granted.body.data.permission.id}`);
    expect((await agents.student1.post('/notices')).status).toBe(403);
  });

  test('revoking a rule locks out that role immediately, and only that role', async () => {
    expect((await agents.admissionAdmin.get('/admission-admin')).status).toBe(200);
    const rule = await ruleOf('admissionAdmin', 'applications', 'approve');
    await agents.superAdmin.delete(`/api/v1/permissions/${rule._id}`);
    expect((await agents.admissionAdmin.get('/admission-admin')).status).toBe(403);
  });

  test('the permission list that login and /me return follows the change', async () => {
    const before = (await agents.student1.get('/api/v1/auth/me')).body.data.permissions;
    expect(before.find((p) => p.resource === 'notices' && p.action === 'create')).toBeUndefined();
    await agents.superAdmin.post('/api/v1/permissions').send({ roleKey: 'student', resource: 'notices', action: 'create', scope: 'own' });
    const after = (await agents.student1.get('/api/v1/auth/me')).body.data.permissions;
    expect(after.find((p) => p.resource === 'notices' && p.action === 'create')).toEqual({ resource: 'notices', action: 'create', scope: 'own' });
  });
});

// ================================================================================================
// The separation rules from the project brief, with real logins, real sessions and real database records.
describe('separation between the administrators (real sessions)', () => {
  test('College Website Admin cannot use admission or examination administration', async () => {
    expect((await agents.websiteAdmin.get('/admission-admin')).status).toBe(403);
    expect((await agents.websiteAdmin.get('/exam-admin')).status).toBe(403);
  });
  test('Admission Admin: own area yes, examination area no', async () => {
    expect((await agents.admissionAdmin.get('/admission-admin')).status).toBe(200);
    expect((await agents.admissionAdmin.get('/exam-admin')).status).toBe(403);
  });
  test('Examination Admin: own area yes, admission area no', async () => {
    expect((await agents.examAdmin.get('/exam-admin')).status).toBe(200);
    expect((await agents.examAdmin.get('/admission-admin')).status).toBe(403);
  });
  test('Super Admin is not automatically everything: it has no "approve applications" or "create results" rule either', async () => {
    expect((await agents.superAdmin.get('/admission-admin')).status).toBe(403);
    expect((await agents.superAdmin.get('/exam-admin')).status).toBe(403);
  });
  test('students, teachers, HODs and applicants reach none of it', async () => {
    for (const name of ['student1', 'teacherA', 'hodA', 'applicant']) {
      expect((await agents[name].get('/admission-admin')).status).toBe(403);
      expect((await agents[name].get('/exam-admin')).status).toBe(403);
    }
  });
  test('nobody who is not signed in reaches anything', async () => {
    for (const url of ['/admission-admin', '/exam-admin', `/docs/${docs.teacherA._id}`]) expect((await request(server).get(url)).status).toBe(401);
    expect((await request(server).post('/notices')).status).toBe(401);
  });
});

describe('records: department, ownership and "my own data" (real sessions)', () => {
  const view = (name, doc) => agents[name].get(`/docs/${docs[doc]._id}`);

  test('HOD sees their own department only', async () => {
    expect((await view('hodA', 'teacherA')).status).toBe(200);
    expect((await view('hodA', 'student1')).status).toBe(200);
    const other = await view('hodA', 'teacherB');
    expect(other.status).toBe(403);
    expect(other.body.error.message).toBe('You do not have access to this record');
    expect((await view('hodB', 'teacherB')).status).toBe(200);
    expect((await view('hodB', 'teacherA')).status).toBe(403);
    expect((await view('hodB', 'student1')).status).toBe(403);
  });

  test('HOD may approve only inside their department', async () => {
    expect((await agents.hodA.post(`/docs/${docs.teacherA._id}/approve`)).status).toBe(200);
    expect((await agents.hodA.post(`/docs/${docs.teacherB._id}/approve`)).status).toBe(403);
    expect((await agents.hodB.post(`/docs/${docs.teacherA._id}/approve`)).status).toBe(403);
    expect((await agents.teacherA.post(`/docs/${docs.teacherA._id}/approve`)).status).toBe(403); // a teacher has no approve rule
  });

  test('Teacher reaches only their own records, not a colleague\'s or a student\'s', async () => {
    expect((await view('teacherA', 'teacherA')).status).toBe(200);
    expect((await view('teacherA', 'teacherB')).status).toBe(403);
    expect((await view('teacherA', 'student1')).status).toBe(403);
    expect((await agents.teacherA.put(`/docs/${docs.teacherA._id}`)).status).toBe(200);
    expect((await agents.teacherA.put(`/docs/${docs.teacherB._id}`)).status).toBe(403);
    expect((await agents.teacherA.put(`/docs/${docs.student1._id}`)).status).toBe(403);
  });

  test('HOD cannot edit what they do not own, even in their own department', async () => {
    expect((await agents.hodA.put(`/docs/${docs.teacherA._id}`)).status).toBe(403);
  });

  test('Student sees only their own record; changing the id in the URL does not help', async () => {
    expect((await view('student1', 'student1')).status).toBe(200);
    expect((await view('student1', 'student2')).status).toBe(403);
    expect((await view('student2', 'student1')).status).toBe(403);
    expect((await view('student1', 'teacherA')).status).toBe(403);
    expect((await agents.student1.put(`/docs/${docs.student1._id}`)).status).toBe(403); // students may view, not edit
  });

  test('Examination Admin and Super Admin: marks of everyone (scope all)? Only where the matrix says so', async () => {
    expect((await view('examAdmin', 'student1')).status).toBe(200);
    expect((await view('examAdmin', 'teacherB')).status).toBe(200);
    expect((await view('superAdmin', 'teacherA')).status).toBe(200);
  });

  test('roles with no rule on this resource are refused before any record is looked at', async () => {
    for (const name of ['websiteAdmin', 'admissionAdmin', 'applicant']) expect((await view(name, 'student1')).status).toBe(403);
  });

  test('missing records are 404, malformed ids are 404, never a server error', async () => {
    const missing = new mongoose.Types.ObjectId();
    expect((await agents.superAdmin.get(`/docs/${missing}`)).status).toBe(404);
    for (const id of ['not-an-id', '123', '%00', '..%2F..%2Fetc', '%7B%24ne%3A1%7D']) {
      const res = await agents.superAdmin.get(`/docs/${id}`);
      expect([id, res.status]).toEqual([id, 404]);
    }
  });

  test('nothing in the URL or request can widen access: query, body, headers and path tricks', async () => {
    const target = docs.teacherB._id; // another department
    const h = agents.hodA;
    expect((await h.get(`/docs/${target}`).query({ departmentId: String(deptB), scope: 'all', role: 'superAdmin' })).status).toBe(403);
    expect((await h.get(`/docs/${target}`).set('X-Department-Id', String(deptB)).set('X-Role', 'superAdmin')).status).toBe(403);
    expect((await h.get(`/docs/${target}/`)).status).toBe(403); // trailing slash
    expect((await h.get(`/docs/${target}?id=${docs.teacherA._id}`)).status).toBe(403); // second id in the query
    const trick = await h.get(`/docs/${docs.teacherA._id}/../${target}`); // path trick: matches no route, or is refused
    expect([403, 404]).toContain(trick.status);
    expect(JSON.stringify(trick.body)).not.toContain('by teacher B'); // and no record content comes back
    expect((await h.put(`/docs/${target}`).send({ userId: String(u.hodA._id), departmentId: String(deptA) })).status).toBe(403);
    expect((await h.post(`/docs/${target}/approve`).send({ departmentId: String(deptA) })).status).toBe(403);
    expect((await h.get(`/docs/${target}`).set('X-HTTP-Method-Override', 'POST')).status).toBe(403);
  });

  test('a demoted user loses access at once: the role is read from the database on every request', async () => {
    await makeUser('flip', 'hod', { departmentId: deptA });
    expect((await agents.flip.get(`/docs/${docs.student1._id}`)).status).toBe(200);
    await User.updateOne({ _id: u.flip._id }, { $set: { role: 'applicant', departmentId: null } });
    expect((await agents.flip.get(`/docs/${docs.student1._id}`)).status).toBe(403);
    await User.deleteOne({ _id: u.flip._id });
  });

  test('moving a user to another department moves their reach with them', async () => {
    await makeUser('mover', 'hod', { departmentId: deptA });
    expect((await agents.mover.get(`/docs/${docs.teacherA._id}`)).status).toBe(200);
    await User.updateOne({ _id: u.mover._id }, { $set: { departmentId: deptB } });
    expect((await agents.mover.get(`/docs/${docs.teacherA._id}`)).status).toBe(403);
    expect((await agents.mover.get(`/docs/${docs.teacherB._id}`)).status).toBe(200);
    await User.deleteOne({ _id: u.mover._id });
  });

  test('a deactivated user is signed out at once (401), whatever their role', async () => {
    await makeUser('leaver', 'hod', { departmentId: deptA });
    await User.updateOne({ _id: u.leaver._id }, { $set: { status: 'deactivated' } });
    expect((await agents.leaver.get(`/docs/${docs.teacherA._id}`)).status).toBe(401);
    await User.deleteOne({ _id: u.leaver._id });
  });

  test('refused record requests are audited, naming the guard and the scope', async () => {
    await view('student1', 'student2');
    const row = await AuditLog.findOne({ action: 'recordAccessDenied' }).lean();
    expect(String(row.actorUserId)).toBe(String(u.student1._id));
    expect(row.details).toMatchObject({ scope: 'own', guard: 'checkRecordScope', role: 'student', attempted: 'view' });
  });
});

describe('wiring in the real app', () => {
  test('the role and permission routes are mounted and protected', async () => {
    for (const url of ['/api/v1/roles', '/api/v1/roles/hod', '/api/v1/permissions', '/api/v1/permissions/catalog']) {
      const res = await request(app).get(url);
      expect([url, res.status]).toEqual([url, 401]);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
    expect((await request(app).post('/api/v1/permissions').send({})).status).toBe(401);
    expect((await request(app).delete('/api/v1/permissions/64b000000000000000000001')).status).toBe(401);
  });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { readFileSync } from 'fs';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { requirePermission } from '../src/middleware/requirePermission.js';
import { authenticate } from '../src/middleware/authenticate.js';
import {
  authorizeRole,
  checkRecordScope,
  checkDepartmentAccess,
  checkResourceOwnership,
  loadById,
  authenticateUser,
  authorizePermission,
} from '../src/middleware/authorize.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { clearPermissionCache, getScope, getPermissionsForRole } from '../src/services/permissionService.js';
import { ROLE_VALUES, PERMISSION_ACTIONS } from '../src/utils/constants.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

// No database: the rules come from the real matrix file, and the audit log is a stand-in that remembers rows.
let audits;
beforeEach(() => {
  clearPermissionCache();
  audits = [];
  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async (entry) => { audits.push(entry); };
});

const DEPT_A = '64b0000000000000000000a1';
const DEPT_B = '64b0000000000000000000b2';
const ID = (n) => `64b00000000000000000000${n}`;
const user = (role, extra = {}) => ({ id: ID(1), role, departmentId: null, ...extra });

// A few "database records" kept in memory.
const RECORDS = {
  mine: { _id: 'mine', userId: ID(1), departmentId: DEPT_A },
  sameDept: { _id: 'sameDept', userId: ID(2), departmentId: DEPT_A },
  otherDept: { _id: 'otherDept', userId: ID(3), departmentId: DEPT_B },
};
const fromMap = (req) => RECORDS[req.params.id] ?? null;

function appWith(actor) {
  const app = express();
  app.use((req, res, next) => { if (actor) req.user = actor; next(); });
  const show = (req, res) => res.json({ ok: true, record: req.record?._id, scope: req.permission?.scope });

  app.get('/area/super', authorizeRole('superAdmin'), show);
  app.get('/area/admins', authorizeRole('superAdmin', 'websiteAdmin', 'admissionAdmin', 'examAdmin'), show);
  app.get('/area/staff', authorizeRole(['teacher', 'hod']), show);

  app.get('/marks/:id', requirePermission('marks', 'view'), checkRecordScope(fromMap), show);
  app.get('/dept/:id', requirePermission('marks', 'view'), checkDepartmentAccess(fromMap), show);
  app.post('/plans/:id/approve', requirePermission('teachingPlans', 'approve'), checkDepartmentAccess(fromMap), show);
  app.put('/own/:id', requirePermission('marks', 'update'), checkResourceOwnership(fromMap), show);
  app.get('/view-own/:id', requirePermission('marks', 'view'), checkResourceOwnership(fromMap), show);
  app.get('/forgot-permission/:id', checkRecordScope(fromMap), show); // wrongly set up on purpose: no requirePermission
  app.get('/applications', requirePermission('applications', 'view'), show);
  app.get('/results/create-check', requirePermission('results', 'create'), show);
  app.get('/fee-refund-approve', requirePermission('admissionRefunds', 'approve'), show);

  app.use(errorHandler);
  return app;
}
const as = (role, extra) => appWith(user(role, extra));

describe('aliases for the names used in the project plan', () => {
  test('authenticateUser and authorizePermission are the existing middleware', () => {
    expect(authenticateUser).toBe(authenticate);
    expect(authorizePermission).toBe(requirePermission);
  });
});

describe('error answers carry a proper code', () => {
  test('requirePermission: 401 UNAUTHENTICATED and 403 FORBIDDEN', async () => {
    const anon = await request(appWith(null)).get('/applications');
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHENTICATED');
    const denied = await request(as('student')).get('/applications');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });
});

describe('authorizeRole', () => {
  test('allows a listed role, refuses the others with 403 FORBIDDEN', async () => {
    expect((await request(as('superAdmin')).get('/area/super')).status).toBe(200);
    for (const role of ROLE_VALUES.filter((r) => r !== 'superAdmin')) {
      const res = await request(as(role)).get('/area/super');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  test('401 when nobody is signed in', async () => {
    const res = await request(appWith(null)).get('/area/super');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('several roles, and a list passed as one argument', async () => {
    for (const role of ['superAdmin', 'websiteAdmin', 'admissionAdmin', 'examAdmin']) expect((await request(as(role)).get('/area/admins')).status).toBe(200);
    for (const role of ['student', 'teacher', 'hod', 'applicant']) expect((await request(as(role)).get('/area/admins')).status).toBe(403);
    expect((await request(as('hod', { departmentId: DEPT_A })).get('/area/staff')).status).toBe(200);
    expect((await request(as('teacher', { departmentId: DEPT_A })).get('/area/staff')).status).toBe(200);
    expect((await request(as('student')).get('/area/staff')).status).toBe(403);
  });

  test('a role the browser claims is irrelevant: only req.user (from the database) counts, and unknown roles are refused', async () => {
    expect((await request(as('wizard')).get('/area/super')).status).toBe(403);
    const res = await request(as('student')).get('/area/super').set('X-Role', 'superAdmin').query({ role: 'superAdmin' });
    expect(res.status).toBe(403);
  });

  test('a refusal is written to the audit log with the roles that were required', async () => {
    await request(as('student')).get('/area/super');
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'roleDenied', outcome: 'denied', actorUserId: ID(1) });
    expect(audits[0].details).toMatchObject({ role: 'student', required: ['superAdmin'] });
  });

  test('a failing audit write does not change the answer', async () => {
    AuditLog.record = async () => { throw new Error('db down'); };
    expect((await request(as('student')).get('/area/super')).status).toBe(403);
  });

  test('mistakes in a route definition stop the server at start-up', () => {
    expect(() => authorizeRole()).toThrow();
    expect(() => authorizeRole('superadmin')).toThrow(/unknown role/);
    expect(() => authorizeRole('superAdmin', 'wizard')).toThrow(/unknown role/);
  });
});

describe('record guards: scope all / department / own', () => {
  test('checkRecordScope - teacher (own): only their own record', async () => {
    const t = as('teacher', { departmentId: DEPT_A });
    expect((await request(t).get('/marks/mine')).status).toBe(200);
    expect((await request(t).get('/marks/sameDept')).status).toBe(403); // a colleague's record, same department
    expect((await request(t).get('/marks/otherDept')).status).toBe(403);
  });

  test('checkRecordScope - HOD (department): own department only', async () => {
    const h = as('hod', { departmentId: DEPT_A });
    expect((await request(h).get('/marks/sameDept')).status).toBe(200);
    expect((await request(h).get('/marks/mine')).status).toBe(200);
    const other = await request(h).get('/marks/otherDept');
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe('FORBIDDEN');
    expect(other.body.error.message).toBe('You do not have access to this record');
  });

  test('checkRecordScope - the other department HOD sees the opposite', async () => {
    const h = as('hod', { departmentId: DEPT_B });
    expect((await request(h).get('/marks/otherDept')).status).toBe(200);
    expect((await request(h).get('/marks/sameDept')).status).toBe(403);
  });

  test('checkRecordScope - student (own) cannot read another student; Exam Admin and Super Admin (all) can read any', async () => {
    expect((await request(as('student')).get('/marks/mine')).status).toBe(200);
    expect((await request(as('student')).get('/marks/sameDept')).status).toBe(403);
    for (const role of ['examAdmin', 'superAdmin']) {
      for (const id of Object.keys(RECORDS)) expect((await request(as(role)).get(`/marks/${id}`)).status).toBe(200);
    }
  });

  test('the record is handed to the route as req.record, with the scope', async () => {
    const res = await request(as('hod', { departmentId: DEPT_A })).get('/marks/sameDept');
    expect(res.body).toEqual({ ok: true, record: 'sameDept', scope: 'department' });
  });

  test('checkDepartmentAccess: HOD approves in own department only; everyone else has no rule', async () => {
    const h = as('hod', { departmentId: DEPT_A });
    expect((await request(h).post('/plans/sameDept/approve')).status).toBe(200);
    expect((await request(h).post('/plans/otherDept/approve')).status).toBe(403);
    expect((await request(as('hod', { departmentId: DEPT_B })).post('/plans/sameDept/approve')).status).toBe(403);
    for (const role of ['teacher', 'student', 'applicant', 'examAdmin', 'admissionAdmin', 'websiteAdmin']) {
      expect((await request(as(role, { departmentId: DEPT_A })).post('/plans/sameDept/approve')).status).toBe(403);
    }
  });

  test('checkDepartmentAccess: an HOD with no department matches nothing; scope "all" passes; scope "own" is refused', async () => {
    expect((await request(as('hod')).get('/dept/sameDept')).status).toBe(403);
    expect((await request(as('superAdmin')).get('/dept/otherDept')).status).toBe(200);
    expect((await request(as('teacher', { departmentId: DEPT_A })).get('/dept/mine')).status).toBe(403); // own scope, department guard
  });

  test('checkResourceOwnership: teacher edits own record only; scope "department" is refused; "all" passes', async () => {
    const t = as('teacher', { departmentId: DEPT_A });
    expect((await request(t).put('/own/mine')).status).toBe(200);
    expect((await request(t).put('/own/sameDept')).status).toBe(403);
    expect((await request(as('hod', { departmentId: DEPT_A })).get('/view-own/sameDept')).status).toBe(403); // department scope, ownership guard
    expect((await request(as('examAdmin')).get('/view-own/otherDept')).status).toBe(200);
  });

  test('a record owned by nobody is not "own" for anyone', async () => {
    RECORDS.orphan = { _id: 'orphan', userId: null, departmentId: null };
    expect((await request(as('student')).get('/marks/orphan')).status).toBe(403);
    delete RECORDS.orphan;
  });

  test('404 when the record does not exist (and the permission was already granted)', async () => {
    const res = await request(as('superAdmin')).get('/marks/ghost');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('without a permission rule the guard is never reached: 403 from requirePermission first', async () => {
    expect((await request(as('websiteAdmin')).get('/marks/mine')).status).toBe(403);
    expect(audits[0].action).toBe('permissionDenied');
  });

  test('401 when nobody is signed in', async () => {
    expect((await request(appWith(null)).get('/marks/mine')).status).toBe(401);
  });

  test('a route that forgot requirePermission fails safe (500 SERVER_MISCONFIGURED), it never opens up', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {}); // the error handler logs every 500
    const res = await request(as('superAdmin')).get('/forgot-permission/mine');
    log.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SERVER_MISCONFIGURED');
  });

  test('refused record access is written to the audit log', async () => {
    await request(as('student')).get('/marks/sameDept');
    const row = audits.find((a) => a.action === 'recordAccessDenied');
    expect(row).toMatchObject({ entityType: 'marks', outcome: 'denied', actorUserId: ID(1) });
    expect(row.details).toMatchObject({ scope: 'own', guard: 'checkRecordScope', attempted: 'view', role: 'student' });
  });

  test('the loader function is required, and loadById treats a malformed id as "not found"', async () => {
    expect(() => checkRecordScope('not a function')).toThrow();
    expect(() => checkDepartmentAccess()).toThrow();
    expect(() => checkResourceOwnership(null)).toThrow();
    expect(await loadById({ findById: () => { throw new Error('must not be called'); } })({ params: { id: 'not-an-object-id' } })).toBeNull();
    expect(await loadById({ findById: () => { throw new Error('must not be called'); } })({ params: {} })).toBeNull();
    expect(await loadById({ findById: () => { throw new Error('must not be called'); } })({ params: { id: { $ne: null } } })).toBeNull();
  });

  test('role and department are taken from req.user: nothing the browser sends changes the outcome', async () => {
    const res = await request(as('hod', { departmentId: DEPT_A }))
      .get('/marks/otherDept')
      .query({ departmentId: DEPT_B, role: 'superAdmin', scope: 'all' })
      .set('X-Department-Id', DEPT_B);
    expect(res.status).toBe(403);
  });
});

// ================================================================================================
// The whole approved matrix, checked exhaustively: every role x every resource x every action.
describe('the permission matrix, exhaustively', () => {
  const resources = [...new Set(matrix.map((r) => r.resource))];
  const expected = new Map(matrix.map((r) => [`${r.roleKey}|${r.resource}|${r.action}`, r.scope]));

  test('every combination gives exactly what the matrix says: allowed with that scope, or denied', async () => {
    let allowed = 0;
    let denied = 0;
    for (const role of ROLE_VALUES) {
      for (const resource of resources) {
        for (const action of PERMISSION_ACTIONS) {
          const scope = await getScope(role, resource, action);
          const want = expected.get(`${role}|${resource}|${action}`) ?? null;
          if (scope !== want) throw new Error(`${role} ${action} ${resource}: got ${scope}, expected ${want}`);
          if (want) allowed += 1; else denied += 1;
        }
      }
    }
    expect(allowed).toBe(matrix.length); // 178
    expect(denied).toBeGreaterThan(allowed); // far more is refused than allowed
  });

  test('roles and resources that do not exist have no permissions at all', async () => {
    for (const action of PERMISSION_ACTIONS) {
      expect(await getScope('wizard', 'notices', action)).toBeNull();
      expect(await getScope('superAdmin', 'doesNotExist', action)).toBeNull();
    }
    expect(await getScope('accountsAdmin', 'admissionRefunds', 'approve')).toBeNull();
  });

  test('getPermissionsForRole lists exactly that role\'s rules, nothing from other roles', async () => {
    for (const role of ROLE_VALUES) {
      const list = await getPermissionsForRole(role);
      const want = matrix.filter((r) => r.roleKey === role);
      expect(list).toHaveLength(want.length);
      for (const p of list) expect(expected.get(`${role}|${p.resource}|${p.action}`)).toBe(p.scope);
    }
    expect(await getPermissionsForRole('wizard')).toEqual([]);
  });

  // Safety nets: these fail loudly if someone edits the matrix in a way that opens a hole.
  test('applicants, students and teachers never get "all" scope except to READ shared reference data', async () => {
    const shared = new Set(['notices', 'departments', 'academicYears']);
    for (const r of matrix.filter((x) => ['applicant', 'student', 'teacher'].includes(x.roleKey) && x.scope === 'all')) {
      expect({ ...r, ok: r.action === 'view' && shared.has(r.resource) }).toMatchObject({ ok: true });
    }
  });

  test('an HOD never reaches beyond their department, except to read shared reference data', () => {
    const shared = new Set(['notices', 'departments', 'academicYears']);
    for (const r of matrix.filter((x) => x.roleKey === 'hod' && x.scope === 'all')) {
      expect(r.action).toBe('view');
      expect(shared.has(r.resource)).toBe(true);
    }
  });

  test('only the Super Admin can create, change or delete user accounts and departments, or approve refunds', () => {
    const sensitive = matrix.filter((r) =>
      (['users', 'departments'].includes(r.resource) && ['create', 'delete'].includes(r.action)) ||
      (r.resource === 'departments' && r.action === 'update') ||
      (['admissionRefunds', 'examRefunds'].includes(r.resource) && r.action === 'approve') ||
      (r.resource === 'auditLogs')
    );
    expect(sensitive.length).toBeGreaterThan(0);
    for (const r of sensitive) expect(r.roleKey).toBe('superAdmin');
  });

  test('nobody except the Super Admin can read audit logs; nobody can delete marks, results or payments', () => {
    expect(matrix.filter((r) => r.resource === 'auditLogs').every((r) => r.roleKey === 'superAdmin')).toBe(true);
    for (const r of matrix.filter((x) => ['marks', 'results', 'admissionPayments', 'examPayments', 'attendance'].includes(x.resource))) {
      expect(r.action).not.toBe('delete');
    }
  });

  test('users can only update their OWN user record (own scope) - except the Super Admin', () => {
    for (const r of matrix.filter((x) => x.resource === 'users' && x.action === 'update' && x.roleKey !== 'superAdmin')) {
      expect(r.scope).toBe('own');
    }
  });

  test('every rule in the matrix is valid and unique', () => {
    const keys = matrix.map((r) => `${r.roleKey}|${r.resource}|${r.action}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of matrix) {
      expect(ROLE_VALUES).toContain(r.roleKey);
      expect(PERMISSION_ACTIONS).toContain(r.action);
      expect(['own', 'department', 'all']).toContain(r.scope);
    }
  });
});

// ================================================================================================
// The separation of duties from the project brief, as real requests.
describe('separation between the administrators', () => {
  const admins = ['websiteAdmin', 'admissionAdmin', 'examAdmin'];

  test('College Website Admin cannot reach admission or examination administration', async () => {
    const w = as('websiteAdmin');
    expect((await request(w).get('/applications')).status).toBe(403);
    expect((await request(w).get('/results/create-check')).status).toBe(403);
    expect((await request(w).get('/fee-refund-approve')).status).toBe(403);
  });

  test('Admission Admin cannot reach examination administration', async () => {
    const a = as('admissionAdmin');
    expect((await request(a).get('/applications')).status).toBe(200);
    expect((await request(a).get('/results/create-check')).status).toBe(403);
  });

  test('Examination Admin cannot reach admission administration', async () => {
    const e = as('examAdmin');
    expect((await request(e).get('/results/create-check')).status).toBe(200);
    expect((await request(e).get('/applications')).status).toBe(403);
  });

  test('no administrator except the Super Admin can approve refunds', async () => {
    for (const role of admins) expect((await request(as(role)).get('/fee-refund-approve')).status).toBe(403);
    expect((await request(as('superAdmin')).get('/fee-refund-approve')).status).toBe(200);
  });

  test('students, teachers and HODs cannot reach any administrator area', async () => {
    for (const role of ['student', 'teacher', 'hod']) {
      const c = as(role, { departmentId: DEPT_A });
      expect((await request(c).get('/applications')).status).toBe(403);
      expect((await request(c).get('/results/create-check')).status).toBe(403);
      expect((await request(c).get('/fee-refund-approve')).status).toBe(403);
    }
  });

  test('an applicant reaches only their OWN applications (scope own), and nothing administrative', async () => {
    const a = as('applicant');
    const res = await request(a).get('/applications');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('own');
    expect((await request(a).get('/results/create-check')).status).toBe(403);
    expect((await request(a).get('/fee-refund-approve')).status).toBe(403);
  });
});

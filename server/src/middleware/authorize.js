// Authorization middleware: "you are logged in, but are you ALLOWED to do this?"
//
// The full checking chain for a protected route, in the order it runs:
//
//   authenticate            who are you?                        none -> 401
//   authorizeRole           are you one of these roles?         no   -> 403       (coarse door: "admins only")
//   requirePermission       does your role have this rule?      no   -> 403       (the permission matrix)
//   checkRecordScope /      is THIS record inside your reach?   no   -> 403       (own / your department / all)
//   checkDepartmentAccess /                                     none -> 404
//   checkResourceOwnership
//   your route handler
//
// Example: an HOD approving a teaching plan.
//   router.post('/teaching-plans/:id/approve',
//     authenticate,
//     requirePermission('teachingPlans', 'approve'),          // does an HOD have this rule at all?
//     checkDepartmentAccess(loadById(TeachingPlan)),          // is THIS plan in the HOD's own department?
//     approvePlan);                                           // the plan is waiting in req.record
//
// The role, department and user id always come from the database (see authenticate.js), never from the browser.
import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import AuditLog from '../models/AuditLog.js';
import { ROLE_VALUES, AUDIT_OUTCOME } from '../utils/constants.js';
import { getActor } from './requirePermission.js';
import { isInScope } from '../utils/scope.js';

// The same two building blocks under the names used in the project plan.
export { authenticate as authenticateUser } from './authenticate.js';
export { requirePermission as authorizePermission } from './requirePermission.js';

const notSignedIn = () => new AppError('Please sign in.', 401, undefined, 'UNAUTHENTICATED');
const forbidden = (message = 'You do not have permission to do this') => new AppError(message, 403, undefined, 'FORBIDDEN');

// Records a refused request. Best effort: a failure to write the log must never change the answer.
function auditDenied(req, action, entityType, details) {
  const actor = getActor(req);
  Promise.resolve(
    AuditLog.record({
      actorUserId: actor?.id ?? null,
      action,
      entityType,
      outcome: AUDIT_OUTCOME.DENIED,
      ip: req.ip,
      details: { role: actor?.role, method: req.method, path: `${req.baseUrl || ''}${req.path || ''}`, ...details },
    })
  ).catch(() => {});
}

/**
 * Only the listed roles may continue. Use it for whole areas that belong to one kind of person.
 *   router.use('/admin/super', authenticate, authorizeRole('superAdmin'));
 * Use requirePermission() instead when the answer depends on the specific action (view, approve, delete ...).
 */
export function authorizeRole(...roles) {
  const allowed = roles.flat();
  if (allowed.length === 0) throw new Error('authorizeRole: give at least one role');
  for (const r of allowed) if (!ROLE_VALUES.includes(r)) throw new Error(`authorizeRole: unknown role "${r}"`); // typo -> stops at start-up

  return (req, res, next) => {
    const actor = getActor(req);
    if (!actor) return next(notSignedIn());
    if (!allowed.includes(actor.role)) {
      auditDenied(req, 'roleDenied', 'route', { required: allowed });
      return next(forbidden());
    }
    return next();
  };
}

/**
 * Turns "a function that finds the record" into a route guard. Shared by the three guards below.
 * `decide(req, record)` returns true when the user may touch this record.
 */
function recordGuard(label, loadRecord, decide) {
  if (typeof loadRecord !== 'function') throw new Error(`${label}: the first argument must be a function (req) => record`);

  return asyncHandler(async (req, res, next) => {
    if (!getActor(req)) throw notSignedIn();
    // The scope comes from requirePermission(). Without it we would not know how far this user may reach.
    if (!req.permission) throw new AppError('This route is missing its permission check.', 500, undefined, 'SERVER_MISCONFIGURED');

    const record = await loadRecord(req);
    if (!record) throw new AppError('Not found', 404, undefined, 'NOT_FOUND');

    if (!decide(req, record)) {
      auditDenied(req, 'recordAccessDenied', req.permission.resource, { scope: req.permission.scope, guard: label, attempted: req.permission.action });
      throw forbidden('You do not have access to this record');
    }
    req.record = record; // handed on, so the route does not have to load it a second time
    next();
  });
}

/**
 * The all-rounder: the record must be inside the user's scope, whichever scope the matrix gave them.
 *   scope all        -> any record
 *   scope department -> only records of the user's own department   (record[departmentField])
 *   scope own        -> only records the user owns                  (record[ownerField])
 * Use it on routes shared by roles with different scopes, for example a teacher (own) and an HOD (department).
 */
export function checkRecordScope(loadRecord, { ownerField = 'userId', departmentField = 'departmentId' } = {}) {
  return recordGuard('checkRecordScope', loadRecord, (req, record) => isInScope(req, record, { ownerField, departmentField }));
}

/**
 * Department boundary only: a user with department scope may touch just their own department's records.
 * A user whose scope is "own" is REFUSED here (use checkResourceOwnership or checkRecordScope for them);
 * refusing is the safe default if a route was set up for the wrong kind of user.
 */
export function checkDepartmentAccess(loadRecord, { departmentField = 'departmentId' } = {}) {
  return recordGuard('checkDepartmentAccess', loadRecord, (req, record) => {
    const { scope } = req.permission;
    if (scope === 'all') return true;
    return scope === 'department' && isInScope(req, record, { departmentField });
  });
}

/**
 * Ownership only: a user with own scope may touch just the records that belong to them.
 * A user whose scope is "department" is REFUSED here (use checkDepartmentAccess or checkRecordScope for them).
 */
export function checkResourceOwnership(loadRecord, { ownerField = 'userId' } = {}) {
  return recordGuard('checkResourceOwnership', loadRecord, (req, record) => {
    const { scope } = req.permission;
    if (scope === 'all') return true;
    return scope === 'own' && isInScope(req, record, { ownerField });
  });
}

/**
 * The usual "find the record from the :id in the URL" for the guards above.
 *   checkDepartmentAccess(loadById(TeachingPlan))
 * A malformed id counts as "not found" (404), never as a database error.
 */
export function loadById(Model, { param = 'id' } = {}) {
  return (req) => {
    const id = req.params?.[param];
    return mongoose.isValidObjectId(id) ? Model.findById(id).lean() : null;
  };
}

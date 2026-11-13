import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import AuditLog from '../models/AuditLog.js';
import { PERMISSION_ACTIONS, AUDIT_OUTCOME } from '../utils/constants.js';
import { getScope } from '../services/permissionService.js';

// The login middleware (still to be built) must set req.user to: { id, role, departmentId }.
// Nothing here reads the session directly, so this works however login is stored.
function getActor(req) {
  const u = req.user;
  if (!u || !u.id || !u.role) return null;
  return { id: String(u.id), role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null };
}

/**
 * Allow the request only if the user's role may do `action` on `resource` (see the permission matrix).
 *   router.get('/notices', requirePermission('notices', 'view'), listNotices);
 * Afterwards req.permission = { resource, action, scope } tells the handler how far the user may reach:
 * use scopeFilter(req) from utils/scope.js to limit database queries to that scope.
 *   401 = not signed in, 403 = signed in but the matrix gives this role no rule.
 */
function requirePermission(resource, action) {
  // A typo in a route file should stop the server at start-up, not silently deny everyone.
  if (!/^[a-z][A-Za-z0-9]*$/.test(resource || '')) throw new Error(`requirePermission: bad resource "${resource}"`);
  if (!PERMISSION_ACTIONS.includes(action)) throw new Error(`requirePermission: bad action "${action}"`);

  return asyncHandler(async (req, res, next) => {
    const actor = getActor(req);
    if (!actor) throw new AppError('Please sign in', 401);

    const scope = await getScope(actor.role, resource, action);
    if (!scope) {
      // Best effort: a failure to write the log must never change the answer.
      Promise.resolve(
        AuditLog.record({
          actorUserId: actor.id,
          action: 'permissionDenied',
          entityType: resource,
          outcome: AUDIT_OUTCOME.DENIED,
          ip: req.ip,
          details: { role: actor.role, attempted: action, method: req.method, path: `${req.baseUrl || ''}${req.path || ''}` },
        })
      ).catch(() => {});
      throw new AppError('You do not have permission to do this', 403);
    }

    req.permission = { resource, action, scope };
    next();
  });
}

export { requirePermission, getActor };

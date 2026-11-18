// HTTP side of the Super Admin "Roles" and "Permissions" screens.
import { z } from 'zod';
import AppError from '../../../utils/AppError.js';
import asyncHandler from '../../../utils/asyncHandler.js';
import AuditLog from '../../../models/AuditLog.js';
import { ROLE_VALUES, PERMISSION_ACTIONS, PERMISSION_SCOPES, AUDIT_OUTCOME } from '../../../utils/constants.js';
import * as rbac from './rbac.service.js';

const roleKey = z.enum(ROLE_VALUES);
const resource = z.string().regex(/^[a-z][A-Za-z0-9]*$/, 'Resource must be camelCase, like teachingPlans').max(60);
const action = z.enum(PERMISSION_ACTIONS);
const scope = z.enum(PERMISSION_SCOPES);

// .strict(): a request with any field we did not ask for is rejected (nobody can slip in an _id, createdAt, ...).
const grantBody = z.object({ roleKey, resource, action, scope }).strict();
const scopeBody = z.object({ scope }).strict();
const listQuery = z.object({ roleKey: roleKey.optional(), resource: resource.optional(), action: action.optional() });

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      'The request is not valid.',
      400,
      result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      'VALIDATION_ERROR'
    );
  }
  return result.data;
}

// Every change to what people may do is recorded: who, what, and how it was before. Best effort, like other audit rows.
function audit(req, action_, rule, details = {}) {
  return AuditLog.record({
    actorUserId: req.user.id,
    action: action_,
    entityType: 'permission',
    entityId: rule.id,
    outcome: AUDIT_OUTCOME.SUCCESS,
    ip: req.ip,
    details: { roleKey: rule.roleKey, resource: rule.resource, action: rule.action, scope: rule.scope, ...details },
  }).catch((err) => console.error('Could not write audit log:', err.message));
}

const send = (req, res, data, status = 200) => {
  res.set('Cache-Control', 'no-store');
  res.status(status).json({ success: true, data, meta: { requestId: req.id } });
};

// ---- roles (read only) ----
export const listRoles = asyncHandler(async (req, res) => send(req, res, { roles: await rbac.listRoles() }));

// An unknown role name in the URL is simply "not found" (404).
export const getRole = asyncHandler(async (req, res) => send(req, res, { role: await rbac.getRole(req.params.roleKey) }));

// ---- permission rules ----
export const getCatalog = asyncHandler(async (req, res) => send(req, res, await rbac.catalog()));

export const listPermissions = asyncHandler(async (req, res) => {
  const filter = parse(listQuery, req.query);
  send(req, res, { permissions: await rbac.listPermissions(filter) });
});

export const grantPermission = asyncHandler(async (req, res) => {
  const body = parse(grantBody, req.body);
  const { rule } = await rbac.grantPermission(body);
  await audit(req, 'permissionGranted', rule);
  send(req, res, { permission: rule }, 201);
});

export const changePermissionScope = asyncHandler(async (req, res) => {
  const { scope: newScope } = parse(scopeBody, req.body);
  const { rule, previousScope, changed } = await rbac.changeScope(req.params.id, newScope);
  if (changed) await audit(req, 'permissionScopeChanged', rule, { previousScope });
  send(req, res, { permission: rule, changed });
});

export const revokePermission = asyncHandler(async (req, res) => {
  const { rule } = await rbac.revokePermission(req.params.id);
  await audit(req, 'permissionRevoked', rule);
  send(req, res, { revoked: true, permission: rule });
});

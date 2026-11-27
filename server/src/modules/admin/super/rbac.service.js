// The logic behind the Super Admin screens "Roles" and "Permissions".
//
// What can be changed, and what cannot:
//   - The 8 roles are FIXED. They cannot be created, renamed or deleted (users carry a role name; the code relies on it).
//   - What a role may DO is a list of rules (Permission rows): role + resource + action + scope. The Super Admin can
//     add, change the scope of, or remove these rules, for every role EXCEPT Super Admin itself.
//
// Be aware: the file scripts/data/permission-matrix.json is the team's approved starting point and
// `npm run seed:permissions` writes it into the database, INSERT-ONLY. Running it again never changes a scope set here
// and keeps rules added here, but it restores a rule that was revoked here (it cannot tell "revoked" from "missing").
// `npm run seed:permissions -- --prune` deletes rules that are not in the matrix, including ones added here.
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import AppError from '../../../utils/AppError.js';
import Permission from '../../../models/Permission.js';
import Role from '../../../models/Role.js';
import User from '../../../models/User.js';
import { ROLES, ROLE_VALUES, ROLE_LABELS, PERMISSION_ACTIONS, PERMISSION_SCOPES } from '../../../utils/constants.js';
import { clearPermissionCache } from '../../../services/permissionService.js';

const matrix = JSON.parse(readFileSync(new URL('../../../../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

const protectedRole = () =>
  new AppError('Super Admin permissions cannot be changed here. They are defined in the permission matrix.', 403, undefined, 'PROTECTED_ROLE');
const notFound = (what) => new AppError(`${what} not found`, 404, undefined, 'NOT_FOUND');

/** One rule as the API shows it. */
export function toRule(p) {
  return { id: String(p._id), roleKey: p.roleKey, resource: p.resource, action: p.action, scope: p.scope, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

/** Every resource name the system knows: the ones in the approved matrix plus any already in the database. */
async function knownResources() {
  const inDatabase = await Permission.distinct('resource');
  return [...new Set([...matrix.map((r) => r.resource), ...inDatabase])].sort();
}

// ---- roles (read only) ----

export async function listRoles() {
  const [users, rules, rows] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    Permission.aggregate([{ $group: { _id: '$roleKey', n: { $sum: 1 } } }]),
    Role.find({}).lean(), // only holds descriptions; the list of roles itself comes from the code, so it is complete everywhere
  ]);
  const count = (list) => Object.fromEntries(list.map((x) => [x._id, x.n]));
  const userCount = count(users);
  const ruleCount = count(rules);
  const description = Object.fromEntries(rows.map((r) => [r.key, r.description]));
  return ROLE_VALUES.map((key) => ({
    key,
    label: ROLE_LABELS[key],
    description: description[key] ?? '',
    userCount: userCount[key] ?? 0,
    permissionCount: ruleCount[key] ?? 0,
    protected: key === ROLES.SUPER_ADMIN, // its rules cannot be edited through the API
  }));
}

export async function getRole(roleKey) {
  const role = (await listRoles()).find((r) => r.key === roleKey);
  if (!role) throw notFound('Role');
  const rules = await Permission.find({ roleKey }).sort({ resource: 1, action: 1 }).lean();
  const grouped = new Map();
  for (const r of rules) {
    if (!grouped.has(r.resource)) grouped.set(r.resource, []);
    grouped.get(r.resource).push({ id: String(r._id), action: r.action, scope: r.scope });
  }
  return { ...role, permissions: [...grouped].map(([resource, actions]) => ({ resource, actions })) };
}

// ---- permission rules ----

export async function listPermissions(filter = {}) {
  const rules = await Permission.find(filter).sort({ roleKey: 1, resource: 1, action: 1 }).lean();
  return rules.map(toRule);
}

/** What the screens may offer in drop-down lists. */
export async function catalog() {
  return {
    roles: ROLE_VALUES.map((key) => ({ key, label: ROLE_LABELS[key], protected: key === ROLES.SUPER_ADMIN })),
    actions: PERMISSION_ACTIONS,
    scopes: PERMISSION_SCOPES,
    resources: await knownResources(),
  };
}

/** Give a role a new rule. Fails if the role already has a rule for that resource and action (use changeScope). */
export async function grantPermission({ roleKey, resource, action, scope }) {
  if (roleKey === ROLES.SUPER_ADMIN) throw protectedRole();
  // A resource name must already exist. This stops a typo from creating a rule that protects nothing.
  if (!(await knownResources()).includes(resource)) {
    throw new AppError(`Unknown resource "${resource}". Resources are added together with the feature that uses them.`, 400, undefined, 'UNKNOWN_RESOURCE');
  }
  try {
    const rule = await Permission.create({ roleKey, resource, action, scope });
    clearPermissionCache();
    return { rule: toRule(rule) };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('This role already has a rule for that resource and action. Change its scope instead.', 409, undefined, 'RULE_EXISTS');
    }
    throw err;
  }
}

async function findRule(id) {
  const rule = mongoose.isValidObjectId(id) ? await Permission.findById(id) : null;
  if (!rule) throw notFound('Permission rule');
  if (rule.roleKey === ROLES.SUPER_ADMIN) throw protectedRole();
  return rule;
}

/** Change how far an existing rule reaches (own / department / all). Returns the rule and what it was before. */
export async function changeScope(id, scope) {
  const rule = await findRule(id);
  const previousScope = rule.scope;
  if (previousScope !== scope) {
    rule.scope = scope;
    await rule.save();
    clearPermissionCache();
  }
  return { rule: toRule(rule), previousScope, changed: previousScope !== scope };
}

/** Take a rule away. Afterwards the role may no longer do that action on that resource. */
export async function revokePermission(id) {
  const rule = await findRule(id);
  await rule.deleteOne();
  clearPermissionCache();
  return { rule: toRule(rule) };
}

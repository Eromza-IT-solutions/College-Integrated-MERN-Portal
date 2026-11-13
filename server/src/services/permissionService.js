import Permission from '../models/Permission.js';

// Keeps the permission rules in memory so a request does not need a database query to be checked.
// Rules are reloaded every 60 seconds, so after `npm run seed:permissions` the change is live within a minute.
const REFRESH_MS = 60 * 1000;

let rules = null; // Map: "role|resource|action" -> "own" | "department" | "all"
let loadedAt = 0;
let loading = null;

async function load() {
  const rows = await Permission.find({}).lean();
  const next = new Map();
  for (const r of rows) next.set(`${r.roleKey}|${r.resource}|${r.action}`, r.scope);
  rules = next;
  loadedAt = Date.now();
  return next;
}

async function ready() {
  if (rules && Date.now() - loadedAt < REFRESH_MS) return rules;
  // Several requests at once share one database read.
  if (!loading) loading = load().finally(() => { loading = null; });
  return loading;
}

/** The scope ("own", "department" or "all") this role has for the action, or null if it has none. */
async function getScope(role, resource, action) {
  const map = await ready();
  return map.get(`${role}|${resource}|${action}`) || null;
}

/** Forget the loaded rules (used by tests and after changing rules). */
function clearPermissionCache() {
  rules = null;
  loadedAt = 0;
}

export { getScope, clearPermissionCache };

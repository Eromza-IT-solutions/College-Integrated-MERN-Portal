import { getActor } from '../middleware/requirePermission.js';

// Matches nothing, used when a user has department scope but no department.
const MATCH_NOTHING = Object.freeze({ _id: { $in: [] } });

function idOf(value) {
  return String(value && value._id ? value._id : value);
}

function context(req) {
  const actor = getActor(req);
  if (!actor || !req.permission) throw new Error('scope helpers need requirePermission() to run first');
  return { actor, scope: req.permission.scope };
}

/**
 * A database filter that limits a query to what the user's scope allows.
 *   Notice.find({ ...scopeFilter(req, { departmentField: 'departmentId' }), isPublished: true })
 * own -> only records whose ownerField is the user; department -> records of the user's department;
 * all -> no limit. Default fields: ownerField "userId", departmentField "departmentId".
 */
function scopeFilter(req, { ownerField = 'userId', departmentField = 'departmentId' } = {}) {
  const { actor, scope } = context(req);
  if (scope === 'all') return {};
  if (scope === 'own') return { [ownerField]: actor.id };
  if (scope === 'department') return actor.departmentId ? { [departmentField]: actor.departmentId } : { ...MATCH_NOTHING };
  return { ...MATCH_NOTHING };
}

/** Same rule for one record you already loaded (for update, approve or delete by id). */
function isInScope(req, record, { ownerField = 'userId', departmentField = 'departmentId' } = {}) {
  const { actor, scope } = context(req);
  if (!record) return false;
  if (scope === 'all') return true;
  if (scope === 'own') return record[ownerField] != null && idOf(record[ownerField]) === actor.id;
  if (scope === 'department') {
    return !!actor.departmentId && record[departmentField] != null && idOf(record[departmentField]) === actor.departmentId;
  }
  return false;
}

export { scopeFilter, isInScope };

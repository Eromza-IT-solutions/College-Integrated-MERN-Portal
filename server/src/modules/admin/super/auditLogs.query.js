import AppError from '../../../utils/AppError.js';
import { AUDIT_OUTCOME_VALUES } from '../../../utils/constants.js';

// Turns the URL query (?page=2&action=refundRequested ...) into a safe database filter.
// It has no database code, so it is easy to test. Bad input is answered with 400, never passed on.

const OBJECT_ID = /^[a-f\d]{24}$/i;
const MAX_LIMIT = 100;
const MAX_TEXT = 60;

function parseAuditQuery(query = {}) {
  const errors = [];
  const bad = (field, message) => {
    errors.push({ field, message }); // returns nothing, so `return bad(...)` leaves the value empty
  };

  // Only plain text is accepted. ?action[$ne]=x arrives as an object and is refused (NoSQL injection).
  const text = (field) => {
    const value = query[field];
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string') return bad(field, `${field} must be plain text`);
    const trimmed = value.trim();
    if (trimmed.length > MAX_TEXT) return bad(field, `${field} is too long`);
    return trimmed || undefined;
  };
  const whole = (field, fallback, min, max) => {
    const raw = text(field);
    if (raw === undefined) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      bad(field, `${field} must be a whole number from ${min} to ${max}`);
      return fallback;
    }
    return n;
  };
  const objectId = (field) => {
    const raw = text(field);
    if (raw !== undefined && !OBJECT_ID.test(raw)) return bad(field, `${field} is not a valid id`);
    return raw;
  };
  const date = (field) => {
    const raw = text(field);
    if (raw === undefined) return undefined;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? bad(field, `${field} is not a valid date`) : d;
  };

  const page = whole('page', 1, 1, 100000);
  const limit = whole('limit', 20, 1, MAX_LIMIT);
  const action = text('action');
  const entityType = text('entityType');
  const entityId = objectId('entityId');
  const actorUserId = objectId('actorUserId');
  const outcome = text('outcome');
  if (outcome !== undefined && !AUDIT_OUTCOME_VALUES.includes(outcome)) {
    bad('outcome', `outcome must be one of: ${AUDIT_OUTCOME_VALUES.join(', ')}`);
  }
  const from = date('from');
  const to = date('to');
  if (from && to && from > to) bad('from', 'from must be earlier than to');

  if (errors.length) throw new AppError('Invalid search filters', 400, errors, 'VALIDATION_ERROR');

  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (actorUserId) filter.actorUserId = actorUserId;
  if (outcome) filter.outcome = outcome;
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  return { page, limit, filter };
}

export { parseAuditQuery };

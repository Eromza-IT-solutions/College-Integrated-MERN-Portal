import AuditLog from '../../../models/AuditLog.js';
import { parseAuditQuery } from './auditLogs.query.js';

/**
 * Find audit rows for the screen: filtered, newest first, one page at a time.
 * `Model` defaults to the real AuditLog; the check script passes a temporary-database copy.
 */
async function searchAuditLogs(query, Model = AuditLog) {
  const { page, limit, filter } = parseAuditQuery(query);
  const [rows, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1, _id: -1 }) // _id breaks ties between rows saved in the same millisecond
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actorUserId', 'fullName role') // only the name and role, never the password hash
      .lean(),
    Model.countDocuments(filter),
  ]);
  return { rows, total, page, limit };
}

export { searchAuditLogs };

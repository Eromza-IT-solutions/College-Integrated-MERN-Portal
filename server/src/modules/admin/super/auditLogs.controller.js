import asyncHandler from '../../../utils/asyncHandler.js';
import { searchAuditLogs } from './auditLogs.service.js';

// One row in the shape the client's Audit Logs screen reads: { _id, user, action, module, ip, createdAt }
// plus the extra fields (outcome, entity, details) for a details panel later.
function toClient(row) {
  const actor = row.actorUserId;
  return {
    _id: row._id,
    user: actor && actor.fullName ? { _id: actor._id, name: actor.fullName, role: actor.role } : null,
    action: row.action,
    module: row.entityType || 'System',
    outcome: row.outcome,
    entityType: row.entityType,
    entityId: row.entityId,
    ip: row.ip,
    details: row.details,
    createdAt: row.createdAt,
  };
}

// GET /api/v1/audit-logs?page=&limit=&action=&entityType=&entityId=&actorUserId=&outcome=&from=&to=
const listAuditLogs = asyncHandler(async (req, res) => {
  const { rows, total, page, limit } = await searchAuditLogs(req.query);
  res.json({
    success: true,
    data: rows.map(toClient),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), requestId: req.id },
  });
});

export { listAuditLogs };

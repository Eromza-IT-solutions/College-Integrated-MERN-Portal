import express from 'express';
import { requirePermission } from '../../../middleware/requirePermission.js';
import { listAuditLogs } from './auditLogs.controller.js';

const router = express.Router();

// The permission matrix gives "auditLogs: view" to superAdmin only.
router.get('/', requirePermission('auditLogs', 'view'), listAuditLogs);

export default router;

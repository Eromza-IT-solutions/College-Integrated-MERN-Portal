// URLs for managing roles and permissions. Mounted at /api/v1 in routes/index.js.
//
// SUPER ADMIN ONLY, and decided here in code with authorizeRole, NOT through the permission rules. That is on purpose:
// the permission rules are exactly what these routes edit, so letting a rule decide who may edit rules would let a
// rule change give (or take away) the power to change rules.
//
// There is no "create role" or "delete role" URL: the 8 roles are fixed.
import express from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorizeRole } from '../../../middleware/authorize.js';
import { ROLES } from '../../../utils/constants.js';
import * as c from './rbac.controller.js';

const router = express.Router();
const superAdminOnly = [authenticate, authorizeRole(ROLES.SUPER_ADMIN)];

router.get('/roles', superAdminOnly, c.listRoles); //                       GET    /api/v1/roles
router.get('/roles/:roleKey', superAdminOnly, c.getRole); //                GET    /api/v1/roles/hod

router.get('/permissions/catalog', superAdminOnly, c.getCatalog); //        GET    /api/v1/permissions/catalog
router.get('/permissions', superAdminOnly, c.listPermissions); //           GET    /api/v1/permissions?roleKey=hod
router.post('/permissions', superAdminOnly, c.grantPermission); //          POST   /api/v1/permissions
router.put('/permissions/:id', superAdminOnly, c.changePermissionScope); // PUT    /api/v1/permissions/:id
router.delete('/permissions/:id', superAdminOnly, c.revokePermission); //   DELETE /api/v1/permissions/:id

export default router;

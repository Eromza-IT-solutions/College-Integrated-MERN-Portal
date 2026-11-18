import express from 'express';
import { requirePermission } from '../../../middleware/requirePermission.js';
import * as c from './management.controller.js';

const router = express.Router();

router.get('/users', requirePermission('users', 'view'), c.listUsers);
router.post('/users', requirePermission('users', 'create'), c.createUser);
router.patch('/users/:id', requirePermission('users', 'update'), c.updateUser);
router.delete('/users/:id', requirePermission('users', 'delete'), c.deactivateUser);

router.get('/teachers', requirePermission('teachers', 'view'), c.listTeachers);
router.post('/teachers', requirePermission('teachers', 'create'), c.createTeacher);
router.patch('/teachers/:id', requirePermission('teachers', 'update'), c.updateTeacher);
router.delete('/teachers/:id', requirePermission('teachers', 'delete'), c.deactivateTeacher);

router.get('/departments', requirePermission('departments', 'view'), c.listDepartments);
router.post('/departments', requirePermission('departments', 'create'), c.createDepartment);
router.patch('/departments/:id', requirePermission('departments', 'update'), c.updateDepartment);
router.delete('/departments/:id', requirePermission('departments', 'delete'), c.deactivateDepartment);

router.get('/academic-years', requirePermission('academicYears', 'view'), c.listAcademicYears);
router.post('/academic-years', requirePermission('academicYears', 'create'), c.createAcademicYear);
router.patch('/academic-years/:id', requirePermission('academicYears', 'update'), c.updateAcademicYear);

router.get('/programs', requirePermission('programs', 'view'), c.listPrograms);
router.post('/programs', requirePermission('programs', 'create'), c.createProgram);
router.patch('/programs/:id', requirePermission('programs', 'update'), c.updateProgram);
router.delete('/programs/:id', requirePermission('programs', 'delete'), c.deactivateProgram);

router.get('/subjects', requirePermission('subjects', 'view'), c.listSubjects);
router.post('/subjects', requirePermission('subjects', 'create'), c.createSubject);
router.patch('/subjects/:id', requirePermission('subjects', 'update'), c.updateSubject);
router.delete('/subjects/:id', requirePermission('subjects', 'delete'), c.deactivateSubject);

router.get('/fee-structures', requirePermission('feeStructures', 'view'), c.listFeeStructures);
router.post('/fee-structures', requirePermission('feeStructures', 'create'), c.createFeeStructure);
router.patch('/fee-structures/:id', requirePermission('feeStructures', 'update'), c.updateFeeStructure);
router.delete('/fee-structures/:id', requirePermission('feeStructures', 'delete'), c.deactivateFeeStructure);

export default router;

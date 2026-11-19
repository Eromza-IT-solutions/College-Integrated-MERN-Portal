import express from 'express';
import multer from 'multer';
import AppError from '../../utils/AppError.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { DOCUMENT_RULES } from '../../utils/constants.js';
import * as controller from './admission.controller.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOCUMENT_RULES.maxBytes, files: 1 },
});

function uploadOne(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Could not read the uploaded file';
      return next(new AppError(message, 400, [{ field: 'file', message }], 'VALIDATION_ERROR'));
    }
    return next(err);
  });
}

router.get('/options', requirePermission('applications', 'view'), controller.options);
router.get('/subjects', requirePermission('applications', 'view'), controller.offeredSubjects);

router.get('/applications/overdue', requirePermission('applications', 'view'), controller.overdue);
router.get('/applications/export', requirePermission('applications', 'export'), controller.exportApplications);
router.get('/applications', requirePermission('applications', 'view'), controller.list);
router.post('/applications', requirePermission('applications', 'create'), controller.create);
router.get('/applications/:id/pdf', requirePermission('applications', 'view'), controller.getPdf);
router.get('/applications/:id', requirePermission('applications', 'view'), controller.get);
router.patch('/applications/:id', requirePermission('applications', 'update'), controller.update);
router.post('/applications/:id/submit', requirePermission('applications', 'update'), controller.submit);

router.get('/applications/:id/subjects', requirePermission('applications', 'view'), controller.getSubjects);
router.put('/applications/:id/subjects', requirePermission('applications', 'update'), controller.chooseSubjects);
router.post('/applications/:id/subjects/approve', requirePermission('applications', 'approve'), controller.approveSubjects);

router.get('/applications/:id/documents', requirePermission('admissionDocuments', 'view'), controller.documents);
router.post('/applications/:id/documents', requirePermission('admissionDocuments', 'create'), uploadOne, controller.upload);
router.post('/applications/:id/documents/approve', requirePermission('admissionDocuments', 'approve'), controller.approveDocuments);

router.post('/applications/:id/approve', requirePermission('applications', 'approve'), controller.approve);
router.post('/applications/:id/waitlist', requirePermission('applications', 'approve'), controller.waitlist);
router.post('/applications/:id/return', requirePermission('applications', 'approve'), controller.returnForCorrection);
router.post('/applications/:id/reject', requirePermission('applications', 'approve'), controller.reject);
router.post('/applications/:id/cancel', requirePermission('applications', 'approve'), controller.cancel);
router.post('/applications/:id/hard-copy', requirePermission('applications', 'approve'), controller.hardCopy);
router.post('/applications/:id/student', requirePermission('students', 'create'), controller.student);

router.get('/documents/:id/download', requirePermission('admissionDocuments', 'view'), controller.downloadDocument);
router.delete('/documents/:id', requirePermission('admissionDocuments', 'delete'), controller.removeDocument);
router.post('/documents/:id/verify', requirePermission('admissionDocuments', 'approve'), controller.verifyDocument);

export default router;

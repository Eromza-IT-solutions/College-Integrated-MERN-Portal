import express from 'express';
import asyncHandler from '../../utils/asyncHandler.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { ok, paged } from '../academics/academics.helpers.js';
import { formQuery, subjectSelectionBody, decisionBody, hallTicketUpdateBody, idParam, parse } from './examinations.validation.js';
import { listForms, getForm, selectSubjects, continueForm, decideForm } from './examinations.service.js';
import { myTickets, updateTicket, getTicketForPdf } from './hallTickets.service.js';
import { sendPdf, pdfFilename } from '../../utils/pdf.js';
import { examFormPdf, hallTicketPdf } from '../../utils/pdfDocuments.js';

const router = express.Router();

router.get('/hall-tickets/me', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await myTickets(req));
}));

router.patch('/hall-tickets/:id', requirePermission('examForms', 'approve'), asyncHandler(async (req, res) => {
  ok(req, res, await updateTicket(req, parse(idParam, req.params.id), parse(hallTicketUpdateBody, req.body)));
}));

router.get('/hall-tickets/:id/pdf', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  const ticket = await getTicketForPdf(req, parse(idParam, req.params.id));
  sendPdf(res, hallTicketPdf(ticket), pdfFilename(`hall-ticket-${ticket.enrollmentNumber || ticket._id}`));
}));

router.get('/', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  const result = await listForms(req, parse(formQuery, req.query));
  ok(req, res, result.rows, 200, paged(result));
}));

router.get('/:id/pdf', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  const form = await getForm(req, parse(idParam, req.params.id));
  sendPdf(res, examFormPdf(form), pdfFilename(`exam-form-${form.details?.enrollmentNumber || form._id}`));
}));

router.get('/:id', requirePermission('examForms', 'view'), asyncHandler(async (req, res) => {
  ok(req, res, await getForm(req, parse(idParam, req.params.id)));
}));

router.put('/:id/subjects', requirePermission('examForms', 'update'), asyncHandler(async (req, res) => {
  const body = parse(subjectSelectionBody, req.body);
  ok(req, res, await selectSubjects(req, parse(idParam, req.params.id), body.subjectIds));
}));

router.post('/:id/continue', requirePermission('examForms', 'update'), asyncHandler(async (req, res) => {
  ok(req, res, await continueForm(req, parse(idParam, req.params.id)));
}));

router.post('/:id/decision', requirePermission('examForms', 'approve'), asyncHandler(async (req, res) => {
  ok(req, res, await decideForm(req, parse(idParam, req.params.id), parse(decisionBody, req.body)));
}));

export default router;

import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from './admission.helpers.js';
import { sendPdf, pdfFilename } from '../../utils/pdf.js';
import { applicationPdf } from '../../utils/pdfDocuments.js';
import * as service from './admission.service.js';
import {
  createBody,
  formBody,
  listQuery,
  subjectsQuery,
  subjectPicks,
  uploadBody,
  decisionBody,
  waitlistBody,
  noteBody,
  cancelBody,
  idParam,
  parse,
} from './admission.validation.js';

const options = asyncHandler(async (req, res) => {
  ok(req, res, await service.getOptions());
});

const offeredSubjects = asyncHandler(async (req, res) => {
  const query = parse(subjectsQuery, req.query);
  ok(req, res, await service.listOfferedSubjects(query));
});

const create = asyncHandler(async (req, res) => {
  const body = parse(createBody, req.body);
  ok(req, res, await service.createApplication(req, body), 201);
});

const list = asyncHandler(async (req, res) => {
  const query = parse(listQuery, req.query);
  const result = await service.listApplications(req, query);
  ok(req, res, result.items, 200, result.meta);
});

const get = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.getApplication(req, id));
});

const getPdf = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const application = await service.getApplication(req, id);
  sendPdf(res, applicationPdf(application), pdfFilename(`application-${application.applicationNumber || application._id}`));
});

const update = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(formBody, req.body);
  ok(req, res, await service.updateApplication(req, id, body));
});

const submit = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.submitApplication(req, id));
});

const getSubjects = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.getSubjects(req, id));
});

const chooseSubjects = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const picks = parse(subjectPicks, req.body);
  ok(req, res, await service.chooseSubjects(req, id, picks));
});

const approveSubjects = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.approveSubjects(req, id));
});

const documents = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.listDocuments(req, id));
});

const upload = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(uploadBody, req.body);
  ok(req, res, await service.uploadDocument(req, id, body), 201);
});

const removeDocument = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.deleteDocument(req, id));
});

const downloadDocument = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const { document, buffer } = await service.downloadDocument(req, id);
  const fileName = String(document.fileName || 'document').replace(/["\\\r\n]/g, '_');
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});

const verifyDocument = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(decisionBody, req.body);
  ok(req, res, await service.verifyDocument(req, id, body));
});

const approveDocuments = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.approveDocuments(req, id));
});

const approve = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.approveApplication(req, id));
});

const waitlist = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(waitlistBody, req.body);
  ok(req, res, await service.waitlistApplication(req, id, body));
});

const returnForCorrection = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(noteBody('returned'), req.body);
  ok(req, res, await service.returnApplication(req, id, body));
});

const reject = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(noteBody('rejected'), req.body);
  ok(req, res, await service.rejectApplication(req, id, body));
});

const cancel = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  const body = parse(cancelBody, req.body);
  ok(req, res, await service.cancelApplication(req, id, body));
});

const hardCopy = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.receiveHardCopy(req, id));
});

const student = asyncHandler(async (req, res) => {
  const id = parse(idParam, req.params.id);
  ok(req, res, await service.createStudent(req, id), 201);
});

const overdue = asyncHandler(async (req, res) => {
  ok(req, res, await service.overdue(req));
});

const exportApplications = asyncHandler(async (req, res) => {
  const csv = await service.exportCsv(req);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
  res.send(csv);
});

export {
  options,
  offeredSubjects,
  create,
  list,
  get,
  getPdf,
  update,
  submit,
  getSubjects,
  chooseSubjects,
  approveSubjects,
  documents,
  upload,
  removeDocument,
  downloadDocument,
  verifyDocument,
  approveDocuments,
  approve,
  waitlist,
  returnForCorrection,
  reject,
  cancel,
  hardCopy,
  student,
  overdue,
  exportApplications,
};

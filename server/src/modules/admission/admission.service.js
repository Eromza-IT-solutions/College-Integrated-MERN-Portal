import AppError from '../../utils/AppError.js';
import Application from '../../models/Application.js';
import AdmissionDocument from '../../models/AdmissionDocument.js';
import AcademicYear from '../../models/AcademicYear.js';
import Program from '../../models/Program.js';
import Student from '../../models/Student.js';
import { getActor } from '../../middleware/requirePermission.js';
import { isInScope, scopeFilter } from '../../utils/scope.js';
import { auditSafe } from '../../services/auditService.js';
import { saveUploadedFile, deleteStoredFile, readStoredFile } from '../../utils/fileStore.js';
import {
  ACADEMIC_YEAR_STATUS,
  APPLICATION_STATUS,
  DOCUMENT_RULES,
  DOCUMENT_STATUS,
} from '../../utils/constants.js';
import { paged, skipOf, both, clean, summary, detail, documentView } from './admission.helpers.js';

const FORM_ROOTS = [
  'admissionType',
  'divisionType',
  'feesCategory',
  'abcId',
  'aadhaarNumber',
  'student',
  'parent',
  'lastExam',
  'passport',
  'subjects',
];

const DOCUMENT_CHANGE_STATUSES = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.RETURNED,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.WAITLISTED,
];

const FORM_PATHS = (() => {
  const paths = new Set();
  function walk(schema, prefix = '') {
    for (const [key, type] of Object.entries(schema.paths)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.add(path);
      if (type.schema) walk(type.schema, path);
    }
  }
  walk(Application.schema);
  return paths;
})();

function pickFormFields(input, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (key === '_id' || value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (!FORM_ROOTS.includes(path.split('.')[0])) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, pickFormFields(value, path));
    } else if (FORM_PATHS.has(path)) {
      out[path] = value;
    }
  }
  return out;
}

function applyForm(application, body) {
  for (const [path, value] of Object.entries(pickFormFields(body))) {
    application.set(path, value);
  }
}

function assertDocumentsChangeable(application) {
  if (!DOCUMENT_CHANGE_STATUSES.includes(application.status)) {
    throw new AppError(`Documents cannot be changed when the application is ${application.status}`, 409);
  }
  if (application.documentsApprovedAt) {
    throw new AppError('The documents have already been approved', 409);
  }
}

function fileNameOf(file) {
  return String(file.originalname || 'document').split(/[\\/]/).pop();
}

async function loadApplication(req, id) {
  const application = await Application.findById(id).select('+aadhaarNumber');
  if (!application || !isInScope(req, application, { ownerField: 'applicantUserId' })) {
    throw new AppError('Application not found', 404);
  }
  return application;
}

async function loadDocument(req, id) {
  const document = await AdmissionDocument.findById(id);
  if (!document) throw new AppError('Document not found', 404);
  const application = await Application.findById(document.applicationId);
  if (!application || !isInScope(req, application, { ownerField: 'applicantUserId' })) {
    throw new AppError('Document not found', 404);
  }
  return { document, application };
}

async function getOptions() {
  const [academicYears, programs] = await Promise.all([
    AcademicYear.find({
      status: { $in: [ACADEMIC_YEAR_STATUS.CURRENT, ACADEMIC_YEAR_STATUS.UPCOMING] },
    })
      .sort({ startDate: 1 })
      .select('label startDate endDate status'),
    Program.find({ isActive: true })
      .sort({ name: 1 })
      .select('name code level durationYears departmentId'),
  ]);
  return { academicYears, programs };
}

async function listOfferedSubjects({ programId, yearOfStudy }) {
  const program = await Program.findById(programId);
  if (!program || !program.isActive) throw new AppError('Program not found', 404);
  if (!program.hasYear(yearOfStudy)) {
    throw new AppError(`Year ${yearOfStudy} is not offered for this program`, 400);
  }
  return Application.offeredSubjects(programId, yearOfStudy);
}

async function createApplication(req, body) {
  const actor = getActor(req);
  const year = await AcademicYear.findById(body.academicYearId);
  if (!year) throw new AppError('Academic year not found', 404);
  if (![ACADEMIC_YEAR_STATUS.CURRENT, ACADEMIC_YEAR_STATUS.UPCOMING].includes(year.status)) {
    throw new AppError('Admission forms are not open for this academic year', 409);
  }

  const program = await Program.findById(body.programId);
  if (!program || !program.isActive) throw new AppError('Program not found', 404);
  if (!program.hasYear(body.yearOfStudy)) {
    throw new AppError(`Year ${body.yearOfStudy} is not offered for this program`, 400);
  }

  const application = new Application({
    applicantUserId: actor.id,
    academicYearId: body.academicYearId,
    programId: body.programId,
    yearOfStudy: body.yearOfStudy,
  });
  applyForm(application, body);
  await application.save();

  await auditSafe(req, {
    action: 'applicationCreated',
    entityType: 'application',
    entityId: application._id,
    details: {
      academicYearId: String(application.academicYearId),
      programId: String(application.programId),
      yearOfStudy: application.yearOfStudy,
    },
  });
  return detail(application);
}

async function updateApplication(req, id, body) {
  const application = await loadApplication(req, id);
  application.assertEditable();
  applyForm(application, body);
  await application.save();

  await auditSafe(req, {
    action: 'applicationUpdated',
    entityType: 'application',
    entityId: application._id,
    details: { fields: Object.keys(pickFormFields(body)) },
  });
  return detail(application);
}

async function listApplications(req, query) {
  const filter = both(
    clean({
      status: query.status,
      academicYearId: query.academicYearId,
      programId: query.programId,
    }),
    scopeFilter(req, { ownerField: 'applicantUserId' })
  );
  const [rows, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipOf(query))
      .limit(query.limit)
      .lean(),
    Application.countDocuments(filter),
  ]);
  return { items: rows.map(summary), meta: paged({ total, ...query }) };
}

async function getApplication(req, id) {
  return detail(await loadApplication(req, id));
}

async function submitApplication(req, id) {
  const application = await loadApplication(req, id);
  const updated = await application.submit();
  await auditSafe(req, {
    action: 'applicationSubmitted',
    entityType: 'application',
    entityId: updated._id,
    details: { applicationNumber: updated.applicationNumber },
  });
  return detail(updated);
}

async function getSubjects(req, id) {
  const application = await loadApplication(req, id);
  const offered = await Application.offeredSubjects(application.programId, application.yearOfStudy || 1);
  return { offered, chosen: application.subjects };
}

async function chooseSubjects(req, id, picks) {
  const application = await loadApplication(req, id);
  const updated = await application.chooseSubjects(picks);
  await auditSafe(req, {
    action: 'applicationSubjectsChosen',
    entityType: 'application',
    entityId: updated._id,
    details: { groups: Object.keys(picks) },
  });
  return detail(updated);
}

async function approveSubjects(req, id) {
  const application = await loadApplication(req, id);
  const updated = await application.approveSubjects({ byUserId: getActor(req).id });
  await auditSafe(req, {
    action: 'applicationSubjectsApproved',
    entityType: 'application',
    entityId: updated._id,
  });
  return detail(updated);
}

async function listDocuments(req, id) {
  const application = await loadApplication(req, id);
  const [documents, required] = await Promise.all([
    AdmissionDocument.find({ applicationId: application._id }).sort({ type: 1 }),
    AdmissionDocument.requiredFor(application._id),
  ]);
  const byType = new Map(documents.map((document) => [document.type, document]));
  const missing = required.map((item) => item.type).filter((type) => !byType.has(type));
  const notVerified = required
    .map((item) => item.type)
    .filter((type) => byType.has(type) && byType.get(type).status !== DOCUMENT_STATUS.VERIFIED);

  return {
    required: required.map((item) => {
      const uploaded = byType.get(item.type);
      return {
        ...item,
        uploaded: !!uploaded,
        status: uploaded ? uploaded.status : null,
      };
    }),
    missing,
    notVerified,
    documents: documents.map(documentView),
  };
}

async function uploadDocument(req, id, body) {
  if (!req.file) throw new AppError('Choose a file to upload', 400, [{ field: 'file', message: 'Required' }]);
  if (!DOCUMENT_RULES.mimeTypes.includes(req.file.mimetype)) {
    throw new AppError(`File must be one of: ${DOCUMENT_RULES.mimeTypes.join(', ')}`, 400, [
      { field: 'file', message: 'Unsupported file type' },
    ]);
  }
  if (req.file.size > DOCUMENT_RULES.maxBytes) {
    throw new AppError('File is too large', 400, [{ field: 'file', message: 'File is too large' }]);
  }

  const application = await loadApplication(req, id);
  assertDocumentsChangeable(application);

  const existing = await AdmissionDocument.findOne({ applicationId: application._id, type: body.type });
  const oldKey = existing && existing.storageKey;
  const storageKey = await saveUploadedFile({
    applicationId: application._id,
    type: body.type,
    file: req.file,
  });

  let document;
  try {
    if (existing) {
      existing.set({
        fileName: fileNameOf(req.file),
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        width: body.width,
        height: body.height,
        storageKey,
        status: DOCUMENT_STATUS.PENDING,
        reviewedByUserId: null,
        reviewedAt: null,
        reviewNote: null,
      });
      document = await existing.save();
    } else {
      document = await AdmissionDocument.create({
        applicationId: application._id,
        type: body.type,
        fileName: fileNameOf(req.file),
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        width: body.width,
        height: body.height,
        storageKey,
      });
    }
  } catch (err) {
    await deleteStoredFile(storageKey).catch(() => {});
    throw err;
  }

  if (oldKey && oldKey !== storageKey) {
    await deleteStoredFile(oldKey).catch((err) => console.error('[admission] could not delete old document:', err.message));
  }

  await auditSafe(req, {
    action: 'admissionDocumentUploaded',
    entityType: 'admissionDocument',
    entityId: document._id,
    details: { applicationId: String(application._id), type: document.type },
  });
  return documentView(document);
}

async function deleteDocument(req, id) {
  const { document, application } = await loadDocument(req, id);
  assertDocumentsChangeable(application);
  const storageKey = document.storageKey;
  await document.deleteOne();
  await deleteStoredFile(storageKey).catch((err) => console.error('[admission] could not delete document file:', err.message));

  await auditSafe(req, {
    action: 'admissionDocumentDeleted',
    entityType: 'admissionDocument',
    entityId: document._id,
    details: { applicationId: String(application._id), type: document.type },
  });
  return { id: String(document._id) };
}

async function downloadDocument(req, id) {
  const { document, application } = await loadDocument(req, id);
  const buffer = await readStoredFile(document.storageKey);
  if (!buffer) throw new AppError('Document file not found', 404);

  await auditSafe(req, {
    action: 'admissionDocumentDownloaded',
    entityType: 'admissionDocument',
    entityId: document._id,
    details: { applicationId: String(application._id), type: document.type },
  });
  return { document, buffer };
}

async function verifyDocument(req, id, body) {
  const { document, application } = await loadDocument(req, id);
  if (![APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.WAITLISTED].includes(application.status)) {
    throw new AppError(`Documents cannot be reviewed when the application is ${application.status}`, 409);
  }

  document.status = body.approve ? DOCUMENT_STATUS.VERIFIED : DOCUMENT_STATUS.REJECTED;
  document.reviewedByUserId = getActor(req).id;
  document.reviewedAt = new Date();
  document.reviewNote = body.note || null;
  await document.save();

  await auditSafe(req, {
    action: body.approve ? 'admissionDocumentVerified' : 'admissionDocumentRejected',
    entityType: 'admissionDocument',
    entityId: document._id,
    details: { applicationId: String(application._id), type: document.type, note: body.note },
  });
  return documentView(document);
}

async function approveDocuments(req, id) {
  const application = await loadApplication(req, id);
  const updated = await application.approveDocuments({ byUserId: getActor(req).id });
  await auditSafe(req, {
    action: 'applicationDocumentsApproved',
    entityType: 'application',
    entityId: updated._id,
  });
  return detail(updated);
}

async function approveApplication(req, id) {
  const application = await loadApplication(req, id);
  const updated = await application.approveForm({ byUserId: getActor(req).id });
  await auditSafe(req, {
    action: 'applicationApproved',
    entityType: 'application',
    entityId: updated._id,
    details: { feeAmountPaise: updated.feeAmountPaise, feeDueAt: updated.feeDueAt },
  });
  return detail(updated);
}

async function waitlistApplication(req, id, body) {
  const application = await loadApplication(req, id);
  const updated = await application.waitlist({ byUserId: getActor(req).id, note: body.note });
  await auditSafe(req, {
    action: 'applicationWaitlisted',
    entityType: 'application',
    entityId: updated._id,
    details: { note: body.note },
  });
  return detail(updated);
}

async function returnApplication(req, id, body) {
  const application = await loadApplication(req, id);
  const updated = await application.returnForCorrection({ byUserId: getActor(req).id, note: body.note });
  await auditSafe(req, {
    action: 'applicationReturned',
    entityType: 'application',
    entityId: updated._id,
    details: { note: body.note },
  });
  return detail(updated);
}

async function rejectApplication(req, id, body) {
  const application = await loadApplication(req, id);
  const updated = await application.reject({ byUserId: getActor(req).id, note: body.note });
  await auditSafe(req, {
    action: 'applicationRejected',
    entityType: 'application',
    entityId: updated._id,
    details: { note: body.note },
  });
  return detail(updated);
}

async function cancelApplication(req, id, body) {
  const application = await loadApplication(req, id);
  const updated = await application.cancel({ byUserId: getActor(req).id, reason: body.reason });
  await auditSafe(req, {
    action: 'applicationCancelled',
    entityType: 'application',
    entityId: updated._id,
    details: { reason: body.reason },
  });
  return detail(updated);
}

async function receiveHardCopy(req, id) {
  const application = await loadApplication(req, id);
  const updated = await application.receiveHardCopy({ byUserId: getActor(req).id });
  await auditSafe(req, {
    action: 'applicationHardCopyReceived',
    entityType: 'application',
    entityId: updated._id,
  });
  return detail(updated);
}

async function createStudent(req, id) {
  const application = await loadApplication(req, id);
  const result = await Student.createFromApplication(application._id);
  await auditSafe(req, {
    action: 'studentCreatedFromApplication',
    entityType: 'student',
    entityId: result.student._id,
    details: {
      applicationId: String(application._id),
      enrollmentNumber: result.student.enrollmentNumber,
      enrolled: result.enrolled,
      unmatched: result.unmatched,
    },
  });
  return result;
}

async function overdue(req) {
  const now = new Date();
  const scope = scopeFilter(req, { ownerField: 'applicantUserId' });
  const [fee, hardCopy] = await Promise.all([
    Application.find({ ...scope, status: APPLICATION_STATUS.APPROVED, feeDueAt: { $lt: now } })
      .select('applicationNumber feeDueAt programId academicYearId student.fullName')
      .lean(),
    Application.find({ ...scope, status: APPLICATION_STATUS.FEE_PAID, hardCopyDueAt: { $lt: now } })
      .select('applicationNumber hardCopyDueAt programId academicYearId student.fullName')
      .lean(),
  ]);
  return { fee, hardCopy };
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportCsv(req) {
  const rows = await Application.find(scopeFilter(req, { ownerField: 'applicantUserId' }))
    .sort({ createdAt: -1 })
    .populate('programId', 'code name')
    .populate('academicYearId', 'label')
    .lean();

  const header = [
    'Application Number',
    'Status',
    'Student',
    'Program',
    'Academic Year',
    'Year of Study',
    'Fees Category',
    'Fee Amount (paise)',
    'Fee Due',
    'Hard Copy Due',
    'Submitted',
  ];
  const lines = rows.map((row) => {
    const student = row.student || {};
    const program = row.programId && typeof row.programId === 'object' ? row.programId : {};
    const year = row.academicYearId && typeof row.academicYearId === 'object' ? row.academicYearId : {};
    return [
      row.applicationNumber,
      row.status,
      student.fullName || [student.surname, student.firstName].filter(Boolean).join(' '),
      program.code || program.name || '',
      year.label || '',
      row.yearOfStudy,
      row.feesCategory,
      row.feeAmountPaise,
      row.feeDueAt ? new Date(row.feeDueAt).toISOString() : '',
      row.hardCopyDueAt ? new Date(row.hardCopyDueAt).toISOString() : '',
      row.submittedAt ? new Date(row.submittedAt).toISOString() : '',
    ].map(csvCell).join(',');
  });

  await auditSafe(req, {
    action: 'applicationsExported',
    entityType: 'application',
    details: { rows: rows.length },
  });
  return [header.map(csvCell).join(','), ...lines].join('\r\n');
}

export {
  getOptions,
  listOfferedSubjects,
  createApplication,
  updateApplication,
  listApplications,
  getApplication,
  submitApplication,
  getSubjects,
  chooseSubjects,
  approveSubjects,
  listDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  verifyDocument,
  approveDocuments,
  approveApplication,
  waitlistApplication,
  returnApplication,
  rejectApplication,
  cancelApplication,
  receiveHardCopy,
  createStudent,
  overdue,
  exportCsv,
};

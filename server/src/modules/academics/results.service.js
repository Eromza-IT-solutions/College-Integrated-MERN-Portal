import AppError from '../../utils/AppError.js';
import Result from '../../models/Result.js';
import Exam from '../../models/Exam.js';
import Student from '../../models/Student.js';
import Program from '../../models/Program.js';
import { getActor } from '../../middleware/requirePermission.js';
import { auditSafe } from '../../services/auditService.js';
import { both, clean, isStudent, skipOf, studentOfActor } from './academics.helpers.js';

// Exam results. Examination Admin marks daalta hai, total / class apne aap nikalta hai (Result model + resultRules.js),
// aur student ko result tabhi dikhta hai jab publish ho jaye.

// Approved exam form ke liye result sheet kholna (har subject ki ek line, marks khaali). Dobara call karne par wahi sheet milti hai.
async function openSheet(req, { examFormId }) {
  const before = await Result.exists({ examFormId });
  const sheet = await Result.openForApprovedForm(examFormId);
  if (!before) await auditSafe(req, { action: 'resultSheetOpened', entityType: 'result', entityId: sheet._id, details: { examId: sheet.examId, studentId: sheet.studentId } });
  return { sheet, created: !before };
}

// Scope: kaun kaun se result dikhne chahiye.
//   student    -> sirf apne aur sirf published
//   hod        -> apne department ke students ke, sirf published
//   examAdmin / superAdmin -> sab (draft bhi)
async function scopeOf(req) {
  if (isStudent(req)) {
    const student = await studentOfActor(req);
    return { studentId: student._id, isPublished: true };
  }
  if (req.permission.scope === 'department') {
    const actor = getActor(req);
    if (!actor.departmentId) return { _id: { $in: [] } };
    const programIds = await Program.distinct('_id', { departmentId: actor.departmentId });
    const studentIds = await Student.distinct('_id', { programId: { $in: programIds } });
    return { studentId: { $in: studentIds }, isPublished: true };
  }
  return {};
}

async function listResults(req, q) {
  const client = clean({ examId: q.examId, studentId: q.studentId, isPublished: q.isPublished });
  const filter = both(client, await scopeOf(req));
  const [rows, total] = await Promise.all([
    Result.find(filter).sort({ createdAt: -1 }).skip(skipOf(q)).limit(q.limit).lean(),
    Result.countDocuments(filter),
  ]);
  return { rows, total, page: q.page, limit: q.limit };
}

async function getResult(req, id) {
  const row = await Result.findOne(both({ _id: id }, await scopeOf(req))).lean();
  if (!row) throw new AppError('Result not found', 404); // scope ke bahar wala bhi 404 (exist hi nahi karta jaisa)
  return row;
}

// Marks daalna / sudhaarna. Published result badalne se pehle unpublish karna padta hai (model ka rule, 409).
async function enterResultMarks(req, id, { entries }) {
  const actor = getActor(req);
  const sheet = await Result.findById(id);
  if (!sheet) throw new AppError('Result not found', 404);
  await sheet.enterMarks(entries, { byUserId: actor.id });
  await auditSafe(req, { action: 'resultMarksEntered', entityType: 'result', entityId: sheet._id, details: { subjects: entries.map((e) => String(e.subjectId)) } });
  return sheet;
}

async function publishOne(req, id) {
  const actor = getActor(req);
  const result = await Result.publish(id, { byUserId: actor.id }); // incomplete ho to 409 "Enter all marks before publishing"
  await auditSafe(req, { action: 'resultPublished', entityType: 'result', entityId: result._id, details: { examId: result.examId, studentId: result.studentId } });
  return result;
}

// Ek exam ke saare COMPLETE result ek saath publish. Incomplete wale chhod diye jaate hain aur ginti me aate hain.
async function publishAll(req, { examId }) {
  const actor = getActor(req);
  const exam = await Exam.findById(examId);
  if (!exam) throw new AppError('Exam not found', 404);
  const summary = await Result.publishExam(examId, { byUserId: actor.id });
  await auditSafe(req, { action: 'resultExamPublished', entityType: 'exam', entityId: exam._id, details: summary });
  return summary;
}

// Galti sudhaarne ke liye result wapas lena. Reason zaroori hai aur audit log me jaata hai.
async function unpublishOne(req, id, { reason }) {
  const result = await Result.unpublish(id, { reason });
  await auditSafe(req, { action: 'resultUnpublished', entityType: 'result', entityId: result._id, details: { reason } });
  return result;
}

export { openSheet, listResults, getResult, enterResultMarks, publishOne, publishAll, unpublishOne };

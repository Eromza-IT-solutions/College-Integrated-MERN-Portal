import AppError from '../../utils/AppError.js';
import Marks from '../../models/Marks.js';
import Timetable from '../../models/Timetable.js';
import { AUDIT_OUTCOME, REVIEW_STATUS, ROLES } from '../../utils/constants.js';
import { getActor } from '../../middleware/requirePermission.js';
import { scopeFilter } from '../../utils/scope.js';
import { auditSafe } from '../../services/auditService.js';
import { both, clean, isStudent, skipOf, studentOfActor } from './academics.helpers.js';

// Internal marks (test, assignment, practical...). Flow: draft -> submitted -> HOD approve / return.

// Ek component ke marks, kai students ke liye ek saath.
// Har student alag save hota hai: ek galat entry (jaise obtained > outOf) baaki ko nahi rokti, wo "failed" list me aati hai.
async function enterMarks(req, body) {
  const actor = getActor(req);
  const { subjectId, semester, academicYearId, component, outOf, entries } = body;

  // Subject nahi padhate to poori request 403 (har entry ko fail dikhane se behtar).
  if (!(await Timetable.teaches({ teacherUserId: actor.id, subjectId, semester, academicYearId }))) {
    throw new AppError('You can enter marks only for the subjects you teach', 403);
  }

  const saved = [];
  const failed = [];
  for (const e of entries) {
    try {
      const row = await Marks.enter({ studentId: e.studentId, subjectId, semester, academicYearId, component, obtained: e.obtained, outOf, byUserId: actor.id });
      saved.push({ markId: row._id, studentId: e.studentId, obtained: row.obtained, outOf: row.outOf, status: row.status });
    } catch (err) {
      if (!err.isOperational && err.name !== 'ValidationError') throw err; // asli bug ho to chhupana nahi
      failed.push({ studentId: e.studentId, message: err.message });
    }
  }
  await auditSafe(req, { action: 'marksEntered', entityType: 'marks', details: { subjectId, semester, component, outOf, saved: saved.length, failed: failed.length } });
  return { saved, failed };
}

// Teacher apne draft / returned marks approval ke liye bhejta hai. Sirf apni entries hi jaati hain (model filter karta hai).
async function submitMarks(req, { ids }) {
  const actor = getActor(req);
  const result = await Marks.submitMany(ids, { byUserId: actor.id });
  await auditSafe(req, { action: 'marksSubmitted', entityType: 'marks', details: { requested: ids.length, ...result } });
  return result;
}

// HOD approve / return karta hai. The department check is inside Marks.decideMany, so a model call
// cannot approve marks of a department the HOD does not belong to.
async function decideMarks(req, { ids, approve, note }) {
  const actor = getActor(req);
  const { decided } = await Marks.decideMany(ids, { approve, byUserId: actor.id, note, departmentId: actor.departmentId });
  const result = { decided, skipped: ids.length - decided };
  await auditSafe(req, {
    action: approve ? 'marksApproved' : 'marksReturned', entityType: 'marks',
    outcome: decided === 0 ? AUDIT_OUTCOME.DENIED : AUDIT_OUTCOME.SUCCESS,
    details: { requested: ids.length, ...result, note: note || null },
  });
  return result;   // <- ye line zaroor honi chahiye
}

// Marks dekhna.
//   student  -> sirf apne, aur sirf APPROVED (draft / submitted student ko nahi dikhte)
//   teacher  -> jo usne khud enter kiye
//   hod      -> apne department ke
//   examAdmin-> sab, par sirf approved
//   superAdmin -> sab
async function markScope(req) {
  const actor = getActor(req);
  if (isStudent(req)) {
    const student = await studentOfActor(req);
    return { studentId: student._id, status: REVIEW_STATUS.APPROVED };
  }
  if (actor.role === ROLES.EXAM_ADMIN) return { status: REVIEW_STATUS.APPROVED };
  return scopeFilter(req, { ownerField: 'enteredByUserId' });
}

async function listMarks(req, q) {
  const client = clean({ subjectId: q.subjectId, semester: q.semester, academicYearId: q.academicYearId, studentId: q.studentId, status: q.status });
  const filter = both(client, await markScope(req));
  const [rows, total] = await Promise.all([
    Marks.find(filter).sort({ component: 1, createdAt: -1 }).skip(skipOf(q)).limit(q.limit)
      .populate('subjectId', 'code name').populate('studentId', 'enrollmentNumber').lean(),
    Marks.countDocuments(filter),
  ]);
  return { rows, total, page: q.page, limit: q.limit };
}

async function getMark(req, id) {
  const row = await Marks.findOne(both({ _id: id }, await markScope(req)))
    .populate('subjectId', 'code name')
    .populate('studentId', 'enrollmentNumber')
    .lean();
  if (!row) throw new AppError('Marks not found', 404, undefined, 'NOT_FOUND');
  return row;
}

export { enterMarks, submitMarks, decideMarks, listMarks, getMark };

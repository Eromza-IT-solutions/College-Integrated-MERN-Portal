import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import Department from '../../models/Department.js';
import Program from '../../models/Program.js';
import Student from '../../models/Student.js';
import Teacher from '../../models/Teacher.js';
import Attendance from '../../models/Attendance.js';
import Marks from '../../models/Marks.js';
import Application from '../../models/Application.js';
import Exam from '../../models/Exam.js';
import ExamForm from '../../models/ExamForm.js';
import Result from '../../models/Result.js';
import Payment from '../../models/Payment.js';
import Refund from '../../models/Refund.js';
import {
  ATTENDANCE_STATUS, PAYMENT_PURPOSE, PAYMENT_STATUS, REFUND_STATUS, REVIEW_STATUS, RESULT_OUTCOME, ROLES, STUDENT_STATUS, TEACHER_STATUS,
} from '../../utils/constants.js';
import { getActor } from '../../middleware/requirePermission.js';

// Har report ka shape: { title, summary: {...}, rows: [ {...flat...} ] }.
// "rows" hi CSV banta hai. Aggregation me ids ko ObjectId banana padta hai (mongoose yahan khud cast nahi karta).
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const round2 = (n) => Math.round(n * 100) / 100;
const percent = (part, whole) => (whole > 0 ? round2((part / whole) * 100) : null);
const rupees = (paise) => round2((paise || 0) / 100);
// College IST me hai: "2026-11-16" ka matlab IST ka poora din.
const dayStart = (d) => new Date(`${d}T00:00:00+05:30`);
const dayEnd = (d) => new Date(`${d}T23:59:59.999+05:30`);

function createdBetween(q, field = 'createdAt') {
  if (!q.from && !q.to) return null;
  const range = {};
  if (q.from) range.$gte = dayStart(q.from);
  if (q.to) range.$lte = dayEnd(q.to);
  return { [field]: range };
}

// HOD (scope: department) ko sirf apne department ke programs dikhte hain. null => koi limit nahi.
async function programIdsInScope(req) {
  if (req.permission.scope !== 'department') return null;
  const actor = getActor(req);
  if (!actor.departmentId) return [];
  return Program.distinct('_id', { departmentId: actor.departmentId });
}

// ---------------- 1. Department report ----------------
// Har department: programs, active students, teachers, attendance %, marks (approved / approval ka intezaar).
async function departmentReport(req, q) {
  const actor = getActor(req);
  const hod = req.permission.scope === 'department';
  const departments = await Department.find(hod ? { _id: actor.departmentId || null } : {}).select('name code').sort({ name: 1 }).lean();
  const ids = departments.map((d) => d._id);
  const byDept = (rows, pick) => new Map(rows.map((r) => [String(r._id), pick(r)]));

  const yearMatch = q.academicYearId ? { academicYearId: oid(q.academicYearId) } : {};
  const dates = {};
  if (q.from) dates.$gte = q.from;
  if (q.to) dates.$lte = q.to; // lectureDate "YYYY-MM-DD" text hai
  const lectureMatch = Object.keys(dates).length ? { lectureDate: dates } : {};

  const [programs, students, teachers, attendance, marks] = await Promise.all([
    Program.aggregate([{ $match: { departmentId: { $in: ids } } }, { $group: { _id: '$departmentId', n: { $sum: 1 } } }]),
    Student.aggregate([
      { $match: { status: STUDENT_STATUS.ACTIVE } },
      { $lookup: { from: Program.collection.name, localField: 'programId', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' }, { $match: { 'p.departmentId': { $in: ids } } },
      { $group: { _id: '$p.departmentId', n: { $sum: 1 } } },
    ]),
    Teacher.aggregate([{ $match: { departmentId: { $in: ids }, status: TEACHER_STATUS.ACTIVE } }, { $group: { _id: '$departmentId', n: { $sum: 1 } } }]),
    Attendance.aggregate([
      { $match: { departmentId: { $in: ids }, ...yearMatch, ...lectureMatch } }, { $unwind: '$records' },
      { $group: { _id: '$departmentId', total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$records.status', ATTENDANCE_STATUS.PRESENT] }, 1, 0] } } } },
    ]),
    Marks.aggregate([{ $match: { departmentId: { $in: ids }, ...yearMatch } }, { $group: { _id: { d: '$departmentId', s: '$status' }, n: { $sum: 1 } } }]),
  ]);

  const programMap = byDept(programs, (r) => r.n);
  const studentMap = byDept(students, (r) => r.n);
  const teacherMap = byDept(teachers, (r) => r.n);
  const attMap = byDept(attendance, (r) => r);
  const markCount = (d, s) => (marks.find((m) => String(m._id.d) === String(d) && m._id.s === s) || {}).n || 0;

  const rows = departments.map((d) => {
    const att = attMap.get(String(d._id)) || { total: 0, present: 0 };
    return {
      department: d.name, code: d.code,
      programs: programMap.get(String(d._id)) || 0,
      activeStudents: studentMap.get(String(d._id)) || 0,
      teachers: teacherMap.get(String(d._id)) || 0,
      attendanceEntries: att.total, presentPercent: percent(att.present, att.total),
      marksApproved: markCount(d._id, REVIEW_STATUS.APPROVED), marksAwaitingApproval: markCount(d._id, REVIEW_STATUS.SUBMITTED),
    };
  });
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  return { title: 'Department report', summary: { departments: rows.length, activeStudents: sum('activeStudents'), teachers: sum('teachers') }, rows };
}

// ---------------- 2. Admission report ----------------
// Applications ki status-wise ginti, program ke hisaab se.
async function admissionReport(req, q) {
  const scopeIds = await programIdsInScope(req);
  const and = [];
  if (scopeIds) and.push({ programId: { $in: scopeIds } });
  if (q.programId) and.push({ programId: oid(q.programId) });
  if (q.academicYearId) and.push({ academicYearId: oid(q.academicYearId) });
  const dates = createdBetween(q);
  if (dates) and.push(dates);

  const grouped = await Application.aggregate([
    { $match: and.length ? { $and: and } : {} },
    { $group: { _id: { p: '$programId', s: '$status' }, n: { $sum: 1 } } },
  ]);
  const programs = await Program.find({ _id: { $in: [...new Set(grouped.map((g) => String(g._id.p)))] } }).select('name code').lean();
  const nameOf = new Map(programs.map((p) => [String(p._id), p]));

  const byStatus = {};
  const perProgram = new Map();
  for (const g of grouped) {
    byStatus[g._id.s] = (byStatus[g._id.s] || 0) + g.n;
    const key = String(g._id.p);
    if (!perProgram.has(key)) perProgram.set(key, { program: (nameOf.get(key) || {}).name || key, code: (nameOf.get(key) || {}).code || '', total: 0 });
    const row = perProgram.get(key);
    row[g._id.s] = (row[g._id.s] || 0) + g.n;
    row.total += g.n;
  }
  const rows = [...perProgram.values()].sort((a, b) => a.program.localeCompare(b.program));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return { title: 'Admission report', summary: { total, byStatus }, rows };
}

// ---------------- 3. Exam report ----------------
// Har exam: forms kitne, result sheets kitni, kitne publish, pass / fail, average %.
async function examReport(req, q) {
  const scopeIds = await programIdsInScope(req);
  const and = [];
  if (scopeIds) and.push({ programId: { $in: scopeIds } });
  if (q.programId) and.push({ programId: oid(q.programId) });
  if (q.academicYearId) and.push({ academicYearId: oid(q.academicYearId) });
  if (q.examId) and.push({ _id: oid(q.examId) });

  const exams = await Exam.find(and.length ? { $and: and } : {}).sort({ createdAt: -1 }).limit(200).lean();
  const ids = exams.map((e) => e._id);
  const programs = await Program.find({ _id: { $in: exams.map((e) => e.programId) } }).select('name').lean();
  const programName = new Map(programs.map((p) => [String(p._id), p.name]));

  const [forms, results] = await Promise.all([
    ExamForm.aggregate([{ $match: { examId: { $in: ids } } }, { $group: { _id: { e: '$examId', s: '$status' }, n: { $sum: 1 } } }]),
    Result.aggregate([
      { $match: { examId: { $in: ids } } },
      { $group: {
        _id: '$examId', sheets: { $sum: 1 },
        complete: { $sum: { $cond: ['$isComplete', 1, 0] } }, published: { $sum: { $cond: ['$isPublished', 1, 0] } },
        passed: { $sum: { $cond: [{ $and: ['$isComplete', { $eq: ['$outcome', RESULT_OUTCOME.PASS] }] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $and: ['$isComplete', { $eq: ['$outcome', RESULT_OUTCOME.FAIL] }] }, 1, 0] } },
        avg: { $avg: { $cond: ['$isComplete', '$percentage', null] } },
      } },
    ]),
  ]);
  const formCount = (e, s) => (forms.find((f) => String(f._id.e) === String(e) && f._id.s === s) || {}).n || 0;
  const resultOf = new Map(results.map((r) => [String(r._id), r]));

  const rows = exams.map((e) => {
    const r = resultOf.get(String(e._id)) || { sheets: 0, complete: 0, published: 0, passed: 0, failed: 0, avg: null };
    return {
      exam: e.name, semester: e.semester, program: programName.get(String(e.programId)) || '',
      formsSubmitted: formCount(e._id, 'submitted'), formsApproved: formCount(e._id, 'approved'), formsRejected: formCount(e._id, 'rejected'),
      resultSheets: r.sheets, resultsComplete: r.complete, resultsPublished: r.published,
      passed: r.passed, failed: r.failed, passPercent: percent(r.passed, r.passed + r.failed), averagePercentage: r.avg == null ? null : round2(r.avg),
    };
  });
  return { title: 'Exam report', summary: { exams: rows.length, resultsPublished: rows.reduce((a, r) => a + r.resultsPublished, 0) }, rows };
}

// ---------------- 4. Payment report ----------------
// Admission admin sirf admission ka paisa dekhta hai, exam admin sirf exam ka, super admin dono. Baaki roles ko 403.
// Paise me ginti hoti hai; saath me rupees ka column bhi diya hai padhne ke liye.
async function paymentReport(req, q) {
  const role = getActor(req).role;
  const purposes = role === ROLES.SUPER_ADMIN ? [PAYMENT_PURPOSE.ADMISSION, PAYMENT_PURPOSE.EXAM]
    : role === ROLES.ADMISSION_ADMIN ? [PAYMENT_PURPOSE.ADMISSION]
      : role === ROLES.EXAM_ADMIN ? [PAYMENT_PURPOSE.EXAM] : [];
  if (!purposes.length) throw new AppError('Payment reports are not available for your role', 403);

  const match = { purpose: { $in: purposes }, ...(q.academicYearId ? { academicYearId: oid(q.academicYearId) } : {}), ...(createdBetween(q) || {}) };
  const [byStatus, byMethod, paymentIds] = await Promise.all([
    Payment.aggregate([{ $match: match }, { $group: { _id: { p: '$purpose', s: '$status' }, n: { $sum: 1 }, paise: { $sum: '$amountPaise' } } }]),
    Payment.aggregate([{ $match: { ...match, status: PAYMENT_STATUS.PAID } }, { $group: { _id: '$gatewayMethod', n: { $sum: 1 }, paise: { $sum: '$amountPaise' } } }]),
    Payment.distinct('_id', match),
  ]);
  // Refunds wahi gine jaate hain jo is filter ki payments ke hain, taaki "net" sahi rahe.
  const refunds = await Refund.aggregate([{ $match: { paymentId: { $in: paymentIds } } }, { $group: { _id: { p: '$purpose', s: '$status' }, n: { $sum: 1 }, paise: { $sum: '$amountPaise' } } }]);

  const pick = (list, p, s) => list.find((x) => x._id.p === p && x._id.s === s) || { n: 0, paise: 0 };
  const rows = purposes.map((p) => {
    const paid = pick(byStatus, p, PAYMENT_STATUS.PAID);
    const refunded = pick(refunds, p, REFUND_STATUS.APPROVED);
    return {
      purpose: p,
      paidCount: paid.n, collectedPaise: paid.paise, collectedRupees: rupees(paid.paise),
      pendingCount: pick(byStatus, p, PAYMENT_STATUS.CREATED).n, failedCount: pick(byStatus, p, PAYMENT_STATUS.FAILED).n,
      refundsRequested: pick(refunds, p, REFUND_STATUS.REQUESTED).n, refundsApproved: refunded.n, refundedPaise: refunded.paise, refundedRupees: rupees(refunded.paise),
      netPaise: paid.paise - refunded.paise, netRupees: rupees(paid.paise - refunded.paise),
    };
  });
  const net = rows.reduce((a, r) => a + r.netPaise, 0);
  return {
    title: 'Payment report',
    summary: { netPaise: net, netRupees: rupees(net), paidByMethod: byMethod.map((m) => ({ method: m._id || 'unknown', count: m.n, rupees: rupees(m.paise) })) },
    rows,
  };
}

export { departmentReport, admissionReport, examReport, paymentReport };

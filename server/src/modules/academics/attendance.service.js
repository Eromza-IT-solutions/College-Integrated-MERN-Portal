import AppError from '../../utils/AppError.js';
import Attendance from '../../models/Attendance.js';
import Timetable from '../../models/Timetable.js';
import Student from '../../models/Student.js';
import Program from '../../models/Program.js';
import Subject from '../../models/Subject.js';
import User from '../../models/User.js';
import { ATTENDANCE_STATUS } from '../../utils/constants.js';
import { getActor } from '../../middleware/requirePermission.js';
import { scopeFilter, isInScope } from '../../utils/scope.js';
import { auditSafe } from '../../services/auditService.js';
import { both, clean, isStudent, skipOf, studentOfActor } from './academics.helpers.js';

const tally = (records = []) => ({
  total: records.length,
  present: records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
  absent: records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length,
  leave: records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length,
});

// Teacher ke saamne attendance lene se pehle: us lecture ke students ki list (naam + enrollment number).
// lectureDate dene par us din ki pehle se li hui attendance bhi saath aati hai (correction ke liye).
async function getRoster(req, { slotId, lectureDate }) {
  const actor = getActor(req);
  const slot = await Timetable.findById(slotId);
  if (!slot || !slot.isActive) throw new AppError('Lecture slot not found', 404);
  if (String(slot.teacherUserId) !== actor.id) throw new AppError('Only the teacher of this lecture can take its attendance', 403);

  const students = await Attendance.rosterForSlot(slot);
  const users = await User.find({ _id: { $in: students.map((s) => s.userId) } }).select('fullName').lean();
  const nameOf = new Map(users.map((u) => [String(u._id), u.fullName]));

  const existing = lectureDate ? await Attendance.findOne({ slotId, lectureDate }).lean() : null;
  const statusOf = new Map(((existing && existing.records) || []).map((r) => [String(r.studentId), r.status]));

  const roster = students
    .map((s) => ({ studentId: s._id, enrollmentNumber: s.enrollmentNumber, fullName: nameOf.get(String(s.userId)) || null, status: statusOf.get(String(s._id)) || null }))
    .sort((a, b) => String(a.enrollmentNumber).localeCompare(String(b.enrollmentNumber)));
  return { slotId: slot._id, lectureDate: lectureDate || null, alreadyMarked: !!existing, students: roster };
}

// Attendance lena ya sudhaarna. Saare rules (sirf us slot ka teacher, weekday match, future date nahi,
// 7 din se purani nahi) Attendance.mark ke andar hain. Yahan sirf audit row ka kaam hai.
async function markAttendance(req, { slotId, lectureDate, records }) {
  const actor = getActor(req);
  const existed = await Attendance.exists({ slotId, lectureDate });
  const doc = await Attendance.mark({ slotId, lectureDate, records, byUserId: actor.id });
  await auditSafe(req, {
    action: existed ? 'attendanceCorrected' : 'attendanceMarked', entityType: 'attendance', entityId: doc._id,
    details: { slotId, lectureDate, ...tally(doc.records) },
  });
  return { _id: doc._id, slotId: doc.slotId, lectureDate: doc.lectureDate, corrected: !!existed, counts: tally(doc.records) };
}

// Registers ki list: teacher -> apne liye hue lectures, hod -> apne department ke, superAdmin -> sab.
async function listRegisters(req, q) {
  if (isStudent(req)) throw new AppError('Students can see their own attendance at /attendance/summary', 403);
  const client = clean({ slotId: q.slotId, subjectId: q.subjectId });
  if (q.from || q.to) client.lectureDate = clean({ $gte: q.from, $lte: q.to }); // "YYYY-MM-DD" text hai, isliye string compare theek chalta hai
  const filter = both(client, scopeFilter(req, { ownerField: 'teacherUserId' }));

  const [rows, total] = await Promise.all([
    Attendance.find(filter).sort({ lectureDate: -1, period: 1 }).skip(skipOf(q)).limit(q.limit).populate('subjectId', 'code name').lean(),
    Attendance.countDocuments(filter),
  ]);
  const data = rows.map((r) => ({
    _id: r._id, slotId: r.slotId, lectureDate: r.lectureDate, period: r.period, semester: r.semester, division: r.division,
    subject: r.subjectId, counts: tally(r.records), records: r.records,
  }));
  return { rows: data, total, page: q.page, limit: q.limit };
}

// Ek student ki subject-wise attendance %.
//   student       -> sirf apni (studentId bhejna zaroori nahi, bhejoge to bhi ignore)
//   hod           -> apne department ke student ki
//   teacher       -> student ki attendance, lekin sirf un subjects ki jo teacher khud padhata hai
//   superAdmin    -> kisi ki bhi
async function studentSummary(req, q) {
  const actor = getActor(req);
  let student;
  if (isStudent(req)) {
    student = await studentOfActor(req);
  } else {
    if (!q.studentId) throw new AppError('studentId is required', 400, [{ field: 'studentId', message: 'studentId is required' }], 'VALIDATION_ERROR');
    student = await Student.findById(q.studentId);
    if (!student) throw new AppError('Student not found', 404);
    if (req.permission.scope === 'department') {
      const program = await Program.findById(student.programId);
      if (!program || !isInScope(req, { departmentId: program.departmentId })) throw new AppError('Student not found', 404);
    }
  }

  let rows = await Attendance.summaryForStudent(student._id, { subjectId: q.subjectId, academicYearId: q.academicYearId });

  if (!isStudent(req) && req.permission.scope === 'own') {
    const taught = (await Timetable.distinct('subjectId', { teacherUserId: actor.id, isActive: true })).map(String);
    rows = rows.filter((r) => taught.includes(String(r.subjectId)));
  }

  const subjects = await Subject.find({ _id: { $in: rows.map((r) => r.subjectId) } }).select('code name').lean();
  const subjectOf = new Map(subjects.map((s) => [String(s._id), s]));
  return { studentId: student._id, enrollmentNumber: student.enrollmentNumber, subjects: rows.map((r) => ({ ...r, subject: subjectOf.get(String(r.subjectId)) || null })) };
}

export { getRoster, markAttendance, listRegisters, studentSummary };

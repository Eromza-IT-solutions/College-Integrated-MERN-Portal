import AppError from '../../utils/AppError.js';
import Timetable from '../../models/Timetable.js';
import Program from '../../models/Program.js';
import User from '../../models/User.js';
import AcademicYear from '../../models/AcademicYear.js';
import { ACADEMIC_YEAR_STATUS } from '../../utils/constants.js';
import { scopeFilter, isInScope } from '../../utils/scope.js';
import { auditSafe } from '../../services/auditService.js';
import { both, clean, isStudent, skipOf, studentOfActor } from './academics.helpers.js';

// Naya lecture slot. HOD sirf apne department ki class me slot bana sakta hai; super admin kahin bhi.
// Baaki checks (subject us class ka hai?, teacher usi department ka hai?) Timetable.addSlot khud karta hai.
async function createSlot(req, body) {
  const program = await Program.findById(body.programId);
  if (!program) throw new AppError('Class not found', 404);
  if (!isInScope(req, { departmentId: program.departmentId })) throw new AppError('This class belongs to another department', 403);

  const slot = await Timetable.addSlot(body); // same teacher / same class + same period => unique index => 409
  await auditSafe(req, {
    action: 'timetableSlotCreated', entityType: 'timetable', entityId: slot._id,
    details: { programId: body.programId, subjectId: body.subjectId, teacherUserId: body.teacherUserId, dayOfWeek: body.dayOfWeek, period: body.period },
  });
  return slot;
}

// Slot badalna ya band karna (isActive:false). Slot delete nahi hota, kyunki purani attendance usse judi hoti hai.
async function updateSlot(req, id, body) {
  const slot = await Timetable.findById(id);
  // Dusre department ka slot "mila hi nahi" jaisa dikhata hai (404), taaki pata na chale ki wo exist karta hai.
  if (!slot || !isInScope(req, slot)) throw new AppError('Timetable slot not found', 404);

  if (body.teacherUserId) {
    const teacher = await User.findById(body.teacherUserId);
    if (!teacher || !['teacher', 'hod'].includes(teacher.role)) throw new AppError('The teacher account was not found', 404);
    if (String(teacher.departmentId) !== String(slot.departmentId)) throw new AppError('The teacher belongs to another department', 400);
  }
  Object.assign(slot, body);
  await slot.save(); // pre-validate: endTime > startTime; unique index conflict => 409
  await auditSafe(req, { action: 'timetableSlotUpdated', entityType: 'timetable', entityId: slot._id, details: { changed: Object.keys(body) } });
  return slot;
}

// Timetable dekhna. Kaun kya dekhta hai:
//   student (own)    -> apni class ka timetable (program + semester + division), current academic year ka
//   teacher/hod own  -> jis slot me wo teacher hai
//   hod (department) -> apne department ke saare slots
//   superAdmin (all) -> sab
async function listSlots(req, q) {
  let scope;
  const client = clean({
    academicYearId: q.academicYearId, programId: q.programId, semester: q.semester,
    division: q.division, teacherUserId: q.teacherUserId, dayOfWeek: q.dayOfWeek,
  });

  if (isStudent(req)) {
    const student = await studentOfActor(req);
    scope = { programId: student.programId, semester: student.currentSemester, division: student.division };
    if (!client.academicYearId) {
      const current = await AcademicYear.findOne({ status: ACADEMIC_YEAR_STATUS.CURRENT });
      if (current) client.academicYearId = current._id;
    }
  } else {
    scope = scopeFilter(req, { ownerField: 'teacherUserId' });
  }

  const filter = { isActive: true, ...both(client, scope) };
  const [rows, total] = await Promise.all([
    Timetable.find(filter).sort({ dayOfWeek: 1, period: 1 }).skip(skipOf(q)).limit(q.limit)
      .populate('subjectId', 'code name').populate('teacherUserId', 'fullName').lean(),
    Timetable.countDocuments(filter),
  ]);
  return { rows, total, page: q.page, limit: q.limit };
}

export { createSlot, updateSlot, listSlots };

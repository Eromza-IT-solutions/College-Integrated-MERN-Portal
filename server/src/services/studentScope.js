import Program from '../models/Program.js';
import Student from '../models/Student.js';
import { getActor } from '../middleware/requirePermission.js';

const MATCH_NOTHING = Object.freeze({ _id: { $in: [] } });

function actorOf(req) {
  const actor = getActor(req);
  if (!actor || !req.permission) throw new Error('student scope helpers need requirePermission() to run first');
  return actor;
}

/**
 * Student ids that belong to a department. A student has a program, and a program has the department.
 * Use this for every HOD/department query so the Program -> Student join lives in one place.
 */
async function studentIdsInDepartment(departmentId) {
  if (!departmentId) return [];
  const programIds = await Program.find({ departmentId }).distinct('_id');
  if (!programIds.length) return [];
  return Student.find({ programId: { $in: programIds } }).distinct('_id');
}

/** A database filter for Student queries, following the user's students permission scope. */
async function studentScopeFilter(req) {
  const actor = actorOf(req);
  const scope = req.permission.scope;
  if (scope === 'all') return {};
  if (scope === 'own') return { userId: actor.id };
  if (scope === 'department') {
    const ids = await studentIdsInDepartment(actor.departmentId);
    return ids.length ? { _id: { $in: ids } } : { ...MATCH_NOTHING };
  }
  return { ...MATCH_NOTHING };
}

/** Same rule for one student record that is already loaded. */
async function isStudentInScope(req, student) {
  if (!student) return false;
  const actor = actorOf(req);
  const scope = req.permission.scope;
  if (scope === 'all') return true;
  if (scope === 'own') return String(student.userId) === actor.id;
  if (scope === 'department') {
    const ids = await studentIdsInDepartment(actor.departmentId);
    return ids.some((id) => String(id) === String(student._id));
  }
  return false;
}

export { studentIdsInDepartment, studentScopeFilter, isStudentInScope };

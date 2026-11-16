import AppError from '../../utils/AppError.js';
import Student from '../../models/Student.js';
import { getActor } from '../../middleware/requirePermission.js';

// Chhote helpers jo timetable / attendance / marks / results sab use karte hain.

// Har success response ka ek hi shape: { success, data, meta }
const ok = (req, res, data, status = 200, meta = {}) => res.status(status).json({ success: true, data, meta: { ...meta, requestId: req.id } });
const paged = ({ total, page, limit }) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });
const skipOf = ({ page, limit }) => (page - 1) * limit;

// Client ka filter + permission ka scope filter dono ek saath lagte hain ($and).
// Isse client scope ko override nahi kar sakta (e.g. teacher ?teacherUserId=dusra bheje to bhi kuch nahi milega).
const both = (client, scope) => ({ $and: [client, scope] });

// undefined values hata deta hai, taaki query filter me "field: undefined" na jaye.
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const isStudent = (req) => {
  const actor = getActor(req);
  return !!actor && actor.role === 'student';
};

// Login karne wale user (users collection) se uska Student record dhundta hai.
async function studentOfActor(req) {
  const actor = getActor(req);
  const student = await Student.findOne({ userId: actor.id });
  if (!student) throw new AppError('No student record found for this account', 404);
  return student;
}

export { ok, paged, skipOf, both, clean, isStudent, studentOfActor };

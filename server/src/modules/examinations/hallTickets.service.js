import AppError from '../../utils/AppError.js';
import HallTicket from '../../models/HallTicket.js';
import Exam from '../../models/Exam.js';
import ExamForm from '../../models/ExamForm.js';
import Program from '../../models/Program.js';
import Student from '../../models/Student.js';
import { getActor } from '../../middleware/requirePermission.js';
import { isInScope } from '../../utils/scope.js';
import { auditSafe } from '../../services/auditService.js';
import { EXAM_FORM_STATUS, HALL_TICKET_STATUS } from '../../utils/constants.js';
import { isStudent, studentOfActor } from '../academics/academics.helpers.js';

async function examOrThrow(req, examId) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new AppError('Exam not found', 404);
  const program = await Program.findById(exam.programId);
  if (!program || !isInScope(req, { departmentId: program.departmentId })) throw new AppError('Exam not found', 404);
  return exam;
}

async function loadTicket(req, id) {
  const ticket = await HallTicket.findById(id);
  if (!ticket) throw new AppError('Hall ticket not found', 404);

  if (req.permission?.scope === 'all') return ticket;
  if (isStudent(req)) {
    const student = await studentOfActor(req);
    if (String(ticket.studentId) === String(student._id)) return ticket;
  } else {
    const program = await Program.findById(ticket.programId);
    if (program && isInScope(req, { departmentId: program.departmentId })) return ticket;
  }
  throw new AppError('Hall ticket not found', 404);
}

async function listTickets(req, examId) {
  const exam = await examOrThrow(req, examId);
  const rows = await HallTicket.find({ examId: exam._id }).sort({ seatNumber: 1, enrollmentNumber: 1 }).lean();
  return { rows, total: rows.length, exam };
}

async function myTickets(req) {
  if (!isStudent(req)) throw new AppError('Only a student has hall tickets', 403);
  const student = await studentOfActor(req);
  return HallTicket.find({ studentId: student._id }).sort({ createdAt: -1 }).lean();
}

function nextSeatFactory(used) {
  let n = 1;
  return () => {
    let seat = `S-${String(n).padStart(3, '0')}`;
    while (used.has(seat)) {
      n += 1;
      seat = `S-${String(n).padStart(3, '0')}`;
    }
    used.add(seat);
    n += 1;
    return seat;
  };
}

/**
 * Issues tickets for every approved form of an exam. Existing tickets are kept unless overwrite is true.
 * The exam schedule must cover every subject on every approved form; a ticket is never issued half-empty.
 */
async function generateTickets(req, examId, { overwrite = false } = {}) {
  const exam = await examOrThrow(req, examId);
  if (!exam.schedule || exam.schedule.length === 0) {
    throw new AppError('Add the exam schedule before generating hall tickets', 409, undefined, 'EXAM_SCHEDULE_MISSING');
  }

  const forms = await ExamForm.find({ examId: exam._id, status: EXAM_FORM_STATUS.APPROVED })
    .select('_id studentId details subjects')
    .lean();
  if (forms.length === 0) throw new AppError('There are no approved exam forms to issue tickets for', 409);

  const scheduleBySubject = new Map(exam.schedule.map((item) => [String(item.subjectId), item]));
  const missing = new Set();
  for (const form of forms) {
    for (const subject of form.subjects || []) {
      if (!scheduleBySubject.has(String(subject.subjectId))) missing.add(subject.code || String(subject.subjectId));
    }
  }
  if (missing.size > 0) {
    throw new AppError(`The exam schedule is missing: ${[...missing].join(', ')}`, 409, undefined, 'EXAM_SCHEDULE_INCOMPLETE');
  }

  const [program, students, existing] = await Promise.all([
    Program.findById(exam.programId).select('name').lean(),
    Student.find({ _id: { $in: forms.map((form) => form.studentId) } }).select('enrollmentNumber currentSemester').lean(),
    HallTicket.find({ examId: exam._id }).select('studentId seatNumber').lean(),
  ]);
  const studentById = new Map(students.map((student) => [String(student._id), student]));
  const existingByStudent = new Map(existing.map((ticket) => [String(ticket.studentId), ticket]));
  const usedSeats = new Set(existing.map((ticket) => ticket.seatNumber).filter(Boolean));
  const nextSeat = nextSeatFactory(usedSeats);

  const actor = getActor(req);
  const now = new Date();
  const rows = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const form of forms) {
    const student = studentById.get(String(form.studentId));
    if (!student) throw new AppError('An approved exam form points to a missing student', 409);

    const old = existingByStudent.get(String(form.studentId));
    if (old && !overwrite) {
      skipped += 1;
      continue;
    }

    const schedule = (form.subjects || []).map((subject) => {
      const slot = scheduleBySubject.get(String(subject.subjectId));
      return {
        subjectId: subject.subjectId,
        code: subject.code,
        name: subject.name,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
      };
    });

    const fields = {
      examId: exam._id,
      examFormId: form._id,
      studentId: form.studentId,
      programId: exam.programId,
      academicYearId: exam.academicYearId,
      examName: exam.name,
      programName: program ? program.name : undefined,
      enrollmentNumber: (form.details && form.details.enrollmentNumber) || student.enrollmentNumber,
      fullName: form.details && form.details.fullName,
      semester: exam.semester,
      seatNumber: (old && old.seatNumber) || nextSeat(),
      room: (schedule.find((item) => item.room) || {}).room,
      status: HALL_TICKET_STATUS.ISSUED,
      schedule,
      issuedAt: now,
      issuedByUserId: actor.id,
      blockedReason: undefined,
    };

    if (old) {
      const saved = await HallTicket.findByIdAndUpdate(old._id, { $set: fields }, { new: true, runValidators: true });
      rows.push(saved.toObject());
      updated += 1;
    } else {
      const saved = await HallTicket.create(fields);
      rows.push(saved.toObject());
      created += 1;
    }
  }

  await auditSafe(req, {
    action: 'hallTicketsGenerated',
    entityType: 'hallTicket',
    entityId: exam._id,
    details: { examId: exam._id, created, updated, skipped, overwrite },
  });

  return { rows, created, updated, skipped };
}

async function updateTicket(req, id, body) {
  const ticket = await loadTicket(req, id);
  if (body.seatNumber && body.seatNumber !== ticket.seatNumber) {
    const clash = await HallTicket.findOne({ examId: ticket.examId, seatNumber: body.seatNumber, _id: { $ne: ticket._id } });
    if (clash) throw new AppError('That seat number is already used in this exam', 409);
  }

  Object.assign(ticket, body);
  if (body.status === HALL_TICKET_STATUS.ISSUED) {
    ticket.issuedAt = ticket.issuedAt || new Date();
    ticket.blockedReason = undefined;
  }
  if (body.status === HALL_TICKET_STATUS.BLOCKED && !body.blockedReason) {
    ticket.blockedReason = 'Blocked by the exam office';
  }
  await ticket.save();

  await auditSafe(req, {
    action: 'hallTicketUpdated',
    entityType: 'hallTicket',
    entityId: ticket._id,
    details: { changed: Object.keys(body), status: ticket.status, seatNumber: ticket.seatNumber },
  });
  return ticket;
}

async function getTicketForPdf(req, id) {
  const ticket = await loadTicket(req, id);
  if (ticket.status !== HALL_TICKET_STATUS.ISSUED) throw new AppError('This hall ticket is not issued', 409);
  return ticket;
}

export { listTickets, myTickets, generateTickets, updateTicket, getTicketForPdf, loadTicket };

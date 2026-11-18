import AppError from '../../utils/AppError.js';
import Exam from '../../models/Exam.js';
import ExamForm from '../../models/ExamForm.js';
import Program from '../../models/Program.js';
import AcademicYear from '../../models/AcademicYear.js';
import { getActor } from '../../middleware/requirePermission.js';
import { isInScope } from '../../utils/scope.js';
import { auditSafe } from '../../services/auditService.js';
import { EXAM_STATUS } from '../../utils/constants.js';
import { both, clean, isStudent, skipOf, studentOfActor } from '../academics/academics.helpers.js';

async function programOrThrow(programId) {
  const program = await Program.findById(programId);
  if (!program) throw new AppError('Program not found', 404);
  return program;
}

async function assertExamScope(req, exam) {
  const program = await Program.findById(exam.programId);
  if (!program || !isInScope(req, { departmentId: program.departmentId })) throw new AppError('Exam not found', 404);
}

async function examScopeFilter(req) {
  if (req.permission?.scope === 'all') return {};
  if (req.permission?.scope === 'department' && getActor(req).departmentId) {
    const programs = await Program.find({ departmentId: getActor(req).departmentId }).select('_id').lean();
    return { programId: { $in: programs.map((program) => program._id) } };
  }
  return { _id: { $in: [] } };
}

async function createExam(req, body) {
  const [year, program] = await Promise.all([
    AcademicYear.findById(body.academicYearId),
    programOrThrow(body.programId),
  ]);
  if (!year) throw new AppError('Academic year not found', 404);
  if (!isInScope(req, { departmentId: program.departmentId })) throw new AppError('This program belongs to another department', 403);

  const exam = await Exam.create(body);
  await auditSafe(req, {
    action: 'examCreated',
    entityType: 'exam',
    entityId: exam._id,
    details: { academicYearId: body.academicYearId, programId: body.programId, semester: body.semester },
  });
  return exam;
}

async function listExams(req, query) {
  const filter = both(
    clean({
      academicYearId: query.academicYearId,
      programId: query.programId,
      semester: query.semester,
      status: query.status,
    }),
    await examScopeFilter(req)
  );
  const [rows, total] = await Promise.all([
    Exam.find(filter).sort({ formOpensAt: -1 }).skip(skipOf(query)).limit(query.limit).lean(),
    Exam.countDocuments(filter),
  ]);
  return { rows, total, page: query.page, limit: query.limit };
}

async function getExam(req, id) {
  const exam = await Exam.findById(id);
  if (!exam) throw new AppError('Exam not found', 404);
  await assertExamScope(req, exam);
  return exam;
}

async function updateExam(req, id, body) {
  const exam = await getExam(req, id);
  Object.assign(exam, body);
  await exam.save();
  await auditSafe(req, {
    action: 'examUpdated',
    entityType: 'exam',
    entityId: exam._id,
    details: { changed: Object.keys(body) },
  });
  return exam;
}

async function availableExams(req) {
  const student = await studentOfActor(req);
  const now = new Date();
  const exams = await Exam.find({
    programId: student.programId,
    semester: student.currentSemester,
    status: EXAM_STATUS.OPEN,
    formOpensAt: { $lte: now },
    formClosesAt: { $gte: now },
  }).sort({ formClosesAt: 1 }).lean();

  const forms = await ExamForm.find({
    studentId: student._id,
    examId: { $in: exams.map((exam) => exam._id) },
  }).select('examId status feeAmountPaise submittedAt').lean();
  const byExam = new Map(forms.map((form) => [String(form.examId), form]));

  return exams.map((exam) => ({ ...exam, form: byExam.get(String(exam._id)) || null }));
}

async function startForm(req, examId) {
  const student = await studentOfActor(req);
  const form = await ExamForm.start({ examId, studentId: student._id });
  const offered = await form.offeredSubjects();
  await auditSafe(req, {
    action: 'examFormStarted',
    entityType: 'examForm',
    entityId: form._id,
    details: { examId, studentId: student._id },
  });
  return { ...form.toObject(), offered };
}

async function loadForm(req, id) {
  const form = await ExamForm.findById(id);
  if (!form) throw new AppError('Exam form not found', 404);

  if (req.permission?.scope === 'all') return form;
  if (isStudent(req)) {
    const student = await studentOfActor(req);
    if (String(form.studentId) === String(student._id)) return form;
  } else {
    const exam = await Exam.findById(form.examId);
    const program = exam && (await Program.findById(exam.programId));
    if (program && isInScope(req, { departmentId: program.departmentId })) return form;
  }
  throw new AppError('Exam form not found', 404);
}

async function getForm(req, id) {
  const form = await loadForm(req, id);
  return { ...form.toObject(), offered: await form.offeredSubjects() };
}

async function listForms(req, query) {
  let scope = {};
  if (req.permission?.scope !== 'all') {
    if (isStudent(req)) {
      const student = await studentOfActor(req);
      scope = { studentId: student._id };
    } else {
      const exams = await Exam.find(await examScopeFilter(req)).select('_id').lean();
      scope = { examId: { $in: exams.map((exam) => exam._id) } };
    }
  }

  const filter = both(
    clean({ examId: query.examId, studentId: query.studentId, status: query.status }),
    scope
  );
  const [rows, total] = await Promise.all([
    ExamForm.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipOf(query))
      .limit(query.limit)
      .select('examId studentId details status feeAmountPaise submittedAt decidedAt decisionNote')
      .lean(),
    ExamForm.countDocuments(filter),
  ]);
  return { rows, total, page: query.page, limit: query.limit };
}

async function selectSubjects(req, id, subjectIds) {
  const form = await loadForm(req, id);
  const updated = await form.selectSubjects(subjectIds);
  await auditSafe(req, {
    action: 'examFormSubjectsSelected',
    entityType: 'examForm',
    entityId: updated._id,
    details: { subjects: updated.subjects.length },
  });
  return { ...updated.toObject(), offered: await updated.offeredSubjects() };
}

async function continueForm(req, id) {
  const form = await loadForm(req, id);
  const updated = await form.continueToPayment();
  await auditSafe(req, {
    action: 'examFormContinued',
    entityType: 'examForm',
    entityId: updated._id,
    details: { status: updated.status, feeAmountPaise: updated.feeAmountPaise },
  });
  return updated;
}

async function decideForm(req, id, body) {
  const form = await loadForm(req, id);
  const updated = await ExamForm.decide(id, {
    approve: body.approve,
    note: body.note,
    decidedByUserId: getActor(req).id,
  });
  await auditSafe(req, {
    action: body.approve ? 'examFormApproved' : 'examFormRejected',
    entityType: 'examForm',
    entityId: updated._id,
    details: { note: body.note, previousStatus: form.status },
  });
  return updated;
}

export {
  createExam,
  listExams,
  getExam,
  updateExam,
  availableExams,
  startForm,
  getForm,
  listForms,
  selectSubjects,
  continueForm,
  decideForm,
};

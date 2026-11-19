import mongoose from 'mongoose';
import express from 'express';
import { readFileSync } from 'fs';
import Department from '../../src/models/Department.js';
import Program from '../../src/models/Program.js';
import AcademicYear from '../../src/models/AcademicYear.js';
import User from '../../src/models/User.js';
import Subject from '../../src/models/Subject.js';
import Student from '../../src/models/Student.js';
import Enrollment from '../../src/models/Enrollment.js';
import Timetable from '../../src/models/Timetable.js';
import Attendance from '../../src/models/Attendance.js';
import Marks from '../../src/models/Marks.js';
import Result from '../../src/models/Result.js';
import Exam from '../../src/models/Exam.js';
import ExamForm from '../../src/models/ExamForm.js';
import FeeStructure from '../../src/models/FeeStructure.js';
import TeachingPlan from '../../src/models/TeachingPlan.js';
import Teacher from '../../src/models/Teacher.js';
import AuditLog from '../../src/models/AuditLog.js';
import Permission from '../../src/models/Permission.js';
import { clearPermissionCache } from '../../src/services/permissionService.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { todayAtCollege, weekdayOf } from '../../src/utils/dates.js';
import timetableRoutes from '../../src/modules/academics/timetable.routes.js';
import attendanceRoutes from '../../src/modules/academics/attendance.routes.js';
import marksRoutes from '../../src/modules/academics/marks.routes.js';
import resultsRoutes from '../../src/modules/academics/results.routes.js';
import examRoutes from '../../src/modules/examinations/exam.routes.js';
import examFormRoutes from '../../src/modules/examinations/examForm.routes.js';
import managementRoutes from '../../src/modules/admin/super/management.routes.js';
import teachingRoutes from '../../src/modules/academics/teaching.routes.js';
import studentsRoutes from '../../src/modules/students/students.routes.js';

// Test ke liye chhota sa "college": 2 department, 1 class, 2 students, 2 teachers, 2 HOD, exam admin, super admin.
// Login abhi bana nahi hai, isliye appFor() har request par req.user khud laga deta hai (jaise login middleware lagayega).

const matrix = JSON.parse(readFileSync(new URL('../../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const MODELS = [Department, Program, AcademicYear, User, Subject, Student, Enrollment, Timetable, Attendance, Marks, Result, Exam, ExamForm, FeeStructure, Teacher, TeachingPlan, AuditLog, Permission];

/** Indexes (jaise unique slot) database me ban jaane do, phir permission matrix daalo. */
async function prepareDatabase() {
  await Promise.all(MODELS.map((m) => m.init()));
  await Permission.insertMany(matrix);
  clearPermissionCache();
}

/** Ek express app jisme sab academics routes hain aur har request par `user` login ki tarah laga hua hai. */
function appFor(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.user = { id: String(user.id || user._id), role: user.role, departmentId: user.departmentId ? String(user.departmentId) : null };
    next();
  });
  app.use('/timetable', timetableRoutes);
  app.use('/attendance', attendanceRoutes);
  app.use('/marks', marksRoutes);
  app.use('/results', resultsRoutes);
  app.use('/exams', examRoutes);
  app.use('/exam-forms', examFormRoutes);
  app.use('/admin', managementRoutes);
  app.use('/teaching-plans', teachingRoutes);
  app.use('/students', studentsRoutes);
  app.use(errorHandler);
  return app;
}

async function buildWorld() {
  const deptA = await Department.create({ code: 'CS', name: 'Computer Science' });
  const deptB = await Department.create({ code: 'COM', name: 'Commerce' });
  const progA = await Program.create({ name: 'F.Y.B.Sc. CS', code: 'FYCS', departmentId: deptA._id, level: 'Undergraduate' });
  const year = await AcademicYear.create({ label: '2026-27', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), status: 'current' });

  const mkUser = (role, key, departmentId = null) => User.create({
    fullName: `${key} Name`, email: `${key}@test.edu`, passwordHash: 'x'.repeat(60), role, departmentId, status: 'active',
  });
  const [teacher1, teacher2, hodA, hodB, stu1User, stu2User, examAdmin, superAdmin] = await Promise.all([
    mkUser('teacher', 'teacher1', deptA._id), mkUser('teacher', 'teacher2', deptA._id),
    mkUser('hod', 'hoda', deptA._id), mkUser('hod', 'hodb', deptB._id),
    mkUser('student', 'stu1'), mkUser('student', 'stu2'),
    mkUser('examAdmin', 'examadmin'), mkUser('superAdmin', 'superadmin'),
  ]);

  const subject1 = await Subject.create({ code: 'CS101', name: 'Programming', programId: progA._id, semester: 1, category: 'major' });
  const subject2 = await Subject.create({ code: 'CS102', name: 'Mathematics', programId: progA._id, semester: 1, category: 'major' });

  const mkStudent = (user, n) => Student.create({
    userId: user._id, applicationId: new mongoose.Types.ObjectId(), programId: progA._id, admissionYearId: year._id,
    enrollmentNumber: `EN00${n}`, currentSemester: 1, division: 'A',
  });
  const stu1 = await mkStudent(stu1User, 1);
  const stu2 = await mkStudent(stu2User, 2);
  for (const s of [stu1, stu2]) {
    for (const sub of [subject1, subject2]) await Enrollment.create({ studentId: s._id, subjectId: sub._id, semester: 1, academicYearId: year._id });
  }

  const today = todayAtCollege();
  const slot1 = await Timetable.addSlot({
    academicYearId: year._id, programId: progA._id, semester: 1, division: 'A', subjectId: subject1._id,
    teacherUserId: teacher1._id, dayOfWeek: weekdayOf(today), period: 1,
  });

  const exam = await Exam.create({ name: 'End Sem Nov 2026', academicYearId: year._id, programId: progA._id, semester: 1, formOpensAt: new Date('2026-10-01'), formClosesAt: new Date('2026-10-20'), status: 'open' });
  const examForm = await ExamForm.create({
    examId: exam._id, studentId: stu1._id, status: 'approved',
    details: { enrollmentNumber: 'EN001', fullName: 'stu1 Name', semester: 1 },
    subjects: [
      { subjectId: subject1._id, code: 'CS101', name: 'Programming', category: 'major' },
      { subjectId: subject2._id, code: 'CS102', name: 'Mathematics', category: 'major' },
    ],
  });

  return { deptA, deptB, progA, year, teacher1, teacher2, hodA, hodB, stu1User, stu2User, stu1, stu2, examAdmin, superAdmin, subject1, subject2, slot1, exam, examForm, today };
}

// "YYYY-MM-DD" me din jodna / ghatana (lecture date banane ke kaam aata hai).
function shiftDate(dateText, days) {
  return new Date(new Date(`${dateText}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
}

export { prepareDatabase, appFor, buildWorld, shiftDate };

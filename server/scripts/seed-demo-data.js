// Fills the DEV database with dummy data so everyone can work and test:
//   9 roles, 4 departments, the current academic year, one demo user per role
//   (except Super Admin, see below) and teacher profiles for the teachers and HODs.
//
// Run:  npm run seed      (or: node scripts/seed-demo-data.js)
//
// - Safe to run again: it only adds what is missing and never overwrites existing data.
// - Refuses to run when NODE_ENV=production.
// - Demo users all share ONE password. Set DEMO_PASSWORD in .env (12+ characters), or leave it
//   out and a random one is printed once at the end. There is no built-in default password.
// - The Super Admin is NOT created here. Use the separate first-Super-Admin setup command.
// - Permission rows are not seeded yet: they wait for the team's permission matrix.
import crypto from 'crypto';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import { ROLES, ROLE_LABELS, USER_STATUS, ACADEMIC_YEAR_STATUS, TEACHER_STATUS, DEPARTMENT_ROLES } from '../src/utils/constants.js';
import { hashPassword } from '../src/utils/password.js';
import Role from '../src/models/Role.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';
import User from '../src/models/User.js';
import Teacher from '../src/models/Teacher.js';

const ROLE_DESCRIPTIONS = {
  applicant: 'Person applying for admission',
  student: 'Admitted student',
  teacher: 'Teaching staff in one department',
  hod: 'Head of one department',
  websiteAdmin: 'Manages public website content',
  admissionAdmin: 'Manages admissions',
  examAdmin: 'Manages examinations and results',
  accountsAdmin: 'Manages fees, payments and refunds',
  superAdmin: 'Full access; manages accounts, departments and settings',
};

export const DEPARTMENTS = [
  { code: 'COM', name: 'Commerce' },
  { code: 'SCI', name: 'Science' },
  { code: 'ART', name: 'Arts' },
  { code: 'CSC', name: 'Computer Science' },
];

// email domain demo.example is reserved for examples and cannot be a real mailbox
export const DEMO_USERS = [
  { fullName: 'Demo Applicant', email: 'applicant@demo.example', role: ROLES.APPLICANT },
  { fullName: 'Demo Student', email: 'student@demo.example', role: ROLES.STUDENT },
  { fullName: 'Demo Teacher (Commerce)', email: 'teacher.com@demo.example', role: ROLES.TEACHER, dept: 'COM', employeeNumber: 'DEMO-T-001', designation: 'Assistant Professor' },
  { fullName: 'Demo Teacher (Science)', email: 'teacher.sci@demo.example', role: ROLES.TEACHER, dept: 'SCI', employeeNumber: 'DEMO-T-002', designation: 'Assistant Professor' },
  { fullName: 'Demo HOD (Commerce)', email: 'hod.com@demo.example', role: ROLES.HOD, dept: 'COM', employeeNumber: 'DEMO-H-001', designation: 'Head of Department' },
  { fullName: 'Demo Website Admin', email: 'website.admin@demo.example', role: ROLES.WEBSITE_ADMIN },
  { fullName: 'Demo Admission Admin', email: 'admission.admin@demo.example', role: ROLES.ADMISSION_ADMIN },
  { fullName: 'Demo Examination Admin', email: 'exam.admin@demo.example', role: ROLES.EXAM_ADMIN },
  { fullName: 'Demo Accounts Admin', email: 'accounts.admin@demo.example', role: ROLES.ACCOUNTS_ADMIN },
];

// The academic year runs June to May. From June onward, the year that starts this June is current.
export function currentAcademicYear(now = new Date()) {
  const startYear = now.getUTCMonth() >= 5 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return {
    label: `${startYear}-${String(startYear + 1).slice(-2)}`,
    startDate: new Date(Date.UTC(startYear, 5, 1)),
    endDate: new Date(Date.UTC(startYear + 1, 4, 31)),
    status: ACADEMIC_YEAR_STATUS.CURRENT,
  };
}

export function pickPassword() {
  const fromEnv = process.env.DEMO_PASSWORD;
  if (fromEnv) {
    if (fromEnv.length < 12) throw new Error('DEMO_PASSWORD must be at least 12 characters');
    return { password: fromEnv, generated: false };
  }
  return { password: crypto.randomBytes(12).toString('base64url'), generated: true };
}

export async function seed() {
  if (env.nodeEnv === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV=production');
  }
  const added = { roles: 0, departments: 0, academicYear: 0, users: 0, teacherProfiles: 0 };

  // 1. roles
  for (const key of Object.values(ROLES)) {
    const r = await Role.updateOne(
      { key },
      { $setOnInsert: { label: ROLE_LABELS[key], description: ROLE_DESCRIPTIONS[key] } },
      { upsert: true }
    );
    added.roles += r.upsertedCount;
  }

  // 2. departments
  const deptByCode = {};
  for (const d of DEPARTMENTS) {
    const r = await Department.updateOne({ code: d.code }, { $setOnInsert: { name: d.name, isActive: true } }, { upsert: true });
    added.departments += r.upsertedCount;
    deptByCode[d.code] = await Department.findOne({ code: d.code });
  }

  // 3. the current academic year (only one year can be current)
  const alreadyCurrent = await AcademicYear.findOne({ isCurrent: true });
  if (!alreadyCurrent) {
    await AcademicYear.create(currentAcademicYear());
    added.academicYear = 1;
  }

  // 4. demo users and teacher profiles
  const { password, generated } = pickPassword();
  const passwordHash = await hashPassword(password); // one hash, shared by all demo users
  for (const u of DEMO_USERS) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create({
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        role: u.role,
        departmentId: u.dept ? deptByCode[u.dept]._id : null,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      added.users += 1;
    }
    if (DEPARTMENT_ROLES.includes(u.role)) {
      if (!(await Teacher.findOne({ userId: user._id }))) {
        await Teacher.create({
          userId: user._id,
          employeeNumber: u.employeeNumber,
          departmentId: user.departmentId,
          designation: u.designation,
          status: TEACHER_STATUS.ACTIVE,
        });
        added.teacherProfiles += 1;
      }
      if (u.role === ROLES.HOD) {
        await Department.updateOne({ _id: user.departmentId, hodUserId: null }, { $set: { hodUserId: user._id } });
      }
    }
  }

  return { added, password: added.users > 0 ? { value: password, generated } : null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const { added, password } = await seed();
      console.log('Seed finished. Added this run:', JSON.stringify(added));
      if (password) {
        console.log(`\nDemo users (email ends with @demo.example) share this password: ${password.value}`);
        if (password.generated) console.log('It was generated for this run and is shown only now. Save it.');
      } else {
        console.log('No new users were created, so passwords are unchanged.');
      }
      console.log('Not created: Super Admin (use the first-Super-Admin setup command).');
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seed failed:', err.message); process.exit(1); });
}

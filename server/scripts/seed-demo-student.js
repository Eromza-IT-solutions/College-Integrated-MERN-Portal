// Creates a complete demo student record for the existing "Demo Student" user (student@demo.example).
//
// What it does:
//   1. Finds the demo student user, the F.Y.B.Com class (BDPCCA), and the current academic year.
//   2. Creates a fully-filled Application in the "admitted" status (bypasses the full workflow so
//      no fee payment or hard-copy step is needed just to demonstrate the portal).
//   3. Calls Student.createFromApplication so the user becomes a proper student account with an
//      enrollment number and semester-1 subject enrollments.
//   4. Uploads two placeholder AdmissionDocument records (photo and Aadhaar) so the Documents tab
//      is not empty on the Admission Admin dashboard.
//
// Prerequisites: npm run seed  then  npm run seed:programs  then  npm run seed:subjects
// Run:  node scripts/seed-demo-student.js
// Safe to run again: every step checks before inserting and skips what already exists.
// Refused in production.
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';

// The demo class whose subjects are already seeded by seed-sample-subjects.js.
const DEMO_PROGRAM_CODE = 'BDPCCA';

// A realistic but entirely fictional student profile for the demo.
const DEMO_PROFILE = {
  student: {
    surname: 'Sharma',
    firstName: 'Rahul',
    middleName: 'Anil',
    noMiddleName: false,
    nameCombination: 'Surname First Middle',
    fullName: 'Sharma Rahul Anil',
    gender: 'Male',
    address: {
      line1: '12, Patel Nagar',
      line2: 'Near City Hospital',
      country: 'India',
      pincode: '400001',
      state: 'Maharashtra',
      district: 'Mumbai',
      taluka: 'Mumbai City',
      location: 'Mumbai',
    },
    mobile: '9876543210',
    email: 'rahul.sharma.demo@demo.example',
    birthDate: new Date('2007-06-15'),
    birthPlace: 'Mumbai',
    birthPlaceCountry: 'India',
    nationality: 'Indian',
    motherTongue: 'Hindi',
    maritalStatus: 'Single',
    bloodGroup: 'B+',
    handicap: 'No',
    religion: 'HINDU',
    caste: 'Sharma',
    subCaste: '',
    casteCategory: 'OPEN',
    isMinority: 'No',
  },
  parent: {
    fatherFullName: 'Anil Kumar Sharma',
    motherFirstName: 'Sunita',
    sameAddressAsStudent: true,
    address: {
      line1: '12, Patel Nagar',
      line2: 'Near City Hospital',
      country: 'India',
      pincode: '400001',
      state: 'Maharashtra',
      district: 'Mumbai',
      taluka: 'Mumbai City',
      location: 'Mumbai',
    },
    fatherMobile: '9876543211',
    motherMobile: '9876543212',
    email: 'anil.sharma.demo@demo.example',
    isAlumni: false,
  },
  lastExam: {
    lastClass: 'XII',
    instituteName: 'Demo Junior College',
    boardName: 'Maharashtra State Board',
    eligibility: 'Same Institute/College',
    stateOfResidence: 'Maharashtra',
    qualifiedExam: 'HSC',
    passingMonth: 'Mar',
    passingYear: '2025',
    obtainedMarks: 480,
    outOfMarks: 600,
    percentage: 80,
    result: 'Distinction',
    attempt: '1st',
    seatNo: 'D2500001',
    tcLcNo: 'LC-2025-001',
    tcLcIssueDate: new Date('2025-06-01'),
    hasGap: false,
  },
  subjects: {
    mainGroup: 'Commerce',
    majorGroup: 'Financial Accounting',
    minorGroup: 'Business Mathematics',
  },
};

async function seedDemoStudent() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed demo data when NODE_ENV=production');

  await Promise.all([Student.init(), Enrollment.init(), Application.init(), AdmissionDocument.init()]);

  const user = await User.findOne({ email: 'student@demo.example' });
  if (!user) throw new Error('Demo student user not found. Run "npm run seed" first.');

  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) throw new Error('No current academic year. Run "npm run seed" first.');

  const program = await Program.findOne({ code: DEMO_PROGRAM_CODE });
  if (!program) throw new Error(`Program ${DEMO_PROGRAM_CODE} not found. Run "npm run seed:programs" first.`);

  const subjects = await Subject.find({ programId: program._id, semester: 1, code: /^SMP-/ }).sort({ code: 1 });
  if (!subjects.length) throw new Error('No sample subjects found. Run "npm run seed:subjects" first.');

  const added = { application: 0, documents: 0, student: 0, enrollments: 0 };

  // Step 1: application (skip if one already exists for this user, year and program)
  let application = await Application.findOne({
    applicantUserId: user._id,
    academicYearId: year._id,
    programId: program._id,
  });

  if (!application) {
    // Build the nep subject picks from the seeded sample subjects.
    // The sample subjects cover: major (x2), minor, aec, vec. Map them to their category.
    const nepPicks = {};
    for (const sub of subjects) {
      if (!nepPicks[sub.category]) nepPicks[sub.category] = [];
      nepPicks[sub.category].push(sub._id);
    }

    application = await Application.create({
      applicantUserId: user._id,
      academicYearId: year._id,
      programId: program._id,
      yearOfStudy: 1,
      admissionType: 'Provisional',
      divisionType: 'P.N.G.',
      feesCategory: 'PAYING',
      aadhaarNumber: '987654321012', // 12-digit sample; not a real Aadhaar
      ...DEMO_PROFILE,
      subjects: {
        ...DEMO_PROFILE.subjects,
        nep: nepPicks,
      },
      // Skip the full workflow: mark as admitted directly so createFromApplication works.
      status: 'admitted',
      applicationNumber: `APP-${year.label}-DEMO01`,
      submittedAt: new Date(),
      subjectsApprovedAt: new Date(),
      documentsApprovedAt: new Date(),
      approvedAt: new Date(),
      feePaidAt: new Date(),
      hardCopyReceivedAt: new Date(),
      admittedAt: new Date(),
    });
    added.application = 1;
  }

  // Step 2: placeholder documents (photo and Aadhaar so the documents tab is not empty)
  const DOC_SEEDS = [
    { type: 'photo', fileName: 'demo-student-photo.jpg', mimeType: 'image/jpeg', sizeBytes: 10240, storageKey: 'demo/student/photo.jpg', status: 'verified' },
    { type: 'aadhaar', fileName: 'demo-student-aadhaar.jpg', mimeType: 'image/jpeg', sizeBytes: 15360, storageKey: 'demo/student/aadhaar.jpg', status: 'verified' },
    { type: 'marksheet12', fileName: 'demo-student-hsc.jpg', mimeType: 'image/jpeg', sizeBytes: 20480, storageKey: 'demo/student/hsc-marksheet.jpg', status: 'verified' },
    { type: 'originalLc', fileName: 'demo-student-lc.jpg', mimeType: 'image/jpeg', sizeBytes: 12288, storageKey: 'demo/student/lc.jpg', status: 'pending' },
  ];
  for (const doc of DOC_SEEDS) {
    const r = await AdmissionDocument.updateOne(
      { applicationId: application._id, type: doc.type },
      { $setOnInsert: { fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, storageKey: doc.storageKey, status: doc.status } },
      { upsert: true }
    );
    added.documents += r.upsertedCount;
  }

  // Step 3: student profile + enrollments (skip if already a student)
  const existingStudent = await Student.findOne({ applicationId: application._id });
  if (!existingStudent) {
    const result = await Student.createFromApplication(application._id);
    added.student = 1;
    added.enrollments = result.enrolled;
    if (result.unmatched.length) {
      console.log(`  Note: ${result.unmatched.length} subject pick(s) could not be matched and were skipped.`);
    }
  } else {
    // Count existing enrollments so the summary is accurate.
    const count = await Enrollment.countDocuments({ studentId: existingStudent._id });
    added.enrollments = count; // already there
  }

  return added;
}

export { seedDemoStudent };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const r = await seedDemoStudent();
      console.log('Demo student seed finished. Added this run:');
      console.log(`  Application : ${r.application} (0 = already existed)`);
      console.log(`  Documents   : ${r.documents} placeholder(s)`);
      console.log(`  Student     : ${r.student} (0 = already existed)`);
      console.log(`  Enrollments : ${r.enrollments} subject(s)`);
      console.log('Login: student@demo.example  (shared demo password)');
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding demo student failed:', err.message); process.exit(1); });
}

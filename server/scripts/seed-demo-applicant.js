// Creates a realistic in-progress application for the existing "Demo Applicant" user (applicant@demo.example).
//
// What it does:
//   1. Finds the demo applicant user, the F.Y.B.Com class (BDPCCA), and the current academic year.
//   2. Creates a fully-filled Application in "submitted" status so the Admission Admin dashboard
//      has a real application to review (documents to verify, subjects and form to approve).
//   3. Adds four placeholder AdmissionDocument records (photo, Aadhaar, HSC marksheet, LC) with
//      a mix of statuses: verified, pending — so the Verify Documents page looks realistic.
//
// Prerequisites: npm run seed  then  npm run seed:programs  then  npm run seed:subjects
// Run:  node scripts/seed-demo-applicant.js
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
import Counter from '../src/models/Counter.js';

const DEMO_PROGRAM_CODE = 'BDPCCA';

// A second fictional profile, distinct from the demo student.
const DEMO_PROFILE = {
  student: {
    surname: 'Patil',
    firstName: 'Priya',
    middleName: 'Suresh',
    noMiddleName: false,
    nameCombination: 'Surname First Middle',
    fullName: 'Patil Priya Suresh',
    gender: 'Female',
    address: {
      line1: '7, Shivaji Road',
      line2: 'Andheri West',
      country: 'India',
      pincode: '400058',
      state: 'Maharashtra',
      district: 'Mumbai',
      taluka: 'Andheri',
      location: 'Mumbai',
    },
    mobile: '9123456789',
    email: 'priya.patil.demo@demo.example',
    birthDate: new Date('2007-09-20'),
    birthPlace: 'Pune',
    birthPlaceCountry: 'India',
    nationality: 'Indian',
    motherTongue: 'Marathi',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    handicap: 'No',
    religion: 'HINDU',
    caste: 'Patil',
    subCaste: '',
    casteCategory: 'OBC',
    isMinority: 'No',
  },
  parent: {
    fatherFullName: 'Suresh Dattatray Patil',
    motherFirstName: 'Meena',
    sameAddressAsStudent: true,
    address: {
      line1: '7, Shivaji Road',
      line2: 'Andheri West',
      country: 'India',
      pincode: '400058',
      state: 'Maharashtra',
      district: 'Mumbai',
      taluka: 'Andheri',
      location: 'Mumbai',
    },
    fatherMobile: '9123456780',
    motherMobile: '9123456781',
    email: 'suresh.patil.demo@demo.example',
    isAlumni: false,
  },
  lastExam: {
    lastClass: 'XII',
    instituteName: 'Demo Arts and Science Junior College',
    boardName: 'Maharashtra State Board',
    eligibility: 'Same Institute/College',
    stateOfResidence: 'Maharashtra',
    qualifiedExam: 'HSC',
    passingMonth: 'Mar',
    passingYear: '2025',
    obtainedMarks: 420,
    outOfMarks: 600,
    percentage: 70,
    result: 'I Class',
    attempt: '1st',
    seatNo: 'D2500042',
    tcLcNo: 'LC-2025-042',
    tcLcIssueDate: new Date('2025-06-05'),
    hasGap: false,
  },
  subjects: {
    mainGroup: 'Commerce',
    majorGroup: 'Financial Accounting',
    minorGroup: 'Business Mathematics',
  },
};

async function seedDemoApplicant() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed demo data when NODE_ENV=production');

  await Promise.all([Application.init(), AdmissionDocument.init()]);

  const user = await User.findOne({ email: 'applicant@demo.example' });
  if (!user) throw new Error('Demo applicant user not found. Run "npm run seed" first.');

  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) throw new Error('No current academic year. Run "npm run seed" first.');

  const program = await Program.findOne({ code: DEMO_PROGRAM_CODE });
  if (!program) throw new Error(`Program ${DEMO_PROGRAM_CODE} not found. Run "npm run seed:programs" first.`);

  const subjects = await Subject.find({ programId: program._id, semester: 1, code: /^SMP-/ }).sort({ code: 1 });
  if (!subjects.length) throw new Error('No sample subjects found. Run "npm run seed:subjects" first.');

  const added = { application: 0, documents: 0 };

  // Step 1: application (skip if one already exists for this user, year and program)
  let application = await Application.findOne({
    applicantUserId: user._id,
    academicYearId: year._id,
    programId: program._id,
  });

  if (!application) {
    // Build nep picks from the sample subjects.
    const nepPicks = {};
    for (const sub of subjects) {
      if (!nepPicks[sub.category]) nepPicks[sub.category] = [];
      nepPicks[sub.category].push(sub._id);
    }

    // Give it an application number (uses the same counter as real applications).
    const seq = await Counter.next(`application:${year.label}`);
    const applicationNumber = Counter.format({ prefix: 'APP', yearLabel: year.label, seq });

    application = await Application.create({
      applicantUserId: user._id,
      academicYearId: year._id,
      programId: program._id,
      yearOfStudy: 1,
      admissionType: 'Provisional',
      divisionType: 'P.N.G.',
      feesCategory: 'PAYING',
      aadhaarNumber: '123456789012', // 12-digit sample; not a real Aadhaar
      ...DEMO_PROFILE,
      subjects: {
        ...DEMO_PROFILE.subjects,
        nep: nepPicks,
      },
      // Status: submitted — sitting in the Admission Admin's inbox for review.
      status: 'submitted',
      applicationNumber,
      submittedAt: new Date(),
    });
    added.application = 1;
  }

  // Step 2: placeholder documents with a realistic mix of review statuses.
  // OBC applicant needs: photo, aadhaar, marksheet12, originalLc + reserved-category docs.
  // We seed the most visible four; the rest stay missing so the "missing required" list works.
  const DOC_SEEDS = [
    { type: 'photo',        fileName: 'applicant-photo.jpg',    mimeType: 'image/jpeg', sizeBytes: 10240, storageKey: 'demo/applicant/photo.jpg',    status: 'verified' },
    { type: 'aadhaar',      fileName: 'applicant-aadhaar.jpg',  mimeType: 'image/jpeg', sizeBytes: 15360, storageKey: 'demo/applicant/aadhaar.jpg',  status: 'verified' },
    { type: 'marksheet12',  fileName: 'applicant-hsc.jpg',      mimeType: 'image/jpeg', sizeBytes: 20480, storageKey: 'demo/applicant/hsc.jpg',      status: 'pending' },
    { type: 'originalLc',   fileName: 'applicant-lc.jpg',       mimeType: 'image/jpeg', sizeBytes: 12288, storageKey: 'demo/applicant/lc.jpg',       status: 'pending' },
  ];

  for (const doc of DOC_SEEDS) {
    const r = await AdmissionDocument.updateOne(
      { applicationId: application._id, type: doc.type },
      { $setOnInsert: { fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, storageKey: doc.storageKey, status: doc.status } },
      { upsert: true }
    );
    added.documents += r.upsertedCount;
  }

  return { applicationNumber: application.applicationNumber, ...added };
}

export { seedDemoApplicant };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const r = await seedDemoApplicant();
      console.log('Demo applicant seed finished. Added this run:');
      console.log(`  Application : ${r.application} (application number: ${r.applicationNumber})  (0 = already existed)`);
      console.log(`  Documents   : ${r.documents} placeholder(s)  (0 = already existed)`);
      console.log('Login: applicant@demo.example  (shared demo password)');
      console.log('Status: submitted — ready for the Admission Admin to review.');
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding demo applicant failed:', err.message); process.exit(1); });
}

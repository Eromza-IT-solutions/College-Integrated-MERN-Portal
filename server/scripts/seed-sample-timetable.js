import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import Timetable from '../src/models/Timetable.js';
import AcademicYear from '../src/models/AcademicYear.js';

// Adds a SAMPLE weekly timetable: the demo Commerce teacher takes the five semester-1 subjects of F.Y.B.Com (division A),
// Monday to Friday, period 1. Demo students are admitted into division A by default.
// Run the earlier seeds first:  npm run seed   then   npm run seed:fees   then   npm run seed:subjects
// Run:  npm run seed:timetable      (or: node scripts/seed-sample-timetable.js)
// Safe to run again: it only adds what is missing.
async function seedTimetable() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to add a sample timetable when NODE_ENV=production');
  const year = await AcademicYear.findOne({ isCurrent: true });
  const program = await Program.findOne({ code: 'FYBCOM' });
  const teacher = await User.findOne({ email: 'teacher.com@demo.example' });
  if (!year || !program || !teacher) throw new Error('Run "npm run seed", "npm run seed:fees" and "npm run seed:subjects" first.');
  const subjects = await Subject.find({ programId: program._id, semester: 1, code: /^SMP-/ }).sort({ code: 1 });
  if (!subjects.length) throw new Error('No sample subjects found. Run "npm run seed:subjects" first.');
  let added = 0;
  for (const [i, subject] of subjects.slice(0, 5).entries()) {
    const r = await Timetable.updateOne(
      { academicYearId: year._id, programId: program._id, semester: 1, division: 'A', dayOfWeek: i + 1, period: 1 },
      { $setOnInsert: { departmentId: program.departmentId, subjectId: subject._id, teacherUserId: teacher._id, startTime: '09:00', endTime: '10:00', room: 'SAMPLE-101', isActive: true } },
      { upsert: true }
    );
    added += r.upsertedCount;
  }
  return { slots: added };
}

export { seedTimetable };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const added = await seedTimetable();
      console.log(`Sample timetable finished. Added this run: ${JSON.stringify(added)}`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error("Seeding timetable failed:", err.message); process.exit(1); });
}


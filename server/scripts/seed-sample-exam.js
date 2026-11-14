import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import Exam from '../src/models/Exam.js';
import AcademicYear from '../src/models/AcademicYear.js';

// Adds one SAMPLE exam (semester 1, form open for 30 days from now) for each of the three sample classes.
// Run the earlier seeds first:  npm run seed   then   npm run seed:fees   then   npm run seed:subjects
// Run:  npm run seed:exam      (or: node scripts/seed-sample-exam.js)
// Safe to run again: it only adds what is missing. To open the form again after it closed, change the dates in Atlas.
const PROGRAM_CODES = ['FYBCOM', 'FYBSC-CA', 'FYBA'];

async function seedExams() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to add sample exams when NODE_ENV=production');
  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) throw new Error('No current academic year. Run "npm run seed" first.');
  const now = new Date();
  const closes = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let added = 0;
  for (const code of PROGRAM_CODES) {
    const program = await Program.findOne({ code });
    if (!program) throw new Error(`Class ${code} not found. Run "npm run seed:fees" first.`);
    const r = await Exam.updateOne(
      { academicYearId: year._id, programId: program._id, semester: 1, name: 'SAMPLE End Semester Exam' },
      { $setOnInsert: { formOpensAt: now, formClosesAt: closes, status: 'open' } },
      { upsert: true }
    );
    added += r.upsertedCount;
  }
  return { exams: added };
}

export { seedExams };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const added = await seedExams();
      console.log(`Sample exams finished. Added this run: ${JSON.stringify(added)}`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error("Seeding exams failed:", err.message); process.exit(1); });
}


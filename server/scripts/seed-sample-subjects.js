import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';

// Adds SAMPLE subjects (semesters 1 and 2) for the three sample classes, so the exam flow can be tried.
// All names are made up for the demo; codes start with SMP-. Replace them with the college's real subject list.
// Run the demo seed and the sample fees first:  npm run seed   then   npm run seed:fees
// Run:  npm run seed:subjects      (or: node scripts/seed-sample-subjects.js)
// Safe to run again: it only adds what is missing.
const SUBJECTS = {
  FYBCOM: {
    1: [['major', 'Financial Accounting'], ['major', 'Business Economics'], ['minor', 'Business Mathematics'], ['aec', 'English Communication'], ['vec', 'Environmental Studies']],
    2: [['major', 'Corporate Accounting'], ['major', 'Business Law'], ['minor', 'Business Statistics'], ['sec', 'Computer Skills'], ['iks', 'Indian Knowledge Systems']],
  },
  'FYBSC-CA': {
    1: [['major', 'Programming in C'], ['major', 'Digital Electronics'], ['minor', 'Discrete Mathematics'], ['aec', 'English Communication'], ['vec', 'Environmental Studies']],
    2: [['major', 'Data Structures'], ['major', 'Database Basics'], ['minor', 'Statistics'], ['sec', 'Web Design'], ['iks', 'Indian Knowledge Systems']],
  },
  FYBA: {
    1: [['major', 'Introduction to Political Science'], ['major', 'Principles of Sociology'], ['minor', 'Basic Economics'], ['aec', 'English Communication'], ['vec', 'Environmental Studies']],
    2: [['major', 'Indian Constitution'], ['major', 'Social Research Basics'], ['minor', 'History of India'], ['sec', 'Public Speaking'], ['iks', 'Indian Knowledge Systems']],
  },
};

async function seedSubjects() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to add sample subjects when NODE_ENV=production');
  let added = 0;
  for (const [programCode, semesters] of Object.entries(SUBJECTS)) {
    const program = await Program.findOne({ code: programCode });
    if (!program) throw new Error(`Class ${programCode} not found. Run "npm run seed:fees" first.`);
    const ops = [];
    for (const [semester, rows] of Object.entries(semesters)) {
      rows.forEach(([category, name], i) => {
        const code = `SMP-${programCode}-S${semester}-${String(i + 1).padStart(2, '0')}`;
        ops.push({
          updateOne: {
            filter: { programId: program._id, semester: Number(semester), code },
            update: { $setOnInsert: { name, category, credits: 2, isActive: true } },
            upsert: true,
          },
        });
      });
    }
    added += (await Subject.bulkWrite(ops)).upsertedCount;
  }
  return { subjects: added };
}

export { seedSubjects };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const added = await seedSubjects();
      console.log(`Sample subjects finished. Added this run: ${JSON.stringify(added)}`);
      console.log("These are SAMPLE subjects. Replace them with the college subject list when you have it.");
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error("Seeding subjects failed:", err.message); process.exit(1); });
}


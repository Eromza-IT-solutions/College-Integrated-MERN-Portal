import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import Subject from '../src/models/Subject.js';
import { GRADING, SUBJECT_CATEGORIES } from '../src/utils/constants.js';

const data = JSON.parse(readFileSync(new URL('./data/college-subjects.json', import.meta.url), 'utf8'));

// Loads the real subject catalog parsed from the 79 syllabus markdown files.
// The same subject can belong to several classes, so every class gets its own Subject row.
// Sample SMP-* subjects from seed-sample-subjects.js are removed.
// Run the demo seed and the programs first:  npm run seed   then   npm run seed:programs
// Run:  npm run seed:subjects      (or: node scripts/seed-college-subjects.js)
// Safe to run again: it updates names/credits/categories and only inserts missing subjects.
async function seedSubjects() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to load subject data when NODE_ENV=production without a review');

  const programs = await Program.find({}).select('code');
  if (!programs.length) throw new Error('No programs found. Run "npm run seed:programs" first.');
  const byCode = new Map(programs.map((p) => [p.code, p._id]));

  const subjects = data.subjects || [];
  if (!subjects.length) throw new Error('No subjects in scripts/data/college-subjects.json');

  const missingPrograms = [...new Set(subjects.map((s) => s.programCode))].filter((code) => !byCode.has(code));
  if (missingPrograms.length) throw new Error(`Subjects use unknown program codes: ${missingPrograms.join(', ')}`);

  const badCategories = [...new Set(subjects.map((s) => s.category))].filter((category) => !SUBJECT_CATEGORIES.includes(category));
  if (badCategories.length) throw new Error(`Subjects use unknown categories: ${badCategories.join(', ')}`);

  const seen = new Set();
  const duplicates = [];
  for (const s of subjects) {
    const key = `${s.programCode}|${s.semester}|${s.code}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  if (duplicates.length) throw new Error(`Duplicate subject keys: ${duplicates.slice(0, 10).join(', ')}`);

  const ops = subjects.map((s) => ({
    updateOne: {
      filter: { programId: byCode.get(s.programCode), semester: Number(s.semester), code: String(s.code).toUpperCase() },
      update: {
        $set: {
          name: s.name,
          category: s.category,
          credits: Number(s.credits) || GRADING.defaultCredits,
          isActive: true,
        },
        $setOnInsert: {
          maxInternal: GRADING.defaultMaxInternal,
          maxExternal: GRADING.defaultMaxExternal,
          countsForCgpa: true,
        },
      },
      upsert: true,
    },
  }));
  const result = await Subject.bulkWrite(ops);
  const removedSamples = await Subject.deleteMany({ code: /^SMP-/ });

  const used = new Set(subjects.map((s) => s.programCode));
  const withoutSubjects = programs.filter((p) => !used.has(p.code)).map((p) => p.code);

  return {
    rows: subjects.length,
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    removedSamples: removedSamples.deletedCount,
    programsWithSubjects: used.size,
    programsWithoutSubjects: withoutSubjects,
  };
}

export { seedSubjects };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const r = await seedSubjects();
      console.log(`Subjects finished. ${r.rows} rows, inserted ${r.inserted}, updated ${r.updated}, removed ${r.removedSamples} sample subjects.`);
      console.log(`Programs with subjects: ${r.programsWithSubjects}. Without syllabus subjects (${r.programsWithoutSubjects.length}): ${r.programsWithoutSubjects.join(', ')}`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding subjects failed:', err.message); process.exit(1); });
}

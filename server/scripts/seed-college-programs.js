import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import Department from '../src/models/Department.js';
const catalog = JSON.parse(readFileSync(new URL('./data/college-programs.json', import.meta.url), 'utf8'));
import { PROGRAM_YEARS } from '../src/utils/constants.js';

// Adds the college's 60 programs (from "Programs offered under autonomy (NEP)" and the diploma/certificate list).
// The department of each program is PROPOSED: Arts -> ART, Science -> SCI, Commerce -> COM, computer and multimedia -> CSC.
// Run the demo seed first:  npm run seed
// Run:  npm run seed:programs      (or: node scripts/seed-college-programs.js)
// Safe to run again: it only adds what is missing and never changes a program that exists.
async function seedPrograms() {
  const depts = Object.fromEntries((await Department.find({})).map((d) => [d.code, d]));
  const missing = [...new Set(catalog.programs.map((p) => p.departmentCode))].filter((c) => !depts[c]);
  if (missing.length) throw new Error(`Departments not found: ${missing.join(', ')}. Run "npm run seed" first.`);
  const ops = catalog.programs.map((p) => ({
    updateOne: {
      filter: { code: p.code },
      update: { $setOnInsert: { name: p.name, faculty: p.faculty, level: p.level, departmentId: depts[p.departmentCode]._id, isActive: true } },
      upsert: true,
    },
  }));
  const r = await Program.bulkWrite(ops);
  // durationYears is set from the level by the model on save; bulk upserts skip it, so fill it in here.
  for (const [level, years] of Object.entries(PROGRAM_YEARS)) {
    await Program.updateMany({ level, durationYears: { $exists: false } }, { $set: { durationYears: years } });
  }
  return { programs: r.upsertedCount, total: catalog.programs.length };
}

export { seedPrograms };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const added = await seedPrograms();
      console.log(`Programs finished. Added this run: ${added.programs} of ${added.total}`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding programs failed:', err.message); process.exit(1); });
}

import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import FeeStructure from '../src/models/FeeStructure.js';
import AcademicYear from '../src/models/AcademicYear.js';
const data = JSON.parse(readFileSync(new URL('./data/college-fees-2026-27.json', import.meta.url), 'utf8'));
import { checkData, buildRows, toPaise } from '../src/utils/feeSheets.js';

// Loads the college admission fee sheets for A.Y. 2026-27 (UG P.N.G., UG Grantable, UG Professional, PG, Ph.D.).
// Each sheet column becomes fee rows for the programs it applies to ("programCodes" in scripts/data/college-fees-2026-27.json),
// for the PAYING fees category. The sheets give no amounts for other fees categories (OTHER STATE, N.R.I. ...), so none are created.
// Every class total printed on the sheet is checked against the sum of its lines before anything is saved.
// It also adds a flat SAMPLE exam fee (Rs 800) for each class, because the college has not given exam fees yet.
// Run the demo seed and the programs first:  npm run seed   then   npm run seed:programs
// Run:  npm run seed:fees      (or: node scripts/seed-college-fees.js)
// Safe to run again: it only adds what is missing.
const SAMPLE_EXAM_RUPEES = 800;
async function seedFees() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to load fee sheets when NODE_ENV=production without a review');
  const problems = checkData();
  if (problems.length) throw new Error(`The fee data does not add up:\n${problems.join('\n')}`);
  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) throw new Error('No current academic year. Run "npm run seed" first.');
  const programs = await Program.find({});
  if (!programs.length) throw new Error('No programs found. Run "npm run seed:programs" first.');
  // The unique index changed (year of study and division were added). Replace the old one before adding rows.
  await FeeStructure.syncIndexes();

  const byCode = Object.fromEntries(programs.map((p) => [p.code, p._id]));
  const { rows, skipped } = buildRows(byCode, year._id);
  const ops = rows.map((r) => {
    const { purpose, academicYearId, programId, yearOfStudy, divisionType, feesCategory, ...rest } = r; // the filter fields are set by the upsert itself
    return {
      updateOne: {
        filter: { purpose, academicYearId, programId, yearOfStudy, divisionType, feesCategory },
        update: { $setOnInsert: rest },
        upsert: true,
      },
    };
  });
  const admission = ops.length ? (await FeeStructure.bulkWrite(ops)).upsertedCount : 0;

  // SAMPLE exam fee for every class that has an admission fee (P.N.G. only).
  const seen = new Set();
  const examOps = [];
  for (const r of rows.filter((x) => x.divisionType === 'P.N.G.')) {
    const k = `${r.programId}:${r.yearOfStudy}`;
    if (seen.has(k)) continue;
    seen.add(k);
    examOps.push({
      updateOne: {
        filter: { purpose: 'exam', academicYearId: year._id, programId: r.programId, yearOfStudy: r.yearOfStudy, divisionType: 'P.N.G.', feesCategory: 'PAYING' },
        update: { $setOnInsert: { amountPaise: toPaise(SAMPLE_EXAM_RUPEES), label: 'SAMPLE', isActive: true } },
        upsert: true,
      },
    });
  }
  const exam = examOps.length ? (await FeeStructure.bulkWrite(examOps)).upsertedCount : 0;
  const unconfirmed = data.groups.filter((g) => !g.confirmed).map((g) => `${g.code}${g.note ? ` (${g.note})` : ''}`);
  const noProgram = programs.filter((p) => !rows.some((r) => String(r.programId) === String(p._id))).map((p) => p.code);
  return { admissionFees: admission, sampleExamFees: exam, skipped, unconfirmed, programsWithoutFees: noProgram };
}

export { seedFees };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const r = await seedFees();
      console.log(`Fees finished. Added this run: ${r.admissionFees} admission fee rows and ${r.sampleExamFees} SAMPLE exam fee rows`);
      if (r.skipped.length) console.log(`Skipped:\n  ${r.skipped.join('\n  ')}`);
      if (r.unconfirmed.length) console.log(`Program mapping to confirm with the college:\n  ${r.unconfirmed.join('\n  ')}`);
      console.log(`Programs with no fee sheet yet (${r.programsWithoutFees.length}): ${r.programsWithoutFees.join(', ')}`);
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Seeding fees failed:', err.message); process.exit(1); });
}

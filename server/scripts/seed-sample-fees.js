import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import Program from '../src/models/Program.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Department from '../src/models/Department.js';
import AcademicYear from '../src/models/AcademicYear.js';

// Adds SAMPLE classes and fees to the DEV database so payments can be tried.
// All amounts are made-up demo numbers (label "SAMPLE"); replace them when the college gives the real fee list.
// Run the demo seed first:  npm run seed
// Run:  npm run seed:fees      (or: node scripts/seed-sample-fees.js)
// Safe to run again: it only adds what is missing.
const PROGRAMS = [
  { code: 'FYBCOM', name: 'F.Y.B.Com', dept: 'COM', admissionRupees: 12000 },
  { code: 'FYBSC-CA', name: 'F.Y.B.Sc.(Computer Application)', dept: 'CSC', admissionRupees: 15000 },
  { code: 'FYBA', name: 'F.Y.B.A.', dept: 'ART', admissionRupees: 10000 },
];
// Sample multipliers of the PAYING fee, in percent.
const CATEGORY_PERCENT = { PAYING: 100, 'OTHER STATE': 110, 'N.R.I.': 300, SAARC: 200, FOREIGNER: 350, 'PM J&K SCH.': 0 };
const EXAM_RUPEES = 800;

async function seedFees() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to add sample fees when NODE_ENV=production');
  const year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) throw new Error('No current academic year. Run "npm run seed" first.');
  const added = { programs: 0, fees: 0 };

  for (const p of PROGRAMS) {
    const dept = await Department.findOne({ code: p.dept });
    if (!dept) throw new Error(`Department ${p.dept} not found. Run "npm run seed" first.`);
    const r = await Program.updateOne({ code: p.code }, { $setOnInsert: { name: p.name, departmentId: dept._id, isActive: true } }, { upsert: true });
    added.programs += r.upsertedCount;
    const program = await Program.findOne({ code: p.code });

    const ops = [];
    for (const [feesCategory, percent] of Object.entries(CATEGORY_PERCENT)) {
      const rows = [
        { purpose: 'admission', amountPaise: Math.round((p.admissionRupees * 100 * percent) / 100) },
        { purpose: 'exam', amountPaise: EXAM_RUPEES * 100 },
      ];
      for (const row of rows) {
        ops.push({
          updateOne: {
            filter: { purpose: row.purpose, academicYearId: year._id, programId: program._id, feesCategory },
            update: { $setOnInsert: { amountPaise: row.amountPaise, label: 'SAMPLE', isActive: true } },
            upsert: true,
          },
        });
      }
    }
    added.fees += (await FeeStructure.bulkWrite(ops)).upsertedCount;
  }
  return added;
}

export { seedFees };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const added = await seedFees();
      console.log(`Sample fees finished. Added this run: ${JSON.stringify(added)}`);
      console.log("These are SAMPLE amounts. Replace them with the college fee list when you have it.");
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error("Seeding fees failed:", err.message); process.exit(1); });
}


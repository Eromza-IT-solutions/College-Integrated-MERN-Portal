import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import { runAdmissionDeadlineJob } from '../src/jobs/admissionDeadlines.js';

async function main() {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  try {
    const result = await runAdmissionDeadlineJob();
    console.log(`Admission deadlines: cancelled ${result.cancelled} unpaid application(s); ${result.overdueHardCopies} hard copy deadline(s) passed.`);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((err) => {
  console.error('Admission deadline job failed:', err.message);
  process.exit(1);
});

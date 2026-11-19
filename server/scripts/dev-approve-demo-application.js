// DEV ONLY - for testing the Payments screen from the browser.
// Moves the Demo Applicant's application to "approved" with a fee, so the "Pay now" button shows up.
// (In real use the Admission Admin approves the application after verifying documents.)
//
// Prerequisites: npm run seed, seed:programs, seed:subjects, seed:fees, node scripts/seed-demo-applicant.js
// Run:  node scripts/dev-approve-demo-application.js
// Safe to run again. Refused in production.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import User from '../src/models/User.js';
import Application from '../src/models/Application.js';
import FeeStructure from '../src/models/FeeStructure.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to run when NODE_ENV=production');

await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
try {
  const user = await User.findOne({ email: 'applicant@demo.example' });
  if (!user) throw new Error('Demo applicant not found. Run: npm run seed');
  const app = await Application.findOne({ applicantUserId: user._id }).sort({ createdAt: -1 });
  if (!app) throw new Error('No application found. Run: node scripts/seed-demo-applicant.js');
  const fee = await FeeStructure.findOne().sort({ createdAt: 1 });
  if (!fee) throw new Error('No fee structure found. Run: npm run seed:fees');

  if (['feePaid', 'admitted'].includes(app.status)) {
    console.log(`Application ${app.applicationNumber} is already ${app.status}; nothing to do.`);
  } else {
    await Application.collection.updateOne(
      { _id: app._id },
      { $set: { status: 'approved', approvedAt: new Date(), feeStructureId: fee._id, feeAmountPaise: fee.amountPaise, feeDueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) } },
    );
    console.log(`Application ${app.applicationNumber} is now approved. Fee: Rs ${fee.amountPaise / 100}`);
  }
} finally {
  await mongoose.connection.close();
}

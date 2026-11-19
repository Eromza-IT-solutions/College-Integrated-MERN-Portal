import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import '../src/models/index.js';
import { runPaymentReconciliationJob } from '../src/jobs/paymentReconciliation.js';

async function main() {
  await connectDatabase();
  try {
    const result = await runPaymentReconciliationJob();
    console.log('Payment reconciliation:', result);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error('Payment reconciliation failed:', err.message);
  process.exit(1);
});

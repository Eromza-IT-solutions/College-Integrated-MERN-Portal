// Real-database check: 100 simultaneous requests must give 100 different numbers.
// Run on the DEV database only:  node scripts/check-counter.js
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Counter from '../src/models/Counter.js';

const KEY = `check:${Date.now()}`; // a throw-away key, removed at the end
const N = 100;

try {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const numbers = await Promise.all(Array.from({ length: N }, () => Counter.next(KEY)));
  const unique = new Set(numbers);
  const sorted = [...numbers].sort((a, b) => a - b);
  const ok = unique.size === N && sorted[0] === 1 && sorted[N - 1] === N;
  console.log(ok ? `PASS: ${N} requests gave ${unique.size} different numbers (1..${N})`
                 : `FAIL: ${unique.size} different numbers out of ${N}`);
  process.exitCode = ok ? 0 : 1;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await Counter.deleteOne({ _id: KEY }).catch(() => {});
  await mongoose.connection.close();
}

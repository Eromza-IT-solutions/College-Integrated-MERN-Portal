import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';

// Explicit deploy-time index synchronisation. The connection uses autoIndex: false so indexes are
// created only by this step, never as a side effect of a request or a background job.
if (process.env.SYNC_INDEXES_CONFIRMED !== 'yes') {
  throw new Error('Set SYNC_INDEXES_CONFIRMED=yes before synchronising indexes');
}

await mongoose.connect(env.mongodbUri, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
try {
  for (const name of mongoose.modelNames()) {
    const model = mongoose.model(name);
    const indexes = await model.syncIndexes();
    console.log(`${name}: ${indexes.length} index definition(s) synchronised`);
  }
} finally {
  await mongoose.connection.close();
}
